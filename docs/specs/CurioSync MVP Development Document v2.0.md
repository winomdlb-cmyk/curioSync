# CurioSync MVP Development Document v2.0

> 本文档为 Claude Code 开发使用的完整技术规格。\
> 基于产品思考文档 v0.1 + 界面形态讨论定稿\
****v2.0 相对 v1.0 的核心变更：界面重构为左侧导航 + 右侧全屏内容区，去除临时对话，书签 UI 极简化**

---

## 零、开发前必读

### 技术栈

```javascript
前端        Next.js 14 (App Router) + TailwindCSS + React Flow  
后端        FastAPI (Python 3.11+)  
LLM 编排   LangChain  
数据库      Supabase (PostgreSQL + pgvector)  
LLM         MiniMax API  
本地开发    前后端分离，本地同时运行  
```

### 目录结构

```javascript
curiosync/  
├── frontend/  
│   ├── app/  
│   │   ├── page.tsx                    # 主页（主题列表）  
│   │   ├── topic/  
│   │   │   └── [topicId]/  
│   │   │       └── page.tsx            # 主题页面（核心页面）  
│   │   └── layout.tsx  
│   ├── components/  
│   │   ├── TopicList/                  # 主题列表 + 新建弹窗  
│   │   ├── Sidebar/                    # 左侧导航栏  
│   │   │   ├── Sidebar.tsx             # 侧边栏容器（含收起逻辑）  
│   │   │   ├── ConversationList.tsx    # 对话列表  
│   │   │   └── SidebarNav.tsx          # 图谱 / 书签入口  
│   │   ├── Chat/  
│   │   │   ├── ChatView.tsx            # 对话视图容器  
│   │   │   ├── MessageList.tsx         # 消息列表  
│   │   │   ├── MessageBubble.tsx       # 消息气泡  
│   │   │   ├── InputBar.tsx            # 输入框  
│   │   │   └── NodeToast.tsx           # 轻触式节点提示  
│   │   ├── KnowledgeMap/  
│   │   │   ├── KnowledgeMapView.tsx    # 图谱视图容器  
│   │   │   ├── GraphCanvas.tsx         # React Flow 画布  
│   │   │   ├── CustomNode.tsx          # 自定义节点  
│   │   │   └── NodeDetailPanel.tsx     # 节点详情面板  
│   │   └── Intervention/  
│   │       ├── ConvergeCard.tsx  
│   │       ├── TransitionCard.tsx  
│   │       └── BookmarkToast.tsx       # 书签极简提示  
│   └── lib/  
│       ├── api.ts                      # API 调用封装  
│       └── types.ts                    # 全局类型定义  
│  
└── backend/  
    ├── main.py  
    ├── routers/  
    │   ├── topics.py  
    │   ├── conversations.py  
    │   └── knowledge.py  
    ├── services/  
    │   ├── llm_service.py  
    │   ├── graph_service.py  
    │   └── mastery_service.py  
    ├── models/  
    │   └── schemas.py  
    ├── prompts/  
    │   └── templates.py  
    └── database.py  
```

---

## 一、数据库设计

### 1.1 主题表 `topics`

