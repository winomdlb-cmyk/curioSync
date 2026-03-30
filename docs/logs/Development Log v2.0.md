# CurioSync 开发日志 v2.0

> 本文档记录 CurioSync MVP v2.0 的开发过程
> 最后更新：2026-03-30

---

## 项目目录结构

```
curiosync/
├── CLAUDE.md                          # 项目根配置
├── backend/
│   ├── main.py                        # FastAPI 入口
│   ├── database.py                    # Supabase 连接
│   ├── models/
│   │   └── schemas.py                 # Pydantic 模型
│   ├── prompts/
│   │   └── templates.py              # Prompt 模板
│   ├── routers/
│   │   ├── conversations.py          # 对话 API (SSE 流式)
│   │   ├── knowledge.py              # 知识图谱 API
│   │   └── topics.py                 # 主题 API
│   └── services/
│       ├── bookmark_service.py        # 书签服务
│       ├── graph_service.py           # 知识图谱服务
│       ├── llm_service.py             # LLM 调用服务
│       └── mastery_service.py         # 掌握度服务
├── frontend/
│   ├── app/
│   │   ├── globals.css               # 全局样式
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 主页（主题列表）
│   │   └── topic/[topicId]/
│   │       └── page.tsx              # 主题页面
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatView.tsx         # 对话视图
│   │   │   ├── InputBar.tsx         # 输入框
│   │   │   └── MessageBubble.tsx     # 消息气泡
│   │   ├── Intervention/
│   │   │   ├── BookmarkToast.tsx     # 书签提示
│   │   │   ├── ConvergeCard.tsx     # 收敛卡片
│   │   │   └── TransitionCard.tsx   # 跃迁卡片
│   │   └── KnowledgeMap/
│   │       ├── CustomNode.tsx        # 自定义节点
│   │       └── KnowledgeMapView.tsx # 图谱视图
│   ├── lib/
│   │   ├── api.ts                   # API 调用封装
│   │   └── types.ts                  # TypeScript 类型
│   └── tests/
│       ├── e2e.spec.ts              # E2E 测试
│       └── TEST_REPORT.md            # 测试报告
├── docs/
│   ├── concept/
│   │   └── CurioSync Concept v0.1.md
│   ├── logs/
│   │   └── Development Log v2.0.md  # 本文档
│   └── specs/
│       └── CurioSync MVP Development Document v2.0.md
└── .claude/
    └── agents/
        ├── backend-agent.md
        ├── frontend-agent.md
        ├── prompt-agent.md
        ├── test-agent.md
        └── ux-polish-agent.md
```

---

## 开发阶段总结

### Phase 1｜核心链路 ✅

**时间**：2026-03-29

**完成内容**：
1. 项目初始化
   - 后端：FastAPI + LangChain + Supabase
   - 前端：Next.js 14 + TailwindCSS + React Flow
   - 数据库：Supabase PostgreSQL 建表

2. 后端 API
   - Topics API（CRUD + UUID 验证）
   - Conversations API（CRUD + 批量查询优化）
   - Chat API（SSE 流式）
   - Knowledge API（图谱查询）
   - Bookmark Service（新建）

3. 前端页面
   - 主页（主题列表 + 新建 Modal）
   - 主题页面（侧边栏 + 对话/图谱视图）
   - ChatView、MessageBubble、InputBar 组件
   - KnowledgeMapView、GraphCanvas、CustomNode 组件

4. 优化
   - N+1 查询修复（批量 IN 查询）
   - UUID 验证（无效 UUID 返回 404）
   - LLM 思考内容过滤（状态机过滤 `<think>...</think>`）
   - 标题验证（Pydantic field_validator）

---

### Phase 2｜结构化输出 + 知识图谱 ✅

**时间**：2026-03-29

**完成内容**：
1. Prompt 升级为结构化 JSON 输出
   - MAIN_SYSTEM_PROMPT 定义完整的 JSON 格式
   - observation、knowledge_extraction、intervention 字段

2. Graph Service
   - 节点提取、去重、坐标分配（网格布局）
   - 边关系创建
   - 掌握度更新（只升不降）

3. SSE 事件
   - `content` - 流式输出
   - `node_hint` - 节点提示
   - `knowledge_extraction` - 图谱更新
   - `intervention` - 介入卡片
   - `done` - 完成

4. 前端图谱
   - React Flow 画布
   - 三种掌握度样式（UNAWARE/EXPOSED/UNDERSTOOD）
   - 节点详情面板

---

### Phase 3｜介入卡片 ✅

**时间**：2026-03-29

**完成内容**：
1. 后端
   - conversation_states 更新逻辑
   - 三种介入触发规则（converge/transition/bookmark）
   - bookmarks 表写入
   - bookmark_service.py 新建

2. 前端组件
   - ConvergeCard（收敛聚焦卡片）
   - TransitionCard（阶段跃迁卡片，方向点击自动发送）
   - BookmarkToast（右下角浮动提示，5秒自动消失）

---

### Phase 4｜体验打磨 ✅ 基本完成

**时间**：2026-03-29 ~ 2026-03-30

**已完成**：
1. 侧边栏高度固定（`min-h-screen` → `h-screen overflow-hidden`）
2. 流式消息逻辑修复（AI 消息追加到同一气泡）
3. camelCase/snake_case 修复（`messageId` → `message_id`）
4. 转义字符处理（`\\n` → 换行，`<pre>` 标签）
5. AI 生成中状态指示器（跳动圆点 + "生成中"文字）
6. 输入框禁用时提示（"AI 正在思考中..."）
7. 图谱节点出现动画（scale 0 → 1，400ms）
8. 错误处理降级（加载失败显示错误 + 重试按钮）

