from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import asyncio
import json
import re
from sse_starlette.sse import EventSourceResponse
from database import get_supabase
from models.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    MessageResponse,
    MessageListResponse,
    ChatRequest,
    RelatedConversationResponse,
)
from services.llm_service import LLMService
from services.graph_service import GraphService
from services.mastery_service import MasteryService
from services.bookmark_service import BookmarkService

router = APIRouter(prefix="/api/conversations", tags=["conversations"])
supabase = get_supabase()
llm_service = LLMService()
graph_service = GraphService()
mastery_service = MasteryService()
bookmark_service = BookmarkService()


def is_valid_uuid(id: str) -> bool:
    """检查字符串是否为有效的 UUID 格式"""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, id, re.IGNORECASE))


@router.get("", response_model=ConversationListResponse)
async def get_conversations(topic_id: str = Query(...)):
    """获取主题下所有对话（优化：批量查询）"""
    result = (
        supabase.table("conversations")
        .select("*")
        .eq("topic_id", topic_id)
        .order("updated_at", desc=True)
        .execute()
    )

    if not result.data:
        return ConversationListResponse(conversations=[])

    # 批量获取消息数量
    conv_ids = [c["id"] for c in result.data]
    msg_counts_result = (
        supabase.table("messages")
        .select("conversation_id")
        .in_("conversation_id", conv_ids)
        .execute()
    )

    # 统计每个对话的消息数量
    msg_count_map = {}
    for row in msg_counts_result.data:
        cid = row["conversation_id"]
        msg_count_map[cid] = msg_count_map.get(cid, 0) + 1

    conversations = []
    for conv in result.data:
        conversations.append(
            ConversationResponse(
                id=conv["id"],
                topic_id=conv["topic_id"],
                title=conv.get("title", "新对话"),
                message_count=msg_count_map.get(conv["id"], 0),
                updated_at=conv.get("updated_at"),
            )
        )

    return ConversationListResponse(conversations=conversations)


@router.get("/related", response_model=RelatedConversationResponse)
async def get_related_conversations(
    topic_id: str = Query(...),
    node_label: str = Query(...),
):
    """获取与指定节点相关的对话列表"""
    # 先获取该主题下所有对话ID
    convs_result = (
        supabase.table("conversations")
        .select("id, title")
        .eq("topic_id", topic_id)
        .execute()
    )

    if not convs_result.data:
        return RelatedConversationResponse(conversations=[])

    conv_ids = [c["id"] for c in convs_result.data]
    conv_map = {c["id"]: c["title"] for c in convs_result.data}

    # 查询这些对话中包含节点标签的消息
    messages_result = (
        supabase.table("messages")
        .select("conversation_id, content")
        .in_("conversation_id", conv_ids)
        .ilike("content", f"%{node_label}%")
        .execute()
    )

    if not messages_result.data:
        return RelatedConversationResponse(conversations=[])

    # 按对话分组
    related_convs = {}
    for msg in messages_result.data:
        conv_id = msg["conversation_id"]
        if conv_id not in related_convs:
            related_convs[conv_id] = {
                "id": conv_id,
                "title": conv_map.get(conv_id, "相关对话"),
                "snippet": msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"],
            }

    conversations = list(related_convs.values())
    return RelatedConversationResponse(conversations=conversations)


@router.post("", response_model=ConversationResponse)
async def create_conversation(conversation: ConversationCreate):
    """创建新对话"""
    # 先创建对话
    result = (
        supabase.table("conversations")
        .insert({"topic_id": conversation.topic_id, "title": "新对话"})
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create conversation")

    conv = result.data[0]

    # 创建初始对话状态
    supabase.table("conversation_states").insert(
        {
            "conversation_id": conv["id"],
            "topic_chain": [],
            "divergence_score": 0,
            "turn_count": 0,
        }
    ).execute()

    return ConversationResponse(
        id=conv["id"],
        topic_id=conv["topic_id"],
        title=conv.get("title", "新对话"),
        updated_at=conv.get("created_at"),
    )


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(conversation_id: str):
    """获取消息历史"""
    result = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )

    messages = [
        MessageResponse(
            id=msg["id"],
            role=msg["role"],
            content=msg["content"],
            message_type=msg.get("message_type", "normal"),
            metadata=msg.get("metadata", {}),
            created_at=msg.get("created_at"),
        )
        for msg in result.data
    ]

    return MessageListResponse(messages=messages)


