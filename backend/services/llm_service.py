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
            # Phase 2: Enable M2.7 thinking (removed thinking: disabled)
        )

        # JSON output parser (already using LangChain)
        self.json_parser = JsonOutputParser()

        # Memory storage per conversation
        self._memory_store: Dict[str, SimpleConversationBufferMemory] = {}

    def _get_memory(self, conversation_id: str) -> SimpleConversationBufferMemory:
        """Get or create memory for a conversation"""
        if conversation_id not in self._memory_store:
            self._memory_store[conversation_id] = SimpleConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                k=10  # Keep last 10 messages (5 turns)
            )
        return self._memory_store[conversation_id]

    def _load_history_to_memory(
        self, conversation_id: str, conversation_history: list
    ):
        """Load conversation history from database into memory"""
        memory = self._get_memory(conversation_id)
        # Clear existing memory and reload from database
        memory.chat_memory.clear()
        for msg in conversation_history[-20:]:  # Load last 20 messages
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
        """
        Complete chat flow using LangChain PromptTemplate + Memory:
        1. Load history into ConversationBufferMemory
        2. Build messages using MAIN_CHAT_PROMPT with Memory integration
        3. Stream response from LLM
        4. Parse structured JSON response
        """
        # Get conversation state
        topic_chain = conversation_state.get("topic_chain", [])
        divergence_score = conversation_state.get("divergence_score", 0)
        turn_count = conversation_state.get("turn_count", 0)
        last_intervention = conversation_state.get("last_intervention", "none")

        # Build topic_chain display
        topic_chain_display = " → ".join(topic_chain[-5:]) if topic_chain else "暂无"

        # Load history into memory
        self._load_history_to_memory(conversation_id, conversation_history)

        # Build messages using PromptTemplate with memory
        # Pass chat_history from memory to properly resolve MessagesPlaceholder
        memory = self._get_memory(conversation_id)
        input_for_prompt = {
            "topic_title": topic_title,
            "topic_description": topic_description or "",
            "turn_count": turn_count,
            "topic_chain": topic_chain_display,
            "divergence_score": divergence_score,
            "last_intervention": last_intervention,
            "user_message": user_message,
            "chat_history": memory.chat_memory.messages,  # Resolves MessagesPlaceholder
        }

        # Use invoke() to properly resolve MessagesPlaceholder
        prompt_result = MAIN_CHAT_PROMPT.invoke(input_for_prompt)
        messages = prompt_result.to_messages()

        # Accumulate full response for JSON parsing
        accumulated = ""

        # Streaming with <think> filtering
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
                            # Content before <think> is final answer
                            before = text[:start_match.start()]
                            if before:
                                accumulated += before
                                yield {"event": "content", "data": {"text": before}}

                            # Process thinking content after <think>
                            in_thinking = True
                            think_text = text[start_match.end():]
                            end_match = think_end.search(think_text)
                            if end_match:
                                # <think> and </think> are in the same chunk
                                in_thinking = False
                                thinking_content = think_text[:end_match.start()]
                                if thinking_content:
                                    yield {"event": "reasoning", "data": {"text": thinking_content}}
                                # Content after </think> is final answer
                                after_think = think_text[end_match.end():]
                                if after_think:
                                    accumulated += after_think
                                    yield {"event": "content", "data": {"text": after_think}}
                            else:
                                # Only <think> in this chunk, </think> will come later
                                if think_text:
                                    yield {"event": "reasoning", "data": {"text": think_text}}
                        else:
                            # No thinking in this chunk - it's content
                            accumulated += text
                            yield {"event": "content", "data": {"text": text}}
                    else:
                        # We're inside <think> block, looking for </think>
                        end_match = think_end.search(text)
                        if end_match:
                            # Thinking ends in this chunk
                            in_thinking = False
                            thinking_content = text[:end_match.start()]
                            if thinking_content:
                                yield {"event": "reasoning", "data": {"text": thinking_content}}
                            # Content after </think> is final answer
                            after_think = text[end_match.end():]
                            if after_think:
                                accumulated += after_think
                                yield {"event": "content", "data": {"text": after_think}}
                        else:
                            # Still inside <think> - send as reasoning event
                            yield {"event": "reasoning", "data": {"text": text}}

        except Exception as e:
            yield {"event": "error", "data": {"message": str(e)}}
            return

        # Parse JSON response using LangChain JsonOutputParser
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

            # Update memory with new exchange
            memory = self._get_memory(conversation_id)
            memory.chat_memory.add_user_message(user_message)
            memory.chat_memory.add_ai_message(response.get("answer", ""))

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
            # JSON parse failed, fall back to text mode
            import logging
            logging.warning(f"JSON parse failed: {e}, falling back to text mode")

            # Still update memory with raw response
            memory = self._get_memory(conversation_id)
            memory.chat_memory.add_user_message(user_message)
            memory.chat_memory.add_ai_message(accumulated)

        yield {"event": "done", "data": {"message_id": "", "title_updated": False}}

    async def generate_title(self, first_message: str) -> str:
        """Generate conversation title using LangChain PromptTemplate, 10 chars or less"""
        try:
            # Use TITLE_PROMPT from templates
            messages = TITLE_PROMPT.format_messages(first_message=first_message)
            response = await self.llm.ainvoke(messages)
            raw_title = response.content.strip()

            # Remove <think> blocks
            clean_title = re.sub(r'<think>.*?</think>', '', raw_title, flags=re.DOTALL).strip()

            title = clean_title[:10] if clean_title else "新对话"
            return title
        except Exception:
            return "新对话"
