from fastapi import APIRouter, HTTPException
from typing import Optional
from database import get_supabase
from models.schemas import (
    TopicCreate,
    TopicResponse,
    TopicListResponse,
)
import re

router = APIRouter(prefix="/api/topics", tags=["topics"])
supabase = get_supabase()


def is_valid_uuid(id: str) -> bool:
    """检查字符串是否为有效的 UUID 格式"""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, id, re.IGNORECASE))

router = APIRouter(prefix="/api/topics", tags=["topics"])
supabase = get_supabase()


@router.get("", response_model=TopicListResponse)
async def get_topics():
    """获取所有主题（优化：批量查询避免N+1问题）"""
    result = supabase.table("topics").select("*").order("updated_at", desc=True).execute()

    if not result.data:
        return TopicListResponse(topics=[])

    # 批量获取对话数量
    topic_ids = [t["id"] for t in result.data]
    conv_counts_result = (
        supabase.table("conversations")
        .select("topic_id")
        .in_("topic_id", topic_ids)
        .execute()
    )

    # 批量获取节点数量
    node_counts_result = (
        supabase.table("knowledge_nodes")
        .select("topic_id")
        .in_("topic_id", topic_ids)
        .execute()
    )

    # 统计每个topic的对话数量
    conv_count_map = {}
    for row in conv_counts_result.data:
        tid = row["topic_id"]
        conv_count_map[tid] = conv_count_map.get(tid, 0) + 1

    # 统计每个topic的节点数量
    node_count_map = {}
    for row in node_counts_result.data:
        tid = row["topic_id"]
        node_count_map[tid] = node_count_map.get(tid, 0) + 1

    topics = []
    for topic in result.data:
        topics.append(
            TopicResponse(
                id=topic["id"],
                title=topic["title"],
                description=topic.get("description"),
                conversation_count=conv_count_map.get(topic["id"], 0),
                node_count=node_count_map.get(topic["id"], 0),
                updated_at=topic.get("updated_at"),
            )
        )

    return TopicListResponse(topics=topics)


@router.post("", response_model=TopicResponse)
async def create_topic(topic: TopicCreate):
    """创建主题"""
    result = supabase.table("topics").insert({"title": topic.title, "description": topic.description}).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create topic")

    return TopicResponse(
        id=result.data[0]["id"],
        title=result.data[0]["title"],
        description=result.data[0].get("description"),
        updated_at=result.data[0].get("created_at"),
    )


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(topic_id: str):
    """获取主题详情（优化：不查计数，用于主题页）"""
    if not is_valid_uuid(topic_id):
        raise HTTPException(status_code=404, detail="Topic not found")

    result = supabase.table("topics").select("*").eq("id", topic_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic = result.data[0]

    return TopicResponse(
        id=topic["id"],
        title=topic["title"],
        description=topic.get("description"),
        updated_at=topic.get("updated_at"),
    )


@router.delete("/{topic_id}")
async def delete_topic(topic_id: str):
    """删除主题"""
    if not is_valid_uuid(topic_id):
        raise HTTPException(status_code=404, detail="Topic not found")

    result = supabase.table("topics").delete().eq("id", topic_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Topic not found")

    return {"message": "Topic deleted successfully"}