@router.post("/{conversation_id}/chat")
async def chat(conversation_id: str, request: ChatRequest):
    """发送消息（SSE流式）"""
    if not is_valid_uuid(conversation_id):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"message": "Conversation not found"})

    async def event_generator():
        # 获取对话信息
        conv_result = (
            supabase.table("conversations")
            .select("*, topics:topic_id(title, description)")
            .eq("id", conversation_id)
            .execute()
        )

        if not conv_result.data:
            yield "3:{\"error\": \"Conversation not found\"}\n"
            return

        conv = conv_result.data[0]
        topic = conv.get("topics", {})
        topic_title = topic.get("title", "") if topic else ""
        topic_description = topic.get("description", "") if topic else ""

        # 获取消息历史
        history_result = (
            supabase.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        )
        conversation_history = [
            {"role": msg["role"], "content": msg["content"]} for msg in history_result.data
        ]

        # 获取对话状态
        state_result = (
            supabase.table("conversation_states")
            .select("*")
            .eq("conversation_id", conversation_id)
            .execute()
        )
        conversation_state = (
            state_result.data[0] if state_result.data else {
                "topic_chain": [],
                "divergence_score": 0,
                "turn_count": 0,
                "last_intervention": "none",
            }
        )

        # 保存用户消息
        user_msg_result = (
            supabase.table("messages")
            .insert(
                {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": request.content,
                    "message_type": "normal",
                }
            )
            .execute()
        )
        user_msg_id = user_msg_result.data[0]["id"] if user_msg_result.data else ""

        # 更新对话时间
        supabase.table("conversations").update(
            {"updated_at": "now()"}
        ).eq("id", conversation_id).execute()

        # 如果是第一条消息，异步生成标题
        is_first_message = len(conversation_history) == 0
        if is_first_message:
            asyncio.create_task(_update_conversation_title(conversation_id, request.content))

        # 调用 LLM 服务 - 直接传递 data-stream 格式
        full_response = ""
        node_hint_data = None
        intervention_data = None

        async for data_chunk in llm_service.chat_stream(
            conversation_id=conversation_id,
            topic_id=request.topic_id,
            topic_title=topic_title,
            topic_description=topic_description,
            user_message=request.content,
            conversation_history=conversation_history,
            conversation_state=conversation_state,
        ):
            # data_chunk is already in data-stream format like "g:{...}\n" or "0:{...}\n" or "d:{...}\n"
            yield data_chunk

            # Track full response and metadata
            if data_chunk.startswith("0:"):
                try:
                    # Extract text delta
                    json_str = data_chunk[2:].strip()
                    if json_str.endswith("\n"):
                        json_str = json_str[:-1]
                    data = json.loads(json_str)
                    full_response += data.get("textDelta", "")
                except:
                    pass
            elif data_chunk.startswith("d:"):
                try:
                    # Extract metadata from finish event
                    json_str = data_chunk[2:].strip()
                    if json_str.endswith("\n"):
                        json_str = json_str[:-1]
                    data = json.loads(json_str)
                    usage = data.get("usage", {})
                    curio_metadata = usage.get("curioMetadata", {})
                    node_hint_data = curio_metadata.get("node_hint")
                    intervention_data = curio_metadata.get("intervention")
                except:
                    pass

        # After stream completes, save AI message and update graph
        if full_response:
            ai_msg_result = (
                supabase.table("messages")
                .insert(
                    {
                        "conversation_id": conversation_id,
                        "role": "assistant",
                        "content": full_response,
                        "message_type": "normal",
                    }
                )
                .execute()
            )

            # 更新对话状态
            if intervention_data:
                await _update_conversation_state(conversation_id, {}, intervention_data)
            else:
                await _update_conversation_state(conversation_id, {}, None)

            # 更新知识图谱
            if node_hint_data:
                await graph_service.update_graph(request.topic_id, {
                    "new_nodes": node_hint_data.get("new_nodes", []),
                    "nodes_to_update": node_hint_data.get("updated_nodes", [])
                })

            # 如果是书签介入，写入书签表
            if intervention_data and intervention_data.get("type") == "bookmark":
                content = intervention_data.get("content", {})
                bookmark_service.create_bookmark(
                    topic_id=request.topic_id,
                    conversation_id=conversation_id,
                    bookmark_title=content.get("bookmark_title", ""),
                    bookmark_description=content.get("bookmark_description", ""),
                    message_context=request.content,
                )

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={"Content-Type": "text/plain; charset=utf-8"}
    )


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除对话"""
    if not is_valid_uuid(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = supabase.table("conversations").delete().eq("id", conversation_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"message": "Conversation deleted successfully"}


async def _update_conversation_title(conversation_id: str, first_message: str):
    """异步更新对话标题"""
    try:
        title = await llm_service.generate_title(first_message)
        supabase.table("conversations").update({"title": title}).eq(
            "id", conversation_id
        ).execute()
    except Exception:
        pass


async def _update_conversation_state(
    conversation_id: str, observation_data: dict, intervention_data: dict = None
):
    """更新对话状态"""
    state_result = (
        supabase.table("conversation_states")
        .select("*")
        .eq("conversation_id", conversation_id)
        .execute()
    )

    if not state_result.data:
        return

    state = state_result.data[0]
    topic_chain = state.get("topic_chain", [])
    divergence_score = state.get("divergence_score", 0)
    turn_count = state.get("turn_count", 0)

    # 更新话题链
    new_topic = observation_data.get("new_topic")
    if new_topic and new_topic not in topic_chain[-5:]:
        topic_chain.append(new_topic)
        if len(topic_chain) > 10:
            topic_chain = topic_chain[-10:]

    # 更新发散程度
    divergence_delta = observation_data.get("divergence_delta", 0)
    divergence_score = max(0, min(1, divergence_score + divergence_delta))

    # 更新轮次
    turn_count += 1

    # 更新上次介入类型
    last_intervention = state.get("last_intervention", "none")
    if intervention_data:
        last_intervention = intervention_data.get("type", "none")

    supabase.table("conversation_states").update(
        {
            "topic_chain": topic_chain,
            "divergence_score": divergence_score,
            "turn_count": turn_count,
            "last_intervention": last_intervention,
            "updated_at": "now()",
        }
    ).eq("conversation_id", conversation_id).execute()
