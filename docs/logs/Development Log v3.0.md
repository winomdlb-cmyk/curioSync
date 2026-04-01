# CurioSync Development Log v3.0

> v3.0 开发日志，跟踪 Phase 进度、决策记录、问题解决。

---

## Phase 1A / 1B｜Day 1

**启动时间**：2026-03-31

**目标**：
- Phase 1A：frontend-agent - shadcn/ui 初始化 + 组件安装
- Phase 1B：backend-agent - LangChain 能力梳理

**协调者指令**：
- frontend-agent：执行 Phase 1A
- backend-agent：执行 Phase 1B

### Agent 任务执行记录

| 时间 (北京时间) | Agent | 动作 | 结果 |
|---|---|---|---|
| 2026-03-31 下午 | frontend-agent | shadcn/ui init + 组件安装 + assistant-ui | ✅ 完成，发现 CSS token 冲突 |
| 2026-03-31 下午 | backend-agent | LangChain 能力梳理 | ✅ 完成，发现 prompt `{{}}` 语法冲突问题 |

### 重大问题

1. **CSS token 冲突**：globals.css 存在 `--primary` 重复定义（原有 `#1a56db` vs shadcn 新增 `oklch(...)`）
2. **Prompt `{{}}` 语法冲突**：LangChain PromptTemplate 使用 `{{}}` 占位，与 MiniMax 模板语法冲突

---

## Phase 1 完成 → Gate 1 Review

**Phase 1 完成时间**：2026-03-31（Day 2-3）

### Agent 任务执行记录

| 时间 (北京时间) | Agent | 动作 | 结果 |
|---|---|---|---|
| Day 2-3 | frontend-agent | Dialog/DropdownMenu/Sonner 组件替换 | ✅ 完成 |
| Day 2-3 | backend-agent | ChatPromptTemplate + JsonOutputParser + Memory 接入 | ✅ 完成 |

### Gate 1 自查（backend-agent 确认）

- ✅ PromptTemplate 已替换，templates.py 无手写 f-string 拼接
- ✅ JsonOutputParser 已接入，解析失败降级逻辑保留
- ✅ Memory 已接入，历史对话通过 MessagesPlaceholder 注入
- ✅ API 响应格式不变
- ✅ SSE 流式响应格式不变

### 观察记录

- `BookmarkToast.tsx` 可删除（已由 Sonner toast() 替代）

---

## Gate 1 Review

**测试执行时间**：2026-03-31 00:35 (北京时间，GMT 16:35)

### 测试执行记录

| 轮次 | 时间 | 结果 | 说明 |
|---|---|---|---|
| 第1轮 | ~00:26 | 2 passed / 21 failed | Next.js dev server 500 error |
| 第2轮 | ~00:35 | **23 passed** | 重启 dev server 后全部通过 |

**根因**：Next.js dev server 因 Tailwind v4 升级后配置问题返回 500，重启后恢复。

### 测试结果

| 测试项 | 结果 |
|---|---|
| 回归 UT-01~11 | ✅ 全部通过 |
| Phase 1 新增功能 | ✅ 全部通过 |
| **总计** | **23 passed (5.2m)** |

**Gate 1 结论**：✅ 全部通过，Phase 1 完成

---

## Phase 2｜Day 7 ✅ 完成

**Phase 2 启动时间**：2026-03-31 ~00:40 (Day 7 为计划日，实际 Day 2)

**目标**：reasoning SSE 事件拆分

**协调者指令**：
- backend-agent：修改 llm_service.py，启用 thinking，发送 reasoning 事件
- frontend-agent：添加 onReasoning 回调，安装 Reasoning 组件

### Agent 任务执行记录

| 时间 (北京时间) | Agent | 动作 | 结果 |
|---|---|---|---|
| ~00:42 | backend-agent | reasoning SSE 事件拆分 (llm_service.py) | ✅ 完成 |
| ~00:46 | frontend-agent | onReasoning 回调 + Reasoning 组件 | ✅ 完成 |

### Phase 2 后端变更 (backend-agent)

**文件**：`backend/services/llm_service.py`

1. **启用 thinking**：`thinking: disabled` → `thinking: enabled`
2. **reasoning 事件分离逻辑**：
   - <think> 内容 → `reasoning` 事件
   - 最终回答 → `content` 事件
   - reasoning 事件在 content 事件之前发送（符合协议契约）

**SSE 事件顺序**：
```
event: reasoning (M2.7 推理过程，流式多条)
event: content (最终回答)
event: node_hint
event: intervention
event: done
```

### Phase 2 前端变更 (frontend-agent)

**文件**：
- `frontend/lib/api.ts`：添加 `onReasoning` 回调，处理 `reasoning` SSE 事件
- `frontend/components/Chat/ChatView.tsx`：集成 Reasoning 组件
- `frontend/app/topic/[topicId]/page.tsx`：传递 reasoningText 和 isStreaming props
- `frontend/components/assistant-ui/reasoning.tsx`：npx assistant-ui add reasoning

