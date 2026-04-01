# CurioSync  
> AI Learning Partner - 好奇心与知识结构同步生长  

## 项目概述  

CurioSync 是一个以对话为载体、以好奇心为驱动、能够自动沉淀学习成果的  
AI 学习伙伴。核心目标是让用户在自由探索的过程中，悄悄地建立知识结构。  

---  

## 技术栈  

- **前端**: Next.js 14 (App Router) + TailwindCSS + React Flow  
           + shadcn/ui（Dialog / DropdownMenu / Sonner）  
           + assistant-ui（对话 UI 原语层）  
- **后端**: FastAPI (Python 3.11+) + LangChain  
           （PromptTemplate / JsonOutputParser / ConversationBufferMemory）  
- **数据库**: Supabase (PostgreSQL + pgvector)  
- **LLM**: MiniMax API（MiniMax-M2.7-highspeed，支持 reasoning 输出）  
- **部署**: 本地开发 → Vercel（前端）+ Railway（后端）  

---  

## 项目结构  





curiosync/
├── frontend/ # Next.js 前端
│ ├── app/ # App Router 页面
│ │ ├── page.tsx # 主页（主题列表）
│ │ ├── topic/[topicId]/
│ │ │ └── page.tsx # 主题页面（含侧边栏逻辑）
│ │ │ # ⚠️ Sidebar 内联此文件，无独立组件
│ │ ├── layout.tsx
│ │ └── globals.css # 全局样式 + 设计 token
│ ├── components/
│ │ ├── ui/ # shadcn/ui 自动生成组件
│ │ │ ├── dialog.tsx
│ │ │ ├── dropdown-menu.tsx
│ │ │ └── sonner.tsx
│ │ ├── Chat/ # 对话相关组件
│ │ │ ├── ChatView.tsx
│ │ │ ├── MessageBubble.tsx
│ │ │ ├── InputBar.tsx
│ │ │ └── NodeToast.tsx
│ │ ├── KnowledgeMap/ # 知识图谱组件
│ │ │ ├── KnowledgeMapView.tsx
│ │ │ ├── GraphCanvas.tsx
│ │ │ ├── CustomNode.tsx
│ │ │ └── NodeDetailPanel.tsx
│ │ └── Intervention/ # 介入卡片组件
│ │ ├── ConvergeCard.tsx
│ │ ├── TransitionCard.tsx
│ │ └── BookmarkToast.tsx
│ ├── lib/
│ │ ├── api.ts # API 调用封装（含 SSE StreamCallbacks）
│ │ └── types.ts # TypeScript 类型定义
│ └── tests/
│ └── screenshots/v3/ # ux-polish-agent 视觉验收截图
│
├── backend/ # FastAPI 后端
│ ├── main.py
│ ├── database.py
│ ├── requirements.txt
│ ├── routers/ # API 路由
│ │ ├── topics.py
│ │ ├── conversations.py
│ │ └── knowledge.py
│ ├── services/ # 业务服务
│ │ ├── llm_service.py # LLM 调用服务（LangChain）
│ │ ├── graph_service.py # 知识图谱服务
│ │ ├── mastery_service.py # 掌握度服务
│ │ └── bookmark_service.py # 书签服务（v2.0 开发中新增，规格外）
│ ├── models/
│ │ └── schemas.py # Pydantic 模型
│ └── prompts/
│ └── templates.py # LangChain PromptTemplate
│
├── docs/ # 项目文档
│ ├── concept/ # 产品概念文档
│ ├── specs/ # 开发规格文档
│ └── test/ # 测试文档
│ ├── README.md # 测试方法论（含 Playwright 经验）
│ ├── 2.0 test.md # v2.0 测试历史
│ └── 3.0 test.md # v3.0 测试报告（按 Gate 分区）
│
└── .claude/ # Claude Code 配置
└── agents/ # Agent 配置文件



---  

## 数据库  

使用 Supabase，表格（v3.0 无变更）：  
- `topics` - 主题  
- `conversations` - 对话  
- `messages` - 消息  
- `knowledge_nodes` - 知识节点  
- `knowledge_edges` - 知识边  
- `bookmarks` - 兴趣书签  
- `conversation_states` - 对话状态  

---  

## 核心功能  

### MVP 已实现（v2.0 基线）  
- [x] 主题 CRUD  
- [x] 对话管理（多对话）  
- [x] SSE 流式对话  
- [x] 知识图谱自动生长  
- [x] 知识图谱可视化（React Flow）  
- [x] 掌握度推断（3档：UNAWARE / EXPOSED / UNDERSTOOD）  
- [x] 推理内容过滤（过滤 LLM 思考过程）  
- [x] UUID 验证  
- [x] 标题长度验证  
- [x] 收敛聚焦介入卡片  
- [x] 阶段跃迁介入卡片  
- [x] 书签提示 Toast  
- [x] 转义字符处理（\n → 换行）  
- [x] AI 生成中状态指示器  
- [x] 图谱节点出现动画  
- [x] 错误处理降级  
- [x] 空状态设计  
- [x] 对话标题自动生成  

