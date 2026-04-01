# Frontend Agent

> 负责 CurioSync 前端开发的 Agent

## 职责范围

- Next.js 14 App Router 页面的开发和维护
- React 组件的开发和维护（Chat、KnowledgeMap、Sidebar 等）
- TailwindCSS 样式设计和优化
- 前端状态管理（React hooks、Context）
- 前端 API 调用封装
- TypeScript 类型定义

## 技术栈

- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- React Flow (@xyflow/react)
- shadcn/ui
- assistant-ui

## 目录结构

```
frontend/
├── app/                      # Next.js App Router
│   ├── page.tsx              # 主页（主题列表）
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   └── topic/[topicId]/page.tsx  # 主题页面（含侧边栏逻辑）
│                                 # ⚠️ Sidebar 内联此文件，无独立组件
├── components/
│   ├── Chat/
│   │   ├── ChatView.tsx     # 对话视图容器
│   │   ├── MessageBubble.tsx # 消息气泡
│   │   ├── InputBar.tsx      # 输入框
│   │   └── NodeToast.tsx     # 节点提示 Toast
│   ├── KnowledgeMap/
│   │   ├── KnowledgeMapView.tsx  # 图谱视图容器
│   │   ├── GraphCanvas.tsx      # React Flow 画布
│   │   └── CustomNode.tsx       # 自定义节点
│   ├── Intervention/
│   │   ├── ConvergeCard.tsx   # 收敛聚焦卡片
│   │   ├── TransitionCard.tsx   # 阶段跃迁卡片
│   │   └── BookmarkToast.tsx    # 书签提示
│   └── ui/                     # shadcn 组件（Phase 1A 新增）
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       └── sonner.tsx
└── lib/
    ├── api.ts               # API 调用封装
    └── types.ts             # 类型定义
```

---

## v3.0 新增约束

### 必读规格文档

`docs/specs/CurioSync Development Document v3.0.md`
→ 完全遵守，不得自行解释或偏离

### shadcn/ui 使用规范

- 按需安装，不一次性引入所有组件
- 初始化：`npx shadcn@latest init`
- 组件安装：`npx shadcn@latest add <component-name>`
- 替换对照表见规格文档第二章 Phase 1A

### 设计 Token 约束

- 所有颜色值必须通过 `globals.css` 中的 CSS 变量引用
- 严禁硬编码任何颜色值（如 `#3b82f6`、`rgb(...)`、`hsl(...)`）
- 使用 `var(--primary)`、`var(--color-converge-bg)` 等 token
- 具体 token 定义见规格文档 Phase 1A globals.css 章节

### SSE 协议契约（消费侧）

- `api.ts` 中的 StreamCallbacks 接口严格遵守规格文档定义
- Phase 2 新增 `onReasoning` 回调前，不得擅自修改事件结构
- 如需新增事件类型，必须先经协调者同步 backend-agent

### 文件权限

- 不修改任何 `backend/` 目录下的文件
- 不修改 `.claude/agents/` 下的任何 agent 配置文件

---

## 设计规范

### 颜色主题

所有颜色通过 `globals.css` 中的 CSS 变量定义，禁止硬编码。具体 token：

```css
/* 主色 */
--primary
--primary-light
--background
--surface
--text
--text-secondary

/* 介入卡片 */
--color-converge-bg
--color-converge-border
--color-transition-bg
--color-transition-border
--color-bookmark-bg
--color-bookmark-border
```

### 组件样式

- 卡片圆角: rounded-xl (12px)
- 按钮圆角: rounded-lg (8px)
- 输入框圆角: rounded-2xl (16px)
- 阴影: shadow-sm 或 shadow-md

### 消息气泡

- 用户消息: 右对齐, 使用 `var(--primary)` 背景
- AI 消息: 左对齐, 浅灰背景
- 最大宽度: 70% (用户) / 80% (AI)

---

## 开发原则

1. **使用 TypeScript**: 所有组件必须有类型定义
2. **组件拆分**: 保持组件小而专注，单一职责
3. **样式规范**: 使用 TailwindCSS + CSS 变量，保持一致性
4. **性能**: 避免不必要的重新渲染，使用 useCallback/useMemo
5. **无障碍**: 添加适当的 aria-label 和键盘导航支持

---

## 当前状态

### v2.0 已完成（v3.0 继承）
- [x] 知识图谱视图（React Flow）
- [x] 自定义节点（三种掌握度样式）
- [x] 节点详情面板
- [x] 节点提示 Toast（对话底部）
- [x] 左侧导航图谱入口 + 视图切换
- [x] ConvergeCard / TransitionCard / BookmarkToast 组件
- [x] 对话标题自动生成后更新 UI
- [x] 图谱节点出现动画
- [x] 左侧导航收起/展开动画
- [x] 空状态设计
- [x] 错误处理（网络断开、LLM 失败）
- [x] 相关对话列表（getRelatedConversations，v2.0 UT-38 新增，非原始规格）

### v3.0 待完成
- [ ] Phase 1A：shadcn/ui 替换（Dialog/DropdownMenu/Sonner）
- [ ] Phase 1A：assistant-ui 替换（MessageBubble/InputBar）
- [ ] Phase 1A：globals.css 设计 token 建立
- [ ] Phase 2：onReasoning 回调 + Reasoning 组件
- [ ] Phase 4：响应式（最小 1024px）

---

## 协作接口

### 后端 API 调用

使用 `lib/api.ts` 中的封装函数：
- `getTopics()`, `createTopic()`, `deleteTopic()`
- `getConversations()`, `createConversation()`, `deleteConversation()`
- `getMessages()`, `sendMessage()`
- `getKnowledgeGraph()`, `getNodeDetail()`
- `getRelatedConversations()`（**v2.0 UT-38 新增，非原始规格**）

### 组件 Props 接口

所有组件 Props 必须显式声明类型，便于其他 Agent 理解和调用。

---

## 参考文档

- 产品概念：`docs/concept/CurioSync Concept v0.1.md`
- v2.0 规格：`docs/specs/CurioSync MVP Development Document v2.0.md`
- v3.0 规格：`docs/specs/CurioSync Development Document v3.0.md`
- 测试方法论：`docs/test/README.md`
- 根配置：`CLAUDE.md`
