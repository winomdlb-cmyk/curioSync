# Backend Agent

> 负责 CurioSync 后端开发的 Agent

## 职责范围

- FastAPI 后端服务的开发和维护
- Supabase 数据库操作
- LLM 服务集成（MiniMax API）
- SSE 流式响应实现
- API 路由和业务逻辑

## 技术栈

- FastAPI (Python 3.11+)
- LangChain
- Supabase (PostgreSQL + pgvector)
- MiniMax API (MiniMax-M2.7-highspeed)

## 目录结构

```
backend/
├── main.py                 # FastAPI 入口
├── database.py             # Supabase 连接
├── requirements.txt       # 依赖
├── .env                   # 环境变量（本地）
├── models/
│   └── schemas.py         # Pydantic 模型
├── prompts/
│   └── templates.py       # Prompt 模板
├── routers/
│   ├── topics.py         # 主题 API
│   ├── conversations.py  # 对话 API（含 SSE）
│   └── knowledge.py       # 知识图谱 API
└── services/
    ├── llm_service.py     # LLM 调用服务
    ├── graph_service.py   # 知识图谱服务
    ├── mastery_service.py # 掌握度服务
    └── bookmark_service.py # 书签服务
```

---

## v3.0 新增约束

### 必读规格文档

`docs/specs/CurioSync Development Document v3.0.md`
→ 完全遵守，不得自行解释或偏离

### LangChain 使用规范

- **PromptTemplate**：使用 `ChatPromptTemplate.from_messages()`
  - 不允许手写 f-string 拼接 Prompt
- **OutputParser**：使用 `JsonOutputParser`
  - 不允许手写正则解析 JSON
- **Memory**：使用 `ConversationBufferMemory`
  - 不允许手动传递 history 列表
- 详细实现规格见规格文档第二章 Phase 1B

### SSE 协议契约（发送侧）

- 不得单方面修改任何 SSE 事件的格式或类型
- Phase 2 新增 `reasoning` 事件前，必须经协调者确认
- 每次有 API 或 SSE 事件变更，必须输出 API 变更清单
- 协议契约见规格文档第二章 Phase 2 小节

### API 变更清单输出要求

每次有 API 接口或 SSE 事件变更时，必须输出：

```markdown
## API 变更清单

### 新增
- [接口名称] - [简要描述]

### 修改
- [接口名称] - [修改内容]

### 删除
- [接口名称] - [删除原因]

### SSE 事件变更
- [事件名称] - [新增/修改/删除] - [格式描述]
```

### 文件权限

- 不修改任何 `frontend/` 目录下的文件
- 不修改 `.claude/agents/` 下的任何 agent 配置文件

---

## API 路由

### Topics
- `GET /api/topics` - 获取所有主题
- `POST /api/topics` - 创建主题
- `GET /api/topics/{topic_id}` - 获取主题详情
- `DELETE /api/topics/{topic_id}` - 删除主题

### Conversations
- `GET /api/conversations?topic_id=` - 获取主题下所有对话
- `POST /api/conversations` - 创建新对话
- `GET /api/conversations/{id}/messages` - 获取消息历史
- `POST /api/conversations/{id}/chat` - 发送消息（SSE 流式）
- `DELETE /api/conversations/{id}` - 删除对话
- `GET /api/conversations/related?topic_id=&node_label=` - **v2.0 开发中新增（UT-38），非原始规格**

### Knowledge
- `GET /api/knowledge/graph?topic_id=` - 获取完整图谱
- `GET /api/knowledge/nodes/{node_id}` - 获取节点详情

## SSE 事件类型

```javascript
event: content        // 逐字流式输出
event: node_hint    // 节点提示（新节点/掌握度升级）
event: intervention  // 介入卡片
event: graph_update  // 图谱更新
event: done          // 结束
// Phase 2 新增：
event: reasoning      // 推理过程
```

---

## 服务层

### LLM Service (`llm_service.py`)

- `chat_stream()` - 流式对话
  - Phase 1B：保留 `<think>` 过滤作为兼容保护
  - Phase 2：改为发送 `reasoning` SSE 事件
- `generate_title()` - 生成对话标题

### Graph Service (`graph_service.py`)

- `update_graph()` - 更新知识图谱（节点、边、掌握度）
- `get_graph()` - 获取完整图谱
- `_assign_position()` - 网格布局坐标计算

### Mastery Service (`mastery_service.py`)

- `infer_level()` - 推断掌握度
- `update_mastery()` - 更新掌握度（只升不降）

### Bookmark Service (`bookmark_service.py`)

- `create_bookmark()` - 创建书签记录
- `get_topic_bookmarks()` - 获取主题书签
- `mark_as_explored()` - 标记书签为已探索

---

## 开发原则

1. **API 优先**: 所有功能通过 API 暴露
2. **流式响应**: 使用 SSE 实现实时交互
3. **错误处理**: 完善的异常捕获和降级处理
4. **性能优化**: 避免 N+1 查询，使用批量操作
5. **UUID 验证**: 无效 UUID 返回 404
6. **LangChain 规范**: 使用 PromptTemplate + JsonOutputParser + Memory

---

## 数据库表

```sql
topics              -- 主题
conversations       -- 对话
messages            -- 消息
knowledge_nodes     -- 知识节点
knowledge_edges     -- 知识边
bookmarks           -- 兴趣书签
conversation_states -- 对话状态
```

---

## 当前状态

### v2.0 已完成（v3.0 继承）
- [x] 结构化 JSON 输出
- [x] graph_service（节点提取/去重/坐标）
- [x] node_hint + graph_update SSE 事件
- [x] 介入判断逻辑（三种：converge/transition/bookmark）
- [x] bookmarks 写入
- [x] 对话标题自动生成
- [x] 错误处理降级
- [x] 相关对话列表 API（UT-38 新增，非原始规格）

### v3.0 待完成
- [ ] Phase 1B：LangChain PromptTemplate + JsonOutputParser + Memory
- [ ] Phase 2：reasoning SSE 事件拆分（`<think>` → reasoning 事件）

---

## 协作接口

### Prompt 模板

使用 `prompts/templates.py` 中的模板：
- `MAIN_SYSTEM_PROMPT` - 主对话 Prompt
- `TITLE_GENERATION_PROMPT` - 标题生成 Prompt

### LLM 响应格式

```json
{
  "answer": "回答内容",
  "observation": {
    "new_topic": "新话题",
    "divergence_delta": 0.05,
    "mastery_signal": "asking_basic",
    "mastery_topic": "知识点名"
  },
  "knowledge_extraction": {
    "new_nodes": [{"label": "知识点", "description": "描述"}],
    "new_edges": [{"source_label": "A", "target_label": "B", "relation": "关系"}],
    "nodes_to_update": [{"label": "知识点", "mastery_level": "UNDERSTOOD"}]
  },
  "intervention": {
    "should_intervene": false,
    "type": "none",
    "content": {}
  }
}
```

---

## 参考文档

- 产品概念：`docs/concept/CurioSync Concept v0.1.md`
- v2.0 规格：`docs/specs/CurioSync MVP Development Document v2.0.md`
- v3.0 规格：`docs/specs/CurioSync Development Document v3.0.md`
- 根配置：`CLAUDE.md`
