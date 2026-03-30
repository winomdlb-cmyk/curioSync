# CurioSync

> AI Learning Partner - 好奇心与知识结构同步生长

## 项目概述

CurioSync 是一个以对话为载体、以好奇心为驱动、能够自动沉淀学习成果的 AI 学习伙伴。核心目标是让用户在自由探索的过程中，悄悄地建立知识结构。

## 技术栈

- **前端**: Next.js 14 (App Router) + TailwindCSS + React Flow
- **后端**: FastAPI (Python 3.11+) + LangChain
- **数据库**: Supabase (PostgreSQL + pgvector)
- **LLM**: MiniMax API (MiniMax-M2.7-highspeed)
- **部署**: 本地开发 → Vercel (前端) + Railway (后端)

## 项目结构

```
curiosync/
├── frontend/                    # Next.js 前端
│   ├── app/                    # App Router 页面
│   │   ├── page.tsx            # 主页（主题列表）
│   │   └── topic/[topicId]/    # 主题页面
│   ├── components/              # React 组件
│   │   ├── Chat/              # 对话相关组件
│   │   ├── KnowledgeMap/       # 知识图谱组件
│   │   └── Sidebar/          # 侧边栏组件
│   └── lib/
│       ├── api.ts              # API 调用封装
│       └── types.ts            # TypeScript 类型定义
│
├── backend/                    # FastAPI 后端
│   ├── routers/                # API 路由
│   ├── services/               # 业务服务
│   │   ├── llm_service.py     # LLM 调用服务
│   │   ├── graph_service.py    # 知识图谱服务
│   │   └── mastery_service.py # 掌握度服务
│   ├── models/schemas.py      # Pydantic 模型
│   └── prompts/templates.py    # Prompt 模板
│
├── docs/                      # 项目文档
│   ├── concept/               # 产品概念文档
│   └── specs/                # 开发规格文档
│
└── .claude/                  # Claude Code 配置
    └── agents/                # Agent 配置文件
```

## 数据库

使用 Supabase，表格：
- `topics` - 主题
- `conversations` - 对话
- `messages` - 消息
- `knowledge_nodes` - 知识节点
- `knowledge_edges` - 知识边
- `bookmarks` - 兴趣书签
- `conversation_states` - 对话状态

## 核心功能

### MVP 已实现
- [x] 主题 CRUD
- [x] 对话管理（多对话）
- [x] SSE 流式对话
- [x] 知识图谱自动生长
- [x] 知识图谱可视化（React Flow）
- [x] 掌握度推断（3档：UNAWARE/EXPOSED/UNDERSTOOD）
- [x] 推理内容过滤（过滤 LLM 思考过程）
- [x] UUID 验证
- [x] 标题长度验证

### Phase 2-4 待开发
- [x] 收敛聚焦介入卡片
- [x] 阶段跃迁介入卡片
- [x] 书签提示 Toast
- [x] 转义字符处理 (\\n → 换行)
- [x] AI 生成中状态指示器
- [x] 图谱节点出现动画
- [x] 错误处理降级
- [x] 空状态设计
- [ ] 对话标题自动生成（后端已实现，前端刷新已就绪）
- [ ] 响应式（最小 1024px）

## 环境变量

### backend/.env
```
MINIMAX_API_KEY=your_key
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2.7-highspeed
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
CORS_ORIGINS=http://localhost:3000
```

### frontend/.env.local
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 启动方式

```bash
# 后端
cd backend && python3 -m uvicorn main:app --reload --port 8000

# 前端
cd frontend && npm run dev
```

## Agent 分工

参见 `.claude/agents/` 目录下的 Agent 配置文件。

## Claude (主协调者) 角色

我作为项目的主要协调者（Tech Lead），负责：

1. **任务分解**：将用户需求拆分为具体的子任务
2. **Agent 调度**：根据任务类型，启动对应的 sub-agent 执行
3. **质量把控**：审查 sub-agent 输出，确保符合整体架构
4. **进度追踪**：在 CLAUDE.md 中维护 MVP 进度

### 协作模式

```
用户 → Claude (协调者) → frontend-agent (前端任务)
                      → backend-agent (后端任务)
                      → prompt-agent (Prompt 优化)
                      → test-agent (测试)
                      → ux-polish-agent (体验打磨)
```

### Agent 调用原则

- **独立任务**：可并行调用多个 agent 同时工作
- **依赖任务**：先完成的任务返回后，再调度下一个
- **质量优先**：agent 输出必须经过我审查才能合并

## 开发原则

1. **规格驱动**: 先更新规格文档，再进行代码实现
2. **增量开发**: 小步快跑，每次 PR 聚焦单一功能
3. **前后端分离**: API 优先设计，前端只是 API 的客户端
4. **性能意识**: 避免 N+1 查询，使用批量查询
