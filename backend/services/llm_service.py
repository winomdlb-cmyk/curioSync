import os
import json
import asyncio
from typing import AsyncGenerator, Optional
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableConfig
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    def __init__(self):
        self.llm = ChatOpenAI(
            base_url=os.getenv("MINIMAX_BASE_URL", "https://api.minimaxi.com/v1"),
            model=os.getenv("MINIMAX_MODEL", "MiniMax-M2.7-highspeed"),
            api_key=os.getenv("MINIMAX_API_KEY", ""),
            streaming=True,
            extra_body={
                "thinking": {
                    "type": "disabled"
                }
            }
        )

        # 创建 JSON 输出解析器
        self.json_parser = JsonOutputParser()

    def _build_prompt(
        self,
        topic_title: str,
        topic_description: str,
        turn_count: int,
        topic_chain: list,
        divergence_score: float,
        last_intervention: str,
        conversation_history: list,
        user_message: str,
    ) -> str:
        """构建完整的对话 Prompt"""

        # 构建 topic_chain 显示
        topic_chain_display = " → ".join(topic_chain[-5:]) if topic_chain else "暂无"

        # 构建对话历史
        history_prompt = ""
        for msg in conversation_history[-20:]:
            role = "用户" if msg["role"] == "user" else "助手"
            history_prompt += f"{role}：{msg['content']}\n"

        # 注入变量到 prompt
        prompt = f"""你是 CurioSync，一个引导学习的 AI 伙伴。
你不只是回答问题——你在帮助用户真正理解知识，同时在后台追踪学习状态。

## 当前上下文

主题：{topic_title}
主题描述：{topic_description}
对话轮次：{turn_count}
话题链（最近探索的话题，按时间顺序）：{topic_chain_display}
当前发散程度：{divergence_score}（0-1，越高表示话题越分散）
上次介入类型：{last_intervention}（none 表示尚未介入）

## 对话历史

{history_prompt}

## 当前对话

用户：{user_message}

## 输出格式要求

你必须严格按照以下 JSON 格式输出，不要输出任何 JSON 以外的内容：

{{
  "answer": "对用户问题的完整回答。要有教学引导感，适当用类比和例子，适当引发思考。中文。长度适中。",

  "observation": {{
    "new_topic": "本轮对话引入的核心新话题（一个词或短语，没有则填 null）",
    "divergence_delta": 0.05,
    "mastery_signal": "asking_basic | asking_why | applying | explaining",
    "mastery_topic": "本轮判断掌握度所针对的知识点名称"
  }},

  "knowledge_extraction": {{
    "new_nodes": [
      {{"label": "知识点名称（4-8字）", "description": "一句话描述这个概念"}}
    ],
    "new_edges": [
      {{
        "source_label": "知识点A",
        "target_label": "知识点B",
        "relation": "关系描述（如：是...的基础、导致、包含）"
      }}
    ],
    "nodes_to_update": [
      {{"label": "知识点名称", "mastery_level": "EXPOSED | UNDERSTOOD"}}
    ]
  }},

  "intervention": {{
    "should_intervene": false,
    "type": "none | converge | transition | bookmark",
    "content": {{}}
  }}
}}

## 介入判断规则

### 不介入时

{{ "should_intervene": false, "type": "none", "content": {{}} }}

### converge（收敛聚焦）

触发条件（满足其一）：
- turn_count >= 8 且 divergence_score > 0.6
- turn_count >= 12 且 divergence_score > 0.4
- topic_chain 中不同话题数量 > 6

content 格式：
{{
"summary": "到目前为止，我们聊到了...（2-3句话的小结）",
"options": ["继续探索", "整理一下"]
}}

### transition（阶段跃迁）

触发条件（同时满足）：
- 同一话题连续探讨 >= 3 轮
- 用户提问方式从"是什么"转向延伸性的"那...呢"
- divergence_delta < 0.15（话题聚焦）
- 距离上次介入 >= 5 轮

content 格式：
{{
"stage_summary": "关于[当前话题]，你已经理解了...（一句话）",
"next_directions": [
{{"label": "方向名称", "description": "一句话说明为什么值得探索"}},
{{"label": "方向名称", "description": "一句话说明为什么值得探索"}}
]
}}

### bookmark（书签记录）

触发条件：
- 用户表达出对某个话题的兴趣（含"好奇""想了解""以后""这个"等表述）
- 且该话题预计与主线偏离较大（divergence_delta > 0.3）

content 格式：
{{
"bookmark_title": "书签标题（5-10字）",
"bookmark_description": "为什么记录这个（一句话）"
}}

## 回答质量要求

- 教学引导感：不只给答案，适当引发用户思考
- 类比优先：用生活中的例子让抽象概念具体化
- 长度克制：不要超过 300 字
- 语言：中文
"""
        return prompt

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
        完整对话流程：
        1. 构造 Prompt
        2. 调用 LLM，流式返回
        3. 解析结构化 JSON 响应（使用 JsonOutputParser）
        4. yield 不同类型的 SSE 事件
        """
        # 构建 topic_chain 显示
        topic_chain = conversation_state.get("topic_chain", [])
        divergence_score = conversation_state.get("divergence_score", 0)
        turn_count = conversation_state.get("turn_count", 0)
        last_intervention = conversation_state.get("last_intervention", "none")

        # 构造 prompt
        full_prompt = self._build_prompt(
            topic_title=topic_title,
            topic_description=topic_description or "",
            turn_count=turn_count,
            topic_chain=topic_chain,
            divergence_score=divergence_score,
            last_intervention=last_intervention,
            conversation_history=conversation_history,
            user_message=user_message,
        )

        # 流式输出 content，同时收集完整响应
        accumulated = ""

        # 思考内容过滤正则
        think_start = __import__('re').compile(r'<think>')
        think_end = __import__('re').compile(r'</think>')
        in_thinking = False

        try:
            async for chunk in self.llm.astream(full_prompt):
                if chunk.content:
                    text = chunk.content

                    # 查找思考开始
                    if not in_thinking:
                        start_match = think_start.search(text)
                        if start_match:
                            # 输出开始之前的内容
                            before = text[:start_match.start()]
                            if before:
                                accumulated += before
                                yield {"event": "content", "data": {"text": before}}
                            in_thinking = True
                        else:
                            # 没有思考开始，直接输出
                            accumulated += text
                            yield {"event": "content", "data": {"text": text}}
                    else:
                        # 正在思考中，查找思考结束
                        end_match = think_end.search(text)
                        if end_match:
                            # 思考结束，处理结束后的内容
                            in_thinking = False
                            after_think = text[end_match.end():]
                            if after_think:
                                accumulated += after_think
                                yield {"event": "content", "data": {"text": after_think}}
                        # else: 仍在思考中，直接丢弃

        except Exception as e:
            yield {"event": "error", "data": {"message": str(e)}}
            return

        # 使用 JsonOutputParser 解析完整响应
        try:
            # 清理响应：去除思考内容
            clean_response = accumulated.strip()

            # 去除思考内容 (<think>...</think>)
            import re
            clean_response = re.sub(r'<think>.*?</think>', '', clean_response, flags=re.DOTALL)

            # 提取 JSON 对象
            first_brace = clean_response.find('{')
            last_brace = clean_response.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                json_str = clean_response[first_brace:last_brace+1]
            elif "```json" in clean_response:
                json_str = clean_response.split("```json")[1].split("```")[0]
            elif "```" in clean_response:
                json_str = clean_response.split("```")[1].split("```")[0]
            else:
                # 没有找到 JSON 格式，使用原始响应
                raise ValueError("No JSON found in response")

            # 使用 LangChain JsonOutputParser 解析（它能正确处理转义字符）
            response = self.json_parser.parse(json_str.strip())

            # yield knowledge_extraction for graph update
            knowledge_extraction = response.get("knowledge_extraction", {})
            if knowledge_extraction.get("new_nodes") or knowledge_extraction.get("nodes_to_update"):
                yield {
                    "event": "knowledge_extraction",
                    "data": knowledge_extraction,
                }

            # yield node_hint (for frontend display)
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

            # yield intervention
            intervention = response.get("intervention", {})
            if intervention.get("should_intervene"):
                yield {
                    "event": "intervention",
                    "data": {
                        "type": intervention.get("type", "none"),
                        "content": intervention.get("content", {}),
                    },
                }

            # yield observation for state update
            yield {"event": "observation", "data": response.get("observation", {})}

        except Exception as e:
            # 解析失败，降级为纯文本模式（answer 已经在流式输出中）
            # 只记录错误，不影响流程
            import logging
            logging.warning(f"JSON parse failed: {e}, falling back to text mode")

        yield {"event": "done", "data": {"message_id": "", "title_updated": False}}

    async def generate_title(self, first_message: str) -> str:
        """生成对话标题，10字以内"""
        prompt = f"""根据以下用户消息，生成一个对话标题。
要求：10字以内，中文，直接输出标题本身，不加任何标点或引号。

用户消息：{first_message}"""

        try:
            response = await self.llm.ainvoke(prompt)
            raw_title = response.content.strip()

            # 过滤 LLM 思考内容
            import re
            clean_title = re.sub(r'<think>.*?</think>', '', raw_title, flags=re.DOTALL).strip()

            title = clean_title[:10] if clean_title else "新对话"
            return title
        except Exception:
            return "新对话"