### v3.0 升级中  
- [ ] shadcn/ui 替换手写组件（Phase 1A）  
- [ ] assistant-ui 替换 MessageBubble / InputBar（Phase 1A）  
- [ ] LangChain 完整能力接入（Phase 1B）  
- [ ] MiniMax M2.7 Reasoning SSE 事件拆分（Phase 2）  
- [ ] 视觉验收（Phase 3）  

### 不在 v3.0 范围  
- [ ] 响应式布局（最小 1024px）  
- [ ] RAG / 多模态 / 目标模式  

---  

## 环境变量  

### backend/.env  
```bash  
MINIMAX_API_KEY=sk-cp-WHPtVsX6OUPNfQ0ilS0mdQtGAiEpdVzpoq86cKqQpPjfTuHRYiO1nx5fEhgUh4H97Oq1ox5icHACvpFFu37Ptc14snu_gJjQsBEwWA8KJLoGqdodEeo12Nw  
MINIMAX_BASE_URL=https://api.minimaxi.com/v1  
MINIMAX_MODEL=MiniMax-M2.7-highspeed     # v2.0 已切换，支持 reasoning 输出，Phase 2 无需修改  
SUPABASE_URL=https://evhugykdnydjttizmfip.supabase.co  
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aHVneWtkbnlkanR0aXptZmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjEwMTcsImV4cCI6MjA5MDMzNzAxN30.skhgrdozlS5KpA5cw_qLD7m2m7R-vV-tw43omp__83I  
CORS_ORIGINS=http://localhost:3000  
# 注：MINIMAX_GROUP_ID 已废弃，不再使用  
# 注：MINIMAX_BASE_URL 为 minimaxi.com，非 minimax.chat  



frontend/.env.local

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000  




## 启动方式

# 后端  
cd backend && python3 -m uvicorn main:app --reload --port 8000  

# 前端  
cd frontend && npm run dev  




## Agent 分工

### 各 Agent 职责

详细配置参见 `.claude/agents/` 目录下各 Agent 配置文件。

- **frontend-agent**\
  职责：所有前端代码变更\
  触发：协调者下发前端任务

- **backend-agent**\
  职责：所有后端代码变更\
  触发：协调者下发后端任务

- **test-agent**\
  职责：测试用例编写 + 执行 + 报告\
  触发：Gate 节点由协调者触发

- **ux-polish-agent**\
  职责：Playwright 视觉验收\
  触发：Gate 2 通过后

- **prompt-agent**\
  职责：Prompt 模板优化\
  触发：Phase 2 需要优化 Prompt 时

### Gate Review 机制（v3.0）

Phase 1A + 1B 完成 → test-agent 执行 → Gate 1 Review → Phase 2  
Phase 2 完成      → test-agent 执行 → Gate 2 Review → Phase 3  
Phase 3 完成      → test-agent + ux-polish-agent → Gate 3 → v3.0 完成  


详见 `docs/specs/CurioSync Development Document v3.0.md`



Claude（主协调者）角色

1. **任务分解**：将用户需求拆分为具体的子任务
2. **Agent 调度**：根据任务类型，启动对应的 sub-agent 执行
3. **Gate Review**：收到 test-agent 报告后，决定是否进入下一 Phase
4. **接口仲裁**：前后端接口不一致时，协调者裁决
5. **不写代码**：不直接写任何代码，不执行任何测试

协作模式

用户 → Claude（协调者）
│
├─── Phase 1A ──→ frontend-agent（shadcn/ui + assistant-ui）
│
├─── Phase 1B ──→ backend-agent（LangChain 升级）
│
│ ← ← ← 两者并行完成 → → →
│
▼
协调者：Gate 1 信号 ──→ test-agent（回归验证）
│
test-agent 提交报告
│
协调者：Gate 1 Review
│
通过 → Phase 2 / 不通过 → 指派修复 → 重测
│
▼
协调者：Gate 2 信号 ──→ test-agent（协议验证）
│
通过 → Phase 3（ux-polish-agent）
│
协调者：Gate 3 ──→ test-agent + ux-polish-agent


---  

## 参考文档  

- 产品概念：`docs/concept/CurioSync Concept v0.1.md`  
- v2.0 规格：`docs/specs/CurioSync MVP Development Document v2.0.md`  
- v3.0 规格：`docs/specs/CurioSync Development Document v3.0.md`  
- 测试方法论：`docs/test/README.md`  