**待完成**：
- 响应式布局测试（最小 1024px）
- 节点高亮 pulse 动画
- 边连接 draw line 动画
- 侧边栏状态保存 localStorage

---

## Bug 修复记录

| 日期 | 问题 | 修复方案 |
|------|------|---------|
| 2026-03-29 | 无效UUID返回500 | 添加 `is_valid_uuid()` 验证 |
| 2026-03-29 | LLM输出包含推理内容 | 状态机过滤 `<think>...</think>` |
| 2026-03-29 | 空标题被接受 | Pydantic `field_validator` |
| 2026-03-29 | N+1查询性能问题 | 批量 IN 查询 |
| 2026-03-30 | 侧边栏高度随内容增长 | `min-h-screen` → `h-screen` |
| 2026-03-30 | 流式消息创建多个气泡 | 修正条件判断 |
| 2026-03-30 | 前端期望camelCase后端发snake_case | 统一为 snake_case |

---

## E2E 测试记录

**测试文件**：`frontend/tests/e2e.spec.ts`

**测试结果**：11/11 通过

| 用例 | 场景 | 状态 |
|------|------|------|
| UT-01 | 打开首页 | ✅ |
| UT-02 | 创建主题 | ✅ |
| UT-03 | 发送消息 | ✅ |
| UT-04 | 切换对话 | ✅ |
| UT-05 | 删除对话 | ✅ |
| UT-06 | 切换视图 | ✅ |
| UT-07 | 知识图谱交互 | ✅ |
| UT-08 | 侧边栏收起/展开 | ✅ |
| UT-09 | 返回主页 | ✅ |
| UT-10 | 侧边栏高度固定 | ✅ |
| UT-11 | 流式消息验证 | ✅ |

---

## Multi-Agent 协作

**Agent 配置文件**：
- `.claude/agents/frontend-agent.md` - 前端开发
- `.claude/agents/backend-agent.md` - 后端开发
- `.claude/agents/prompt-agent.md` - Prompt 工程
- `.claude/agents/test-agent.md` - 测试
- `.claude/agents/ux-polish-agent.md` - 体验打磨

**协作模式**：
```
用户 → Claude (协调者) → frontend-agent
                      → backend-agent
                      → ux-polish-agent
```

---

## 技术栈使用情况

| 技术 | 用途 | 使用程度 |
|------|------|---------|
| FastAPI | 后端框架 | ✅ 完整使用 |
| LangChain | LLM 封装 | ⚠️ 仅用发起请求 |
| Supabase | 数据库 | ✅ 完整使用 |
| Next.js 14 | 前端框架 | ✅ 完整使用 |
| React Flow | 图谱可视化 | ✅ 完整使用 |
| TailwindCSS | 样式 | ✅ 完整使用 |

---

## LangChain 使用现状分析

### 已使用（最小功能）

**文件**：`backend/services/llm_service.py`

```python
from langchain_openai import ChatOpenAI

self.llm = ChatOpenAI(
    base_url=os.getenv("MINIMAX_BASE_URL"),
    model=os.getenv("MINIMAX_MODEL"),
    api_key=os.getenv("MINIMAX_API_KEY"),
    streaming=True,
)
```

**用途**：仅用 `ChatOpenAI` 封装 MiniMax API 的 HTTP 请求，用 `astream()` 发起流式调用。

---

### 未使用的 LangChain 能力

| 能力 | 说明 | 当前实现 |
|------|------|---------|
| **PromptTemplate** | 模板化管理 Prompt | ❌ 手动字符串拼接 |
| **JsonOutputParser** | 结构化 JSON 输出解析 | ❌ 手动正则解析 |
| **OutputParser** | 输出格式解析 | ❌ 手动 JSON.parse |
| **ConversationMemory** | 对话历史管理 | ❌ 手动传入 history 列表 |
| **LLMChain** | 链式调用（Prompt + LLM + Parser） | ❌ 未使用 |
| **RunnableSequence** | 组件串接 | ❌ 未使用 |
| **RAG** | 检索增强生成 | ❌ 未使用 |
| **Agent** | 自主代理 | ❌ 未使用 |

---

### 当前架构问题

1. **Prompt 管理**：硬编码在 `llm_service.py` 中，字符串拼接，容易出错
2. **输出解析**：手动用正则提取 JSON，`\n` 转义处理复杂
3. **对话历史**：每次传入完整的 messages 列表，没有抽象
4. **流式处理**：需要手动过滤 `<think>...</think>` 思考内容

---

### v3.0 LangChain 演进方向

```python
# 目标架构示例
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import JsonOutputParser
from langchain.memory import ConversationBufferMemory

# Prompt 模板化
prompt = PromptTemplate.from_template(MAIN_SYSTEM_PROMPT)

# 输出解析
parser = JsonOutputParser()

# 对话记忆
memory = ConversationBufferMemory(memory_key="chat_history")

# LLMChain
chain = LLMChain(llm=llm, prompt=prompt, output_parser=parser)
```

---

## 后续工作（v2.1 或 v3.0）

### v2.1 待完善
- [ ] 对话标题自动生成后更新 UI
- [ ] 图谱节点出现动画
- [ ] 错误处理降级
- [ ] 响应式布局测试

### v3.0 规划
- [x] ~~LangChain 完整能力（PromptTemplate、Memory、Chain）~~ v3.0 迭代时实现
- [ ] Prompt 优化 / Markdown 渲染
- [ ] RAG（知识检索增强）
- [ ] 多模态支持

---

*日志结束*