```sql
CREATE TABLE topics (  
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  title         TEXT NOT NULL,  
  description   TEXT,  
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

### 1.2 对话表 `conversations`

```sql
-- v2.0 去掉 is_temporary 字段，MVP 只有正式对话  
CREATE TABLE conversations (  
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  topic_id      UUID REFERENCES topics(id) ON DELETE CASCADE,  
  title         TEXT,           -- 由第一条消息自动生成，10字以内  
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

### 1.3 消息表 `messages`

```sql
CREATE TABLE messages (  
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,  
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),  
  content         TEXT NOT NULL,  
  message_type    TEXT DEFAULT 'normal'  
                  CHECK (message_type IN (  
                    'normal',  
                    'intervention_converge',  
                    'intervention_transition',  
                    'intervention_bookmark'  
                  )),  
  metadata        JSONB DEFAULT '{}',  
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

### 1.4 知识节点表 `knowledge_nodes`

```sql
CREATE TABLE knowledge_nodes (  
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  topic_id        UUID REFERENCES topics(id) ON DELETE CASCADE,  
  label           TEXT NOT NULL,  
  description     TEXT,  
  mastery_level   TEXT DEFAULT 'UNAWARE'  
                  CHECK (mastery_level IN ('UNAWARE', 'EXPOSED', 'UNDERSTOOD')),  
  position_x      FLOAT DEFAULT 0,  
  position_y      FLOAT DEFAULT 0,  
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

### 1.5 知识节点关系表 `knowledge_edges`

```sql
CREATE TABLE knowledge_edges (  
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  topic_id    UUID REFERENCES topics(id) ON DELETE CASCADE,  
  source_id   UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,  
  target_id   UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,  
  relation    TEXT,  
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

### 1.6 兴趣书签表 `bookmarks`

```sql
-- 后台静默记录，MVP 阶段不做完整 UI，保留数据结构供后续使用  
CREATE TABLE bookmarks (  
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  topic_id        UUID REFERENCES topics(id) ON DELETE CASCADE,  
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,  
  title           TEXT NOT NULL,  
  description     TEXT,  
  message_context TEXT,  
  is_explored     BOOLEAN DEFAULT FALSE,  
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

### 1.7 对话状态表 `conversation_states`

```sql
CREATE TABLE conversation_states (  
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  conversation_id     UUID UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,  
  topic_chain         JSONB DEFAULT '[]',  
  divergence_score    FLOAT DEFAULT 0,  
  turn_count          INTEGER DEFAULT 0,  
  last_intervention   TEXT,  
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);  
```

---

## 二、后端 API 设计

### 2.1 主题 API

```javascript
GET    /api/topics                    获取所有主题  
POST   /api/topics                    创建主题  
GET    /api/topics/{topic_id}         获取主题详情  
DELETE /api/topics/{topic_id}         删除主题  
```

#### GET /api/topics

```json
Response:  
{  
  "topics": [  
    {  
      "id": "uuid",  
      "title": "分子间作用力",  
      "description": "...",  
      "conversation_count": 3,  
      "node_count": 12,  
      "updated_at": "..."  
    }  
  ]  
}  
```

#### POST /api/topics

```json
Request:  { "title": "分子间作用力", "description": "..." }  
Response: { "id": "uuid", "title": "...", "created_at": "..." }  
```

#### GET /api/topics/{topic_id}

```json
Response:  
{  
  "id": "uuid",  
  "title": "...",  
  "description": "...",  
  "conversation_count": 3,  
  "node_count": 12,  
  "bookmark_count": 2  
}  
```

---

### 2.2 对话 API

```javascript
GET    /api/conversations?topic_id=   获取主题下所有对话  
POST   /api/conversations             创建新对话  
GET    /api/conversations/{id}/messages  获取消息历史  
POST   /api/conversations/{id}/chat   发送消息（SSE 流式）  
DELETE /api/conversations/{id}        删除对话  
```

#### GET /api/conversations?topic_id={topic_id}

```json
Response:  
{  
  "conversations": [  
    {  
      "id": "uuid",  
      "title": "表面张力是怎么形成的",  
      "message_count": 8,  
      "updated_at": "..."  
    }  
  ]  
}  
```

#### POST /api/conversations

```json
Request:  { "topic_id": "uuid" }  
Response: { "id": "uuid", "topic_id": "uuid", "title": "新对话", ... }  

说明：  
  title 初始为 "新对话"  
  第一条用户消息发送后，异步生成真正标题并更新  
```

#### GET /api/conversations/{id}/messages

```json
Response:  
{  
  "messages": [  
    {  
      "id": "uuid",  
      "role": "user",  
      "content": "表面张力是什么？",  
      "message_type": "normal",  
      "metadata": {},  
      "created_at": "..."  
    },  
    {  
      "id": "uuid",  
      "role": "assistant",  
      "content": "表面张力是...",  
      "message_type": "normal",  
      "metadata": {},  
      "created_at": "..."  
    }  
  ]  
}  
```

#### POST /api/conversations/{id}/chat（核心接口）

```json
Request:  
{  
  "content": "表面张力是什么？",  
  "topic_id": "uuid"  
}  
```

**Response: SSE 流式，事件类型如下**

```javascript
# 1. 正文内容（逐字流式输出）  
event: content  
data: {"text": "表面张力是"}  

event: content  
data: {"text": "液体表面..."}  

# 2. 节点提示（轻触式，出现在正文结束后）  
event: node_hint  
data: {  
  "new_nodes": [  
    {"label": "表面张力", "is_new": true},  
    {"label": "分子引力", "is_new": false, "mastery_upgraded": true}  
  ]  
}  

# 3. 介入卡片（如果触发，出现在 node_hint 之后）  
event: intervention  
data: {  
  "type": "converge",           // converge | transition | bookmark  
  "content": { ... }            // 见下方介入内容格式  
}  

# 4. 图谱数据更新（前端用于刷新图谱视图）  
event: graph_update  
data: {  
  "new_nodes": [...],  
  "new_edges": [...],  
  "updated_nodes": [...]  
}  

# 5. 流结束  
event: done  
data: {"message_id": "uuid", "title_updated": true}  
```

**介入内容格式（**`intervention.content`**）**

```json
// converge（收敛聚焦）  
{  
  "summary": "我们聊到了表面张力的形成、分子间作用力以及毛细现象...",  
  "options": ["继续探索", "整理一下"]  
}  

// transition（阶段跃迁）  
{  
  "stage_summary": "关于表面张力，你已经理解了它的形成原理",  
  "next_directions": [  
    {"label": "毛细现象", "description": "和表面张力直接相关"},  
    {"label": "亲水与疏水", "description": "从材料角度看"}  
  ]  
}  

// bookmark（书签记录）  
{  
  "bookmark_title": "量子隧穿效应",  
  "bookmark_description": "你在探索表面张力时提到了这个话题"  
}  
```

---

### 2.3 知识图谱 API

```javascript
GET /api/knowledge/graph?topic_id=    获取完整图谱  
GET /api/knowledge/nodes/{node_id}    获取节点详情  
```

#### GET /api/knowledge/graph

```json
Response:  
{  
  "nodes": [  
    {  
      "id": "uuid",  
      "label": "表面张力",  
      "description": "液体表面分子受到向内合力...",  
      "mastery_level": "UNDERSTOOD",  
      "position": {"x": 100, "y": 200}  
    }  
  ],  
  "edges": [  
    {  
      "id": "uuid",  
      "source": "node_uuid_1",  
      "target": "node_uuid_2",  
      "relation": "是...的基础"  
    }  
  ]  
}  
```

#### GET /api/knowledge/nodes/{node_id}

```json
Response:  
{  
  "id": "uuid",  
  "label": "表面张力",  
  "description": "...",  
  "mastery_level": "UNDERSTOOD",  
  "related_messages": [  
    {  
      "conversation_id": "uuid",  
      "conversation_title": "表面张力是怎么形成的",  
      "message_excerpt": "表面张力是液体表面分子..."  
    }  
  ]  
}  
```

---

### 2.4 书签 API（后台使用，MVP 前端暂不直接调用）

```javascript
GET   /api/bookmarks?topic_id=         获取主题书签列表  
PATCH /api/bookmarks/{id}              更新书签状态  
```

---

## 三、核心服务实现

### 3.1 LLM 服务 `llm_service.py`

```python
class LLMService:  

    def __init__(self):  
        """  
        使用 LangChain ChatOpenAI，指向 MiniMax endpoint  
        base_url = "https://api.minimax.chat/v1"  
        model = "abab6.5s-chat"（或当前 MiniMax 最新模型）  
        """  

    async def chat_stream(  
        self,  
        conversation_id: str,  
        topic_id: str,  
        topic_title: str,  
        user_message: str,  
        conversation_history: list,   # 最近 20 条  
        conversation_state: dict  
    ):  
        """  
        完整流程：  

        Step 1：构造 Prompt，调用 LLM  
          - 使用 MAIN_SYSTEM_PROMPT 模板  
          - 注入 topic、状态、对话历史  
          - 要求 LLM 返回结构化 JSON  

        Step 2：解析 LLM 响应  
          - answer 字段 → 流式 yield content 事件  
          - knowledge_extraction → 传给 graph_service  
          - intervention → 若 should_intervene=true，yield intervention 事件  
          - observation → 更新 conversation_state  

        Step 3：后处理（回答流式结束后）  
          a. graph_service.update_graph(topic_id, knowledge_extraction)  
          b. 更新 conversation_states 表  
          c. 如果是 bookmark 介入，写入 bookmarks 表  
          d. yield node_hint 事件（新增或升级的节点）  
          e. yield graph_update 事件  
          f. 如果是第一条消息，异步生成标题并更新 conversations 表  
          g. yield done 事件  

        错误处理：  
          LLM 返回 JSON 解析失败 →  
            退化为纯文本模式，只 yield content，跳过后处理  
            记录错误日志  
        """  

    async def generate_title(self, first_message: str) -> str:  
        """  
        根据第一条消息生成对话标题  
        要求：10字以内，中文，直接输出无引号  
        """  
```

### 3.2 图谱服务 `graph_service.py`

```python
class GraphService:  

    async def update_graph(self, topic_id: str, extracted_data: dict):  
        """  
        extracted_data 格式：  
        {  
          "new_nodes": [{"label": "表面张力", "description": "..."}],  
          "new_edges": [  
            {"source_label": "分子引力", "target_label": "表面张力", "relation": "导致"}  
          ],  
          "nodes_to_update": [  
            {"label": "表面张力", "mastery_level": "UNDERSTOOD"}  
          ]  
        }  

        处理逻辑：  
        1. new_nodes：按 label 查找，精确匹配 → 跳过；不存在 → 插入  
           坐标分配：网格布局，每行 5 个，间距 150px，从 (100, 100) 开始  
        2. new_edges：查找两端节点 id，都存在则插入，否则跳过  
           重复边检测：source+target 组合已存在则跳过  
        3. nodes_to_update：更新 mastery_level，遵循只升不降原则  
        """  

    async def get_graph(self, topic_id: str) -> dict:  
        """返回完整图谱数据（nodes + edges）"""  

    def _assign_position(self, existing_count: int) -> tuple[float, float]:  
        """  
        网格布局坐标计算  
        col = existing_count % 5  
        row = existing_count // 5  
        x = 100 + col * 150  
        y = 100 + row * 150  
        """  
```

### 3.3 掌握度服务 `mastery_service.py`

```python
class MasteryService:  

    LEVEL_ORDER = ['UNAWARE', 'EXPOSED', 'UNDERSTOOD']  

    def infer_level(self, current_level: str, signal: str) -> str:  
        """  
        signal → target_level 映射：  
          asking_basic  → EXPOSED  
          asking_why    → UNDERSTOOD  
          applying      → UNDERSTOOD  
          explaining    → UNDERSTOOD  

        只升不降：  
          target_index = LEVEL_ORDER.index(target)  
          current_index = LEVEL_ORDER.index(current)  
          return LEVEL_ORDER[max(target_index, current_index)]  
        """  
```

---

## 四、Prompt 设计

### 4.1 主 Prompt

```python
MAIN_SYSTEM_PROMPT = """  
你是 CurioSync，一个引导学习的 AI 伙伴。  
你不只是回答问题——你在帮助用户真正理解知识，同时在后台追踪学习状态。  

## 当前上下文  

主题：{topic_title}  
主题描述：{topic_description}  
对话轮次：{turn_count}  
话题链（最近探索的话题，按时间顺序）：{topic_chain}  
当前发散程度：{divergence_score}（0-1，越高表示话题越分散）  
上次介入类型：{last_intervention}（none 表示尚未介入）  

## 输出格式要求  

你必须严格按照以下 JSON 格式输出，不要输出任何 JSON 以外的内容：  

```json  
{  
  "answer": "对用户问题的完整回答。要有教学引导感，适当用类比和例子，适当引发思考。中文。长度适中。",  

  "observation": {  
    "new_topic": "本轮对话引入的核心新话题（一个词或短语，没有则填 null）",  
    "divergence_delta": 0.05,  
    "mastery_signal": "asking_basic | asking_why | applying | explaining",  
    "mastery_topic": "本轮判断掌握度所针对的知识点名称"  
  },  

  "knowledge_extraction": {  
    "new_nodes": [  
      {"label": "知识点名称（4-8字）", "description": "一句话描述这个概念"}  
    ],  
    "new_edges": [  
      {  
        "source_label": "知识点A",  
        "target_label": "知识点B",  
        "relation": "关系描述（如：是...的基础、导致、包含）"  
      }  
    ],  
    "nodes_to_update": [  
      {"label": "知识点名称", "mastery_level": "EXPOSED | UNDERSTOOD"}  
    ]  
  },  

  "intervention": {  
    "should_intervene": false,  
    "type": "none | converge | transition | bookmark",  
    "content": {}  
  }  
}  
```

## 介入判断规则

### 不介入时

{ "should_intervene": false, "type": "none", "content": {} }

### converge（收敛聚焦）

触发条件（满足其一）：

- turn_count &gt;= 8 且 divergence_score &gt; 0.6
- turn_count &gt;= 12 且 divergence_score &gt; 0.4
- topic_chain 中不同话题数量 &gt; 6

content 格式：\
{\
"summary": "到目前为止，我们聊到了...（2-3句话的小结）",\
"options": \["继续探索", "整理一下"\]\
}

### transition（阶段跃迁）

触发条件（同时满足）：

- 同一话题连续探讨 &gt;= 3 轮
- 用户提问方式从"是什么"转向延伸性的"那...呢"
- divergence_delta &lt; 0.15（话题聚焦）
- 距离上次介入 &gt;= 5 轮

content 格式：\
{\
"stage_summary": "关于\[当前话题\]，你已经理解了...（一句话）",\
"next_directions": \[\
{"label": "方向名称", "description": "一句话说明为什么值得探索"},\
{"label": "方向名称", "description": "一句话说明为什么值得探索"}\
\]\
}

### bookmark（书签记录）

触发条件：

- 用户表达出对某个话题的兴趣（含"好奇""想了解""以后""这个"等表述）
- 且该话题预计与主线偏离较大（divergence_delta &gt; 0.3）

content 格式：\
{\
"bookmark_title": "书签标题（5-10字）",\
"bookmark_description": "为什么记录这个（一句话）"\
}

## 回答质量要求

- 教学引导感：不只给答案，适当引发用户思考
- 类比优先：用生活中的例子让抽象概念具体化
- 长度克制：不要超过 300 字
- 语言：中文\
  """

```javascript

### 4.2 对话标题生成 Prompt  

```python  
TITLE_GENERATION_PROMPT = """  
根据以下用户消息，生成一个对话标题。  
要求：10字以内，中文，直接输出标题本身，不加任何标点或引号。  

用户消息：{first_message}  
"""  
```

---

## 五、前端页面设计

### 5.1 页面路由

```javascript
/                       主页（主题列表）  
/topic/[topicId]        主题页面（核心页面）  
```

---

### 5.2 主页 `/`

**布局**

```javascript
┌──────────────────────────────────────────────────────────┐  
│  CurioSync                                  [+ 新建主题]  │  
├──────────────────────────────────────────────────────────┤  
│                                                          │  
│  ┌────────────────┐  ┌────────────────┐  ┌────────────┐  │  
│  │  分子间作用力   │  │   唐朝历史      │  │  Python   │  │  
│  │                │  │                │  │  基础语法  │  │  
│  │  ◈ 12 个知识点 │  │  ◈ 8 个知识点  │  │           │  │  
│  │  💬 3 个对话   │  │  💬 1 个对话   │  │  ◈ 5 个   │  │  
│  │                │  │                │  │  💬 1 个   │  │  
│  │  2 天前        │  │  5 天前        │  │  今天      │  │  
│  └────────────────┘  └────────────────┘  └────────────┘  │  
└──────────────────────────────────────────────────────────┘  
```

**交互细节**

```javascript
新建主题：  
  点击 [+ 新建主题] → 弹出 Modal  
  Modal 内容：  
    输入框：主题名称（必填，placeholder: "比如：量子力学入门"）  
    输入框：简单描述（选填，placeholder: "你想了解什么？"）  
    [取消] [创建]  
  创建后直接跳转到 /topic/[newTopicId]，并自动创建第一个对话  

主题卡片：  
  点击卡片 → 进入 /topic/[topicId]  
  Hover 时右上角出现 [···] 菜单图标  
  点击菜单 → 选项：重命名 / 删除  
  删除时弹出二次确认  

空状态：  
  没有主题时，显示引导文案：  
  "开始你的第一个学习主题"  
  [+ 新建主题] 按钮居中显示  
```

---

### 5.3 主题页面 `/topic/[topicId]`

**整体布局**

```javascript
┌────────────────────────────────────────────────────────────┐  
│  [≡]  分子间作用力                                          │  ← 顶部栏  
├──────────────┬─────────────────────────────────────────────┤  
│              │                                             │  
│   左侧导航   │   内容区（对话视图 或 图谱视图）               │  
│   220px      │   全宽，无分栏                               │  
│   可收起     │                                             │  
│   至 48px    │                                             │  
│              │                                             │  
└──────────────┴─────────────────────────────────────────────┘  
```

**顶部栏**

```javascript
┌──────────────────────────────────────────────────────────┐  
│  [≡]  分子间作用力                                        │  
└──────────────────────────────────────────────────────────┘  

[≡] 按钮：点击展开/收起左侧导航  
主题名称：文字，点击可编辑（inline edit）  
← 左上角隐藏"返回主页"：仅在顶部栏 hover 时显示，或通过 [≡] 菜单访问  
```

---

### 5.4 左侧导航栏

**展开状态（220px）**

```javascript
┌────────────────────────────┐  
│  [≡]  分子间作用力          │  ← 顶部（含主题名）  
├────────────────────────────┤  
│                            │  
│  ◈ 知识图谱                │  ← 固定入口，点击切换到图谱视图  
│                            │  
├────────────────────────────┤  
│  对话                      │  ← 分区标题  
│                            │  
│  · 表面张力是怎么形成的    │  ← 当前选中（高亮背景）  
│  · 毛细现象的原理          │  
│  · 分子间作用力            │  
│                            │  
│  [+ 新建对话]              │  ← 固定在列表底部  
│                            │  
├────────────────────────────┤  
│  ← 返回主页                │  ← 固定在侧边栏最底部  
└────────────────────────────┘  
```

**收起状态（48px，只显示图标）**

```javascript
┌──────┐  
│  [≡] │  
├──────┤  
│  ◈   │  ← 图谱图标，hover 显示 tooltip "知识图谱"  
├──────┤  
│  💬  │  ← 对话图标，hover 显示 tooltip "对话列表"  
│  💬  │     收起时展示前 3 个对话的图标（颜色区分当前选中）  
│  💬  │  
├──────┤  
│  ←   │  ← 返回主页  
└──────┘  
```

**交互细节**

```javascript
知识图谱入口：  
  点击 → 内容区切换到图谱视图  
  当前在图谱视图时，该条目高亮  

对话列表：  
  点击某条对话 → 内容区切换到该对话的聊天视图  
  当前选中对话高亮显示  
  每条对话最多显示 12 个字，超出省略号  
  Hover 时右侧显示 [···] 菜单：重命名 / 删除  

新建对话：  
  点击 [+ 新建对话]  
  立即创建新对话（title 初始为"新对话"）  
  自动切换到该对话的聊天视图  
  侧边栏对话列表更新  

对话删除：  
  弹出二次确认："删除后对话内容将无法恢复"  
  删除后：  
    如果删除的是当前对话 → 自动切换到列表第一条  
    如果列表为空 → 自动创建新对话  

导航栏收起/展开：  
  点击 [≡] 切换  
  动画：宽度从 220px → 48px，duration 200ms，ease-in-out  
  状态保存到 localStorage  
```

---

### 5.5 内容区：对话视图

```javascript
┌───────────────────────────────────────────────────────┐  
│                                                       │  
│   消息列表区域（可滚动）                               │  
│   ───────────────────────────────────────────────     │  
│                                                       │  
│                        用户消息气泡 →                  │  
│                                                       │  
│   ← AI 回答气泡                                        │  
│                                                       │  
│   ← [介入卡片]（如果有）                               │  
│                                                       │  
│   [节点提示 Toast]（轻触式，3秒消失）                  │  
│                                                       │  
│   ───────────────────────────────────────────────     │  
│   输入框区域（固定在底部）                              │  
│   [输入框 placeholder: 问点什么吧...]     [↑ 发送]     │  
└───────────────────────────────────────────────────────┘  
```

#### 消息气泡

```javascript
用户消息：  
  右对齐，最大宽度 70%  
  圆角矩形（border-radius: 18px 18px 4px 18px）  
  背景色：主题色（深蓝 #1a56db 或自定义）  
  文字：白色  

AI 回答：  
  左对齐，最大宽度 80%  
  圆角矩形（border-radius: 18px 18px 18px 4px）  
  背景色：浅灰（#f3f4f6）  
  文字：深色（#111827）  
  支持 Markdown 渲染（粗体、代码块、列表、引用）  
  流式输出时末尾显示光标（▌，200ms 闪烁）  

消息间距：user-to-ai 间距 8px，轮次间距 24px  
```

#### 节点提示 Toast（轻触式进度反馈）

```javascript
位置：对话区底部，输入框上方  
触发：每轮 AI 回答结束后，如果有新节点或掌握度升级  

样式：  
┌─────────────────────────────────────────┐  
│  ✦ 新概念：表面张力  ↑ 深化：分子引力   │  
└─────────────────────────────────────────┘  

细节：  
  小胶囊样式，半透明深色背景，白色文字，小字号  
  最多显示 3 个节点（新增优先，升级次之）  
  3秒后自动消失，可点击 × 提前关闭  
  点击节点名称 → 切换到图谱视图并高亮该节点  

节点符号说明：  
  ✦ = 新增节点  
  ↑ = 掌握度提升  
```

#### 输入框

```javascript
样式：  
  固定在底部，有上方阴影分隔  
  多行文本框，最小 1 行，最大 5 行（自动扩展）  
  placeholder: "问点什么吧..."  
  右侧发送按钮：圆形，箭头图标  

交互：  
  Enter 发送，Shift+Enter 换行  
  发送后输入框清空  
  AI 回答中：输入框 disabled，发送按钮变为 loading 状态  
  AI 回答结束：恢复可用，自动聚焦输入框  

空状态（新对话，无消息）：  
  消息区显示引导文案：  
  "你好！这是关于[分子间作用力]的对话"  
  "从任何一个你好奇的问题开始吧 ✦"  
```

---

### 5.6 介入卡片

**收敛聚焦卡片（converge）**

```javascript
┌──────────────────────────────────────────────────────┐  
│ 💡 我们已经探索了不少内容                              │  
│                                                      │  
│  我们聊到了表面张力的形成原理、分子间作用力，         │  
│  以及它和毛细现象之间的关系。                         │  
│                                                      │  
│  [继续探索]              [整理一下]                   │  
└──────────────────────────────────────────────────────┘  

样式：  
  背景：浅琥珀色（#fffbeb）  
  左边框：3px 实线，琥珀色（#f59e0b）  
  最大宽度 85%，左对齐  

交互：  
  [继续探索] → 卡片收起（高度折叠动画），对话继续  
  [整理一下] → 调用整理 API，生成当前话题小结  
               以一条 AI 消息插入对话流  
               然后卡片收起  
```

**阶段跃迁卡片（transition）**

```javascript
┌──────────────────────────────────────────────────────┐  
│ 🔀 关于表面张力，聊得很深入了                          │  
│    你对它的形成原理已经有了清晰的理解                   │  
│                                                      │  
│  接下来想去哪里？                                      │  
│                                                      │  
│  ┌──────────────────┐   ┌──────────────────┐         │  
│  │  毛细现象         │   │  亲水与疏水       │         │  
│  │  和表面张力直接相关│   │  换个角度看问题   │         │  
│  └──────────────────┘   └──────────────────┘         │  
│                                                      │  
│                          [继续聊表面张力]              │  
└──────────────────────────────────────────────────────┘  

样式：  
  背景：浅蓝色（#eff6ff）  
  左边框：3px 实线，蓝色（#3b82f6）  

交互：  
  方向卡片点击 → 自动在输入框填入"我想了解[方向名称]"并发送  
  [继续聊表面张力] → 卡片收起  
```

**书签提示 Toast（bookmark，极简）**

```javascript
样式：右下角浮动 Toast，不插入对话流  

┌───────────────────────────────────────┐  
│  🔖 已记录：量子隧穿效应               │  
└───────────────────────────────────────┘  

细节：  
  背景：浅绿色（#f0fdf4）  
  边框：绿色（#22c55e）  
  出现在右下角，3秒后自动消失  
  不阻断对话，不需要用户操作  
  MVP 阶段：无"查看书签"入口  
```

---

### 5.7 内容区：知识图谱视图

**整体结构**

```javascript
┌───────────────────────────────────────────────────────┐  
│  知识图谱  ·  分子间作用力          [重置视角]  [← 返回对话] │  
├───────────────────────────────────────────────────────┤  
│                                                       │  
│         React Flow 全屏画布                            │  
│                                                       │  
│         ○ 分子引力                                     │  
│              ↓ 导致                                    │  
│         ● 表面张力 ──→ ◑ 毛细现象                      │  
│              ↓                                         │  
│         ◑ 表面能                                       │  
│                                                       │  
├───────────────────────────────────────────────────────┤  
│  ● 已理解   ◑ 有印象   ○ 接触过        共 12 个知识点  │  ← 图例 + 统计  
└───────────────────────────────────────────────────────┘  
```

**顶部栏**

```javascript
左侧："知识图谱 · 分子间作用力"（面包屑形式）  
右侧：[重置视角] 按钮 + [← 返回对话] 按钮  

[← 返回对话]：点击后内容区切换回上次查看的对话视图  
```

**节点样式**

```javascript
UNAWARE（接触过）：  
  圆形，直径 40px  
  填充：白色  
  边框：2px，灰色（#d1d5db）  
  文字：灰色（#6b7280），12px  

EXPOSED（有印象）：  
  圆形，直径 44px  
  填充：浅蓝（#dbeafe）  
  边框：2px，蓝色（#93c5fd）  
  文字：蓝色（#1d4ed8），12px  

UNDERSTOOD（已理解）：  
  圆形，直径 50px  
  填充：蓝色（#3b82f6）  
  边框：2px，深蓝（#1d4ed8）  
  文字：白色，12px，加粗  

节点文字：最多 6 个汉字，超出省略  
Hover：显示 tooltip，内容为完整 label + description  
```

**边（连线）样式**

```javascript
线型：带箭头的实线  
颜色：灰色（#9ca3af）  
粗细：1.5px  
Hover：线变蓝，显示 relation tooltip  
```

**画布交互**

```javascript
缩放：鼠标滚轮  
平移：拖拽空白区域  
[重置视角]：fitView，将所有节点居中显示  

节点点击：  
  右侧弹出节点详情面板（从右侧滑入，宽 280px）  

节点数量 > 20：  
  自动启用 React Flow MiniMap（右下角）  

节点数量 > 50：  
  默认只显示 EXPOSED 和 UNDERSTOOD 节点  
  底部显示 "还有 X 个未接触的节点 [显示全部]"  
```

**节点详情面板**

```javascript
┌─────────────────────────────────────────────┐  
│  表面张力                              [×]   │  
│                                             │  
│  ● 已理解                                    │  
│                                             │  
│  液体表面分子受到向内合力，使液面自动         │  
│  收缩，产生类似弹性膜的效果。                 │  
│                                             │  
│  ────────────────────────────────           │  
│  相关对话                                    │  
│                                             │  
│  › 表面张力是怎么形成的                       │  
│    "液体表面分子所受合力..."                  │  
│    [打开这个对话]                             │  
│                                             │  
│  › 为什么水黾能在水面行走                     │  
│    "这正是表面张力的体现..."                  │  
│    [打开这个对话]                             │  
└─────────────────────────────────────────────┘  

[打开这个对话] → 关闭面板，切换到该对话视图（侧边栏高亮对应对话）  
```

---

## 六、流式输出处理（前端实现）

```typescript
// frontend/lib/api.ts  

interface StreamCallbacks {  
  onContent: (text: string) => void  
  onNodeHint: (nodes: NodeHint[]) => void  
  onIntervention: (data: InterventionData) => void  
  onGraphUpdate: (data: GraphUpdateData) => void  
  onDone: (data: { messageId: string; titleUpdated: boolean }) => void  
  onError: (error: Error) => void  
}  

async function sendMessage(  
  conversationId: string,  
  topicId: string,  
  content: string,  
  callbacks: StreamCallbacks  
): Promise<void> {  
  const response = await fetch(  
    `/api/conversations/${conversationId}/chat`,  
    {  
      method: 'POST',  
      headers: { 'Content-Type': 'application/json' },  
      body: JSON.stringify({ content, topic_id: topicId })  
    }  
  )  

  if (!response.ok) {  
    callbacks.onError(new Error('请求失败'))  
    return  
  }  

  const reader = response.body!.getReader()  
  const decoder = new TextDecoder()  
  let currentEvent = ''  

  while (true) {  
    const { done, value } = await reader.read()  
    if (done) break  

    const chunk = decoder.decode(value, { stream: true })  
    const lines = chunk.split('\n')  

    for (const line of lines) {  
      if (line.startsWith('event: ')) {  
        currentEvent = line.slice(7).trim()  
      } else if (line.startsWith('data: ')) {  
        try {  
          const data = JSON.parse(line.slice(6))  
          switch (currentEvent) {  
            case 'content':  
              callbacks.onContent(data.text)  
              break  
            case 'node_hint':  
              callbacks.onNodeHint(data.new_nodes)  
              break  
            case 'intervention':  
              callbacks.onIntervention(data)  
              break  
            case 'graph_update':  
              callbacks.onGraphUpdate(data)  
              break  
            case 'done':  
              callbacks.onDone(data)  
              break  
          }  
        } catch (e) {  
          // JSON 解析失败，忽略该条数据  
        }  
      }  
    }  
  }  
}  
```

---

## 七、环境变量

```bash
# backend/.env  

MINIMAX_API_KEY=your_key  
MINIMAX_GROUP_ID=your_group_id  
MINIMAX_BASE_URL=https://api.minimax.chat/v1  
MINIMAX_MODEL=abab6.5s-chat  

SUPABASE_URL=your_supabase_url  
SUPABASE_KEY=your_supabase_anon_key  

ENVIRONMENT=development  
CORS_ORIGINS=http://localhost:3000  
```

```bash
# frontend/.env.local  

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000  
```

---

## 八、本地启动

```bash
# 后端  
cd backend  
pip install -r requirements.txt  
uvicorn main:app --reload --port 8000  

# 前端  
cd frontend  
npm install  
npm run dev  
# → http://localhost:3000  
```

```javascript
# requirements.txt  
fastapi  
uvicorn[standard]  
langchain  
langchain-openai  
supabase  
python-dotenv  
pydantic  
sse-starlette  
python-multipart  
```

---

## 九、开发顺序

### Phase 1｜核心链路跑通

```javascript
后端：  
  ✅ Supabase 建表（按第一章 SQL 执行）  
  ✅ topics CRUD API  
  ✅ conversations 创建 + 消息历史 API  
  ✅ LLM 调用（纯回答，暂不含结构化输出）  
  ✅ SSE 流式响应  

前端：  
  ✅ 主页主题列表 + 新建主题 Modal  
  ✅ 主题页面框架（左侧导航 + 内容区）  
  ✅ 左侧导航展开/收起  
  ✅ 对话视图：消息显示 + 流式渲染  
  ✅ 输入框 + 发送  
```

### Phase 2｜结构化输出 + 知识图谱

```javascript
后端：  
  ✅ Prompt 升级为结构化 JSON 输出  
  ✅ graph_service（节点提取 + 去重 + 坐标分配）  
  ✅ 知识图谱 API  
  ✅ node_hint + graph_update SSE 事件  

前端：  
  ✅ 知识图谱视图（React Flow 基础渲染）  
  ✅ 自定义节点（三种掌握度样式）  
  ✅ 节点详情面板  
  ✅ 节点提示 Toast（对话底部）  
  ✅ 左侧导航图谱入口 + 视图切换  
```

### Phase 3｜介入卡片

```javascript
后端：  
  ✅ conversation_states 更新逻辑  
  ✅ 介入判断逻辑（三种触发规则）  
  ✅ bookmarks 写入（书签介入时）  
  ✅ intervention SSE 事件  

前端：  
  ✅ ConvergeCard 组件  
  ✅ TransitionCard 组件（方向卡片点击 → 自动发送）  
  ✅ BookmarkToast 组件（右下角）  
```

### Phase 4｜体验打磨

```javascript
  ✅ 对话标题自动生成（第一条消息后异步更新）  
  ✅ 图谱节点出现动画  
  ✅ 左侧导航收起/展开动画  
  ✅ 空状态设计（新对话引导文案、空图谱提示）  
  ✅ 错误处理（网络断开、LLM 失败的降级展示）  
  ✅ 响应式（最小支持 1024px 宽度的平板）  
```

---

## 十、边界条件处理

```javascript
1. LLM 返回 JSON 解析失败  
   → 降级：只输出 answer 文字，跳过图谱更新和介入  
   → 后端日志记录原始输出  

2. 知识节点重复  
   → label 精确匹配：跳过  
   → label 相似度 > 0.85（用 difflib）：视为相同节点，跳过  

3. 对话历史超 Token 限制  
   → 保留最新 20 条（10轮）消息作为上下文  
   → system prompt 固定，不裁剪  

4. 流式中断（网络问题）  
   → 前端检测 reader 异常 → 调用 onError  
   → 显示"回答中断，点击重试"  
   → 已渲染的部分文字保留  

5. 知识图谱节点过多（> 50）  
   → 默认只渲染 EXPOSED + UNDERSTOOD  
   → 底部提示 + [显示全部] 切换  

6. 图谱视图无节点  
   → 显示空状态："开始对话后，知识图谱会在这里自动生长 ✦"  

7. 删除对话后列表为空  
   → 自动创建一个新对话，保持页面可用  
```

---

*文档版本 v2.0 | CurioSync MVP 开发规格*\
*对应产品思考文档 v0.1*\