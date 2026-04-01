import os
import json
import asyncio
import re
from typing import AsyncGenerator, Optional, Dict, List
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from dotenv import load_dotenv

from prompts.templates import MAIN_CHAT_PROMPT, TITLE_PROMPT

load_dotenv()


class SimpleChatMessageHistory:
    """Simple chat message history that matches langchain's BaseChatMessageHistory interface"""

    def __init__(self):
        self.messages: List[BaseMessage] = []

    def add_user_message(self, message: str):
        self.messages.append(HumanMessage(content=message))

    def add_ai_message(self, message: str):
        self.messages.append(AIMessage(content=message))

    def clear(self):
        self.messages = []


class SimpleConversationBufferMemory:
    """
    Simple conversation buffer memory that matches langchain's memory interface.
    Used to work with LangChain's MessagesPlaceholder in prompts.
    """

    def __init__(self, memory_key: str = "chat_history", return_messages: bool = True, k: int = 10):
        self.memory_key = memory_key
        self.return_messages = return_messages
        self.k = k
        self.chat_memory = SimpleChatMessageHistory()

    def load_memory_variables(self, inputs: Optional[Dict] = None) -> Dict:
        """Load memory variables for prompt formatting"""
        if self.return_messages:
            return {self.memory_key: self.chat_memory.messages}
        return {}