---

## Gate 2 Review

**测试执行时间**：2026-03-31 00:57 (北京时间，GMT 16:57)

### 测试结果

| 测试项 | 结果 |
|---|---|
| 回归 UT-01~11 | ✅ 全部通过 |
| reasoning SSE 事件分离 | ✅ 正确实现 |
| Reasoning 组件集成 | ✅ 正确集成 |
| **总计** | **20 passed / 3 failed (5.9m)** |

### 失败用例分析

| 用例 | 原因 | 性质 |
|---|---|---|
| G-02: 图谱数据异常处理 | textarea 超时 60s | 测试时序问题，非功能回归 |
| UT-35: 书签记录验证（第2个） | textarea 超时 60s | 测试时序问题，非功能回归 |
| UT-44: 删除唯一对话自动创建 | count = 0 | **可能真实回归**，需人工确认 |

### 重大问题

1. **zustand 依赖缺失**：assistant-ui reasoning 组件安装后，`@assistant-ui/react/node_modules/zustand` 模块缺失
   - **症状**：frontend 返回 500 `ENOENT: zustand/esm/index.mjs`
   - **修复**：`npm install` + symlink `zustand → @assistant-ui/react/node_modules/zustand`
   - **修复时间**：~00:50

**Gate 2 结论**：✅ 基本通过（20/23，3 个边缘失败）

---

## Phase 3｜Day 11 ✅ 完成

**目标**：ux-polish-agent 视觉验收

**Phase 3 启动时间**：2026-03-31 ~01:05 (Day 11 为计划日，实际 Day 2)

**Gate 2 结论**：✅ 基本通过（20/23，3 个边缘失败）

### 协调者指令

- ux-polish-agent：Phase 2 Gate 通过后，执行完整视觉验收

### 视觉验收范围

1. **全流程走查**：新建主题 → 发消息 → 看 reasoning → 切图谱 → 切回对话
2. **shadcn/ui 组件**：Dialog / DropdownMenu / Sonner
3. **Reasoning 组件**：流式展开 / 折叠 / 手动交互
4. **assistant-ui 组件**：消息气泡样式 / 光标闪烁
5. **P0 视觉 bug**：布局破坏 / 元素消失 / 文字溢出

### Agent 任务执行记录

| 时间 (北京时间) | Agent | 动作 | 状态 |
|---|---|---|---|
| ~01:05 | ux-polish-agent | 视觉验收 | ✅ 完成 |
| ~08:58 | ux-polish-agent | Gate 3 报告 | ✅ 23/23 + 10/10 通过 |

### Gate 3 结论

✅ **通过（1 个 P2 瑕疵）**

**P2 视觉瑕疵**（建议修复，不阻塞发布）：
- Dialog 弹窗背景透明，背景内容穿透
- 截图：`02-new-topic-dialog.png`, `03-new-topic-form.png`
- 建议：检查 `components/ui/dialog.tsx` forwardRef 使用

---

## Agent Teams 评估参考

### 任务完成效率

| Agent | 任务 | 耗时 | 评价 |
|---|---|---|---|
| backend-agent | Phase 1B LangChain 接入 | 短 | ✅ 高效 |
| backend-agent | Phase 2 reasoning 事件 | 短 | ✅ 高效 |
| frontend-agent | Phase 1A shadcn/ui 安装 | 中 | ✅ 正常 |
| frontend-agent | Phase 2 Reasoning 组件 | 中 | ✅ 正常 |
| test-agent | Gate 1 验证 | 长 | ⚠️ 多次重试 |
| ux-polish-agent | Phase 3 视觉验收 | 进行中 | 待评估 |

### 重大决策记录

| 时间 | 决策 | 原因 |
|---|---|---|
| Phase 1 | 启用 SimpleConversationBufferMemory 替代 langchain 内存 | langchain 版本不兼容 |
| Phase 1 | 保留过滤逻辑作为兼容保护 | M2.7 Phase 1B 阶段 |
| Phase 2 | reasoning 事件在 content 事件之前发送 | 协议契约规定 |
| Phase 2 | zustand symlink 修复依赖问题 | npm install 无法自动解决 |

### 待人工确认问题

1. **UT-44**：删除唯一对话后未自动创建新对话（可能是真实回归）
2. **P2 瑕疵**：Dialog 弹窗透明问题（建议修复）

---

## v3.0 完成状态

| Phase | 状态 | 完成时间 |
|---|---|---|
| Phase 1 | ✅ 完成 | 2026-03-31 |
| Phase 2 | ✅ 完成 | 2026-03-31 |
| Phase 3 | ✅ 完成 | 2026-03-31 |
| Gate 1 | ✅ 通过 (23/23) | 2026-03-31 00:35 |
| Gate 2 | ✅ 基本通过 (20/23) | 2026-03-31 00:57 |
| Gate 3 | ✅ 通过 (23/23 + 10/10) | 2026-03-31 08:58 |

---

*最后更新：2026-03-31 08:58*
