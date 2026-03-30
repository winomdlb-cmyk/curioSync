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

## 目录结构

```
frontend/
├── app/                      # Next.js App Router
│   ├── page.tsx              # 主页（主题列表）
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   └── topic/[topicId]/page.tsx  # 主题页面
├── components/
│   ├── Chat/
│   │   ├── ChatView.tsx     # 对话视图容器
│   │   ├── MessageBubble.tsx # 消息气泡
│   │   ├── InputBar.tsx    # 输入框
│   │   └── NodeToast.tsx    # 节点提示 Toast
│   ├── KnowledgeMap/
│   │   ├── KnowledgeMapView.tsx  # 图谱视图容器
│   │   ├── GraphCanvas.tsx      # React Flow 画布
│   │   ├── CustomNode.tsx       # 自定义节点
│   │   └── NodeDetailPanel.tsx   # 节点详情面板
│   ├── Sidebar/
│   │   ├── Sidebar.tsx     # 侧边栏容器
│   │   ├── ConversationList.tsx # 对话列表
│   │   └── SidebarNav.tsx  # 图谱/书签入口
│   └── Intervention/
│       ├── ConvergeCard.tsx   # 收敛聚焦卡片
│       ├── TransitionCard.tsx   # 阶段跃迁卡片
│       └── BookmarkToast.tsx    # 书签提示
└── lib/
    ├── api.ts               # API 调用封装
    └── types.ts             # 类型定义
```

## 设计规范

### 颜色主题
- Primary: #1a56db (深蓝)
- Primary Light: #3b82f6 (蓝色)
- Background: #f9fafb (浅灰背景)
- Surface: #ffffff (白色卡片)
- Text: #111827 (深色文字)
- Text Secondary: #6b7280 (灰色文字)

### 组件样式
- 卡片圆角: rounded-xl (12px)
- 按钮圆角: rounded-lg (8px)
- 输入框圆角: rounded-2xl (16px)
- 阴影: shadow-sm 或 shadow-md

### 消息气泡
- 用户消息: 右对齐, bg-blue-600, 白色文字
- AI 消息: 左对齐, bg-gray-100, 深色文字
- 最大宽度: 70% (用户) / 80% (AI)

## 开发原则

1. **使用 TypeScript**: 所有组件必须有类型定义
2. **组件拆分**: 保持组件小而专注，单一职责
3. **样式规范**: 使用 TailwindCSS，保持一致性
4. **性能**: 避免不必要的重新渲染，使用 useCallback/useMemo
5. **无障碍**: 添加适当的 aria-label 和键盘导航支持

## 当前任务 (Phase 2-4)

### Phase 2 - 结构化输出 + 知识图谱
- [x] 知识图谱视图（React Flow 基础渲染）
- [x] 自定义节点（三种掌握度样式）
- [x] 节点详情面板
- [x] 节点提示 Toast（对话底部）
- [x] 左侧导航图谱入口 + 视图切换

### Phase 3 - 介入卡片
- [x] ConvergeCard 组件
- [x] TransitionCard 组件（方向卡片点击自动发送）
- [x] BookmarkToast 组件（右下角）

### Phase 4 - 体验打磨
- [ ] 对话标题自动生成后更新 UI
- [ ] 图谱节点出现动画
- [ ] 左侧导航收起/展开动画
- [ ] 空状态设计
- [ ] 错误处理（网络断开、LLM 失败）
- [ ] 响应式（最小 1024px）

## 协作接口

### 后端 API 调用
使用 `lib/api.ts` 中的封装函数：
- `getTopics()`, `createTopic()`, `deleteTopic()`
- `getConversations()`, `createConversation()`, `deleteConversation()`
- `getMessages()`, `sendMessage()`
- `getKnowledgeGraph()`, `getNodeDetail()`

### 组件 Props 接口
所有组件 Props 必须显式声明类型，便于其他 Agent 理解和调用。

## 参考文档

- 产品概念: `docs/concept/CurioSync Concept v0.1.md`
- 开发规格: `docs/specs/CurioSync MVP Development Document v2.0.md`
- 根配置: `CLAUDE.md`
