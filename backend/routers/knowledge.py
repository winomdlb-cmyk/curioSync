from fastapi import APIRouter, HTTPException, Query
import re
from database import get_supabase
from models.schemas import KnowledgeGraphResponse, KnowledgeNodeResponse
from services.graph_service import GraphService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
supabase = get_supabase()
graph_service = GraphService()


def is_valid_uuid(id: str) -> bool:
    """检查字符串是否为有效的 UUID 格式"""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, id, re.IGNORECASE))


@router.get("/graph", response_model=KnowledgeGraphResponse)
async def get_graph(topic_id: str = Query(...)):
    """获取完整图谱"""
    graph_data = await graph_service.get_graph(topic_id)
    return KnowledgeGraphResponse(**graph_data)


@router.get("/nodes/{node_id}")
async def get_node(node_id: str):
    """获取节点详情"""
    if not is_valid_uuid(node_id):
        raise HTTPException(status_code=404, detail="Node not found")

    # 获取节点
    node_result = (
        supabase.table("knowledge_nodes").select("*").eq("id", node_id).execute()
    )

    if not node_result.data:
        raise HTTPException(status_code=404, detail="Node not found")

    node = node_result.data[0]

    # 获取相关消息
    related_messages_result = (
        supabase.table("messages")
        .select("id, conversation_id, content")
        .ilike("content", f"%{node['label']}%")
        .limit(5)
        .execute()
    )

    # 获取对话标题
    related_messages = []
    for msg in related_messages_result.data:
        conv_result = (
            supabase.table("conversations")
            .select("title")
            .eq("id", msg["conversation_id"])
            .execute()
        )
        conv_title = conv_result.data[0]["title"] if conv_result.data else "未知对话"

        related_messages.append(
            {
                "conversation_id": msg["conversation_id"],
                "conversation_title": conv_title,
                "message_excerpt": msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"],
            }
        )

    return {
        "id": node["id"],
        "label": node["label"],
        "description": node.get("description"),
        "mastery_level": node["mastery_level"],
        "related_messages": related_messages,
    }
