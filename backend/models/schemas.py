from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


# Topic schemas
class TopicCreate(BaseModel):
    title: str
    description: Optional[str] = None

    @field_validator('title')
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('标题不能为空')
        if len(v) > 100:
            raise ValueError('标题不能超过100个字符')
        return v.strip()


class TopicResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    conversation_count: Optional[int] = 0
    node_count: Optional[int] = 0
    bookmark_count: Optional[int] = 0
    updated_at: Optional[str] = None


class TopicListResponse(BaseModel):
    topics: list[TopicResponse]


# Conversation schemas
class ConversationCreate(BaseModel):
    topic_id: str


class ConversationResponse(BaseModel):
    id: str
    topic_id: str
    title: Optional[str] = "新对话"
    message_count: Optional[int] = 0
    updated_at: Optional[str] = None


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]


# Message schemas
class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    message_type: str = "normal"
    metadata: dict = {}
    created_at: str


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]


# Chat request
class ChatRequest(BaseModel):
    content: str
    topic_id: str


# Knowledge Node schemas
class KnowledgeNodeResponse(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    mastery_level: str = "UNAWARE"
    position: dict = {"x": 0, "y": 0}
    created_at: Optional[str] = None


class KnowledgeEdgeResponse(BaseModel):
    id: str
    source: str
    target: str
    relation: Optional[str] = None


class KnowledgeGraphResponse(BaseModel):
    nodes: list[KnowledgeNodeResponse]
    edges: list[KnowledgeEdgeResponse]


# Bookmark schemas
class BookmarkResponse(BaseModel):
    id: str
    topic_id: str
    conversation_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    is_explored: bool = False
    created_at: str


# SSE Event data
class NodeHintData(BaseModel):
    new_nodes: list[dict]
    updated_nodes: list[dict]


class InterventionData(BaseModel):
    type: str  # converge | transition | bookmark
    content: dict


class GraphUpdateData(BaseModel):
    new_nodes: list[dict]
    new_edges: list[dict]
    updated_nodes: list[dict]


class DoneData(BaseModel):
    message_id: str
    title_updated: bool = False