class LLMService:
    def __init__(self):
        self.llm = ChatOpenAI(
            base_url=os.getenv("MINIMAX_BASE_URL", "https://api.minimaxi.com/v1"),
            model=os.getenv("MINIMAX_MODEL", "MiniMax-M2.7-highspeed"),
            api_key=os.getenv("MINIMAX_API_KEY", ""),
            streaming=True,
        )

        # JSON output parser
        self.json_parser = JsonOutputParser()

        # Memory storage per conversation
        self._memory_store: Dict[str, SimpleConversationBufferMemory] = {}

    def _get_memory(self, conversation_id: str) -> SimpleConversationBufferMemory:
        """Get or create memory for a conversation"""
        if conversation_id not in self._memory_store:
            self._memory_store[conversation_id] = SimpleConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                k=10
            )
        return self._memory_store[conversation_id]

    def _load_history_to_memory(
        self, conversation_id: str, conversation_history: list
    ):
        """Load conversation history from database into memory"""
        memory = self._get_memory(conversation_id)
        memory.chat_memory.clear()
        for msg in conversation_history[-20:]:
            if msg["role"] == "user":
                memory.chat_memory.add_user_message(msg["content"])
            elif msg["role"] == "assistant":
                memory.chat_memory.add_ai_message(msg["content"])

    async def chat_stream(
        self,
        conversation_id: str,
        topic_id: str,
        topic_title: str,
        topic_description: str,
        user_message: str,
        conversation_history: list,
        conversation_state: dict,
    ) -> AsyncGenerator[dict, None]:
        """Stream chat responses with structured output parsing"""

        # Load history into memory
        self._load_history_to_memory(conversation_id, conversation_history)
        memory = self._get_memory(conversation_id)

        # Get formatted history for prompt
        chat_history = memory.chat_memory.messages
        formatted_history = []
        for msg in chat_history:
            if isinstance(msg, HumanMessage):
                formatted_history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                formatted_history.append({"role": "assistant", "content": msg.content})

        # Build prompt
        turn_count = conversation_state.get("turn_count", 0)
        topic_chain = conversation_state.get("topic_chain", [])
        divergence_score = conversation_state.get("divergence_score", 0)
        last_intervention = conversation_state.get("last_intervention", "none")

        prompt = MAIN_CHAT_PROMPT.invoke({
            "chat_history": formatted_history,
            "user_message": user_message,
            "topic_title": topic_title,
            "topic_description": topic_description or "无",
            "turn_count": turn_count,
            "topic_chain": " -> ".join(topic_chain[-5:]) if topic_chain else "无",
            "divergence_score": divergence_score,
            "last_intervention": last_intervention,
        })

        messages = prompt.to_messages()

        # Accumulator for JSON parsing
        accumulated = ""

        # Regex patterns
        think_start = re.compile(r'<think>')
        think_end = re.compile(r'</think>')
        in_thinking = False

        try:
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    text = chunk.content

                    # Phase 2: Separate reasoning content from final answer
                    if not in_thinking:
                        start_match = think_start.search(text)
                        if start_match:
                            # Content before <think> - buffer it
                            before = text[:start_match.start()]
                            if before:
                                accumulated += before

                            # Start thinking block
                            in_thinking = True
                            think_text = text[start_match.end():]
                            end_match = think_end.search(think_text)
                            if end_match:
                                # <think> and </think> are in the same chunk
                                in_thinking = False
                                thinking_content = think_text[:end_match.start()]
                                if thinking_content:
                                    yield {"event": "reasoning", "data": {"text": thinking_content}}
                                # Content after </think> - buffer for JSON parsing
                                accumulated += think_text[end_match.end():]
                            else:
                                # Only <think> in this chunk
                                if think_text:
                                    yield {"event": "reasoning", "data": {"text": think_text}}
                        else:
                            # No thinking markers - buffer as text
                            accumulated += text
                    else:
                        # We're inside <think> block
                        end_match = think_end.search(text)
                        if end_match:
                            # Thinking ends in this chunk
                            in_thinking = False
                            thinking_content = text[:end_match.start()]
                            if thinking_content:
                                yield {"event": "reasoning", "data": {"text": thinking_content}}
                            # Content after </think> - buffer for JSON parsing
                            accumulated += text[end_match.end():]
                        else:
                            # Still inside <think> - send as reasoning
                            yield {"event": "reasoning", "data": {"text": text}}

        except Exception as e:
            yield {"event": "error", "data": {"message": str(e)}}
            return

        # Parse JSON response and extract answer
        try:
            clean_response = accumulated.strip()

            # Extract JSON object
            first_brace = clean_response.find('{')
            last_brace = clean_response.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                json_str = clean_response[first_brace:last_brace+1]
            elif "```json" in clean_response:
                json_str = clean_response.split("```json")[1].split("```")[0]
            elif "```" in clean_response:
                json_str = clean_response.split("```")[1].split("```")[0]
            else:
                raise ValueError("No JSON found in response")

            # Use LangChain JsonOutputParser
            response = self.json_parser.parse(json_str.strip())

            # Stream the answer content
            answer_text = response.get("answer", "")
            if answer_text:
                yield {"event": "content", "data": {"text": answer_text}}

            # Update memory with new exchange
            memory.chat_memory.add_user_message(user_message)
            memory.chat_memory.add_ai_message(answer_text)

            # Yield knowledge_extraction for graph update
            knowledge_extraction = response.get("knowledge_extraction", {})
            if knowledge_extraction.get("new_nodes") or knowledge_extraction.get("nodes_to_update"):
                yield {
                    "event": "knowledge_extraction",
                    "data": knowledge_extraction,
                }

            # Yield node_hint
            new_nodes = knowledge_extraction.get("new_nodes", [])
            updated_nodes = knowledge_extraction.get("nodes_to_update", [])
            if new_nodes or updated_nodes:
                yield {
                    "event": "node_hint",
                    "data": {
                        "new_nodes": new_nodes,
                        "updated_nodes": updated_nodes,
                    },
                }

            # Yield intervention
            intervention = response.get("intervention", {})
            if intervention.get("should_intervene"):
                yield {
                    "event": "intervention",
                    "data": {
                        "type": intervention.get("type", "none"),
                        "content": intervention.get("content", {}),
                    },
                }

            # Yield observation
            yield {"event": "observation", "data": response.get("observation", {})}

        except Exception as e:
            # JSON parse failed - log and fallback
            import logging
            logging.warning(f"JSON parse failed: {e}, falling back to text mode")

            # Try to extract any text before JSON
            clean_response = accumulated.strip()
            first_brace = clean_response.find('{')
            if first_brace > 0:
                text_content = clean_response[:first_brace].strip()
                if text_content:
                    yield {"event": "content", "data": {"text": text_content}}

            # Update memory with raw response
            memory.chat_memory.add_user_message(user_message)
            memory.chat_memory.add_ai_message(clean_response)

        yield {"event": "done", "data": {"message_id": "", "title_updated": False}}

    async def generate_title(self, first_message: str) -> str:
        """Generate conversation title using LangChain PromptTemplate, 10 chars or less"""
        try:
            messages = TITLE_PROMPT.format_messages(first_message=first_message)
            response = await self.llm.ainvoke(messages)
            raw_title = response.content.strip()

            # Remove <think> blocks
            clean_title = re.sub(r'<think>.*?</think>', '', raw_title, flags=re.DOTALL).strip()

            title = clean_title[:10] if clean_title else "新对话"
            return title
        except Exception:
            return "新对话"
