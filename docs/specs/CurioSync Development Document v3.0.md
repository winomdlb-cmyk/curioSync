以下是更新后的完整 v3.0 规格文档：  

```markdown  
# CurioSync Development Document v3.0  
> 基于 v2.0 稳定 codebase，进行技术栈全面升级与 Agent Teams 体系建立。  
> 前置条件：v2.0 测试全部通过（已确认）  
> Agent 配置文件：全部已冻结（见 .claude/agents/）  
> CLAUDE.md：已完成  

---  

## 零、v3.0 目标与范围  

### 核心目标  

```  
目标 A：技术升级  
  前端：shadcn/ui + assistant-ui 替换手写组件  
  后端：LangChain 完整能力（PromptTemplate / Chain / Memory）  
  模型：MiniMax M2.7 + Reasoning SSE 事件支持  

目标 B：Agent Teams 体系建立  
  从 v3.0 第一天起，所有开发均通过 Agent Teams 协作完成  
  主 Claude 作为协调者，不直接写代码  
  各 agent 分工明确，通过 Gate Review 机制保证质量  
```  

### 不在 v3.0 范围内  

```  
✗ 新功能开发（RAG / 多模态 / 目标模式）  
✗ 体验补全（v2.0 遗留 ⚠️ 项）  
✗ 响应式布局  
✗ 新动画效果  
```  

### 从 v2.0 继承  

```  
✅ 完整数据库 schema（无变更）  
✅ 所有 API 路由设计（无变更）  
✅ 产品交互逻辑（无变更）  
✅ 11 条回归用例（需全部通过 Gate 1）  
```  

---  

## 一、文档与文件结构  

### 1.1 项目文档结构  

```  
docs/  
├── concept/  
│   └── CurioSync Concept v0.1.md                        # 不动，存档  
│  
├── logs/  
│   ├── Development Log v2.0.md                           # 不动，存档  
│   └── Development Log v3.0.md                           # ✨ 新建 ← 协调者负责创建和维护  
│  
├── specs/  
│   ├── CurioSync MVP Development Document v2.0.md        # 不动，存档  
│   └── CurioSync Development Document v3.0.md            # 本文档  
│  
└── test/  
    ├── README.md                                          # 保留（测试方法论，不动）  
    ├── 2.0 test.md                                        # 不动，存档  
    └── 3.0 test.md                                        # ✨ 新建 ← test-agent 负责创建和维护  
```  

### 1.2 Agent 配置文件结构  

```  
.claude/agents/  
├── frontend-agent.md      # ✅ 已冻结  
├── backend-agent.md       # ✅ 已冻结  
├── test-agent.md          # ✅ 已冻结  
├── ux-polish-agent.md     # ✅ 已冻结  
└── prompt-agent.md        # ✅ 已冻结  
```  

### 1.3 根配置  

```  
CLAUDE.md                  # ✅ 已完成（协调者角色、项目全貌、Agent 分工）  
```  

### 1.4 新建文件说明  

| 文件 | 新建时机 | 负责 Agent |  
|---|---|---|  
| `docs/logs/Development Log v3.0.md` | v3.0 开发启动时 | 协调者 |  
| `docs/test/3.0 test.md` | Gate 1 测试前 | test-agent |  
| `frontend/tests/screenshots/v3/`（目录） | Phase 3 视觉验收前 | ux-polish-agent |  

---  

## 二、Agent Teams 体系  

### 2.1 角色定义  

#### 主 Claude（协调者）  

```  
职责：  
  - 任务分解，下发给对应 agent  
  - Gate Review：收到测试报告后，决定是否进入下一 Phase  
  - 接口冲突仲裁：前后端接口不一致时，协调者裁决  
  - 维护 Development Log v3.0.md  
  - 不写任何代码，不执行任何测试  

触发方式：  
  - 用户发出"开始 Phase X"指令  
  - 或 test-agent 提交测试报告后，协调者自动做 Gate 决策  
```  

#### frontend-agent  

```  
职责：所有前端代码变更  
触发：协调者下发前端任务  
输出：  
  - 变更后的代码  
  - 简要变更说明（改了哪些文件，为什么这样改）  
  - 如有 API 消费变更，必须在变更说明中列出  

约束：  
  - 不修改任何后端文件  
  - 不修改 .claude/agents/ 下的任何 agent 配置  
  - 严格遵守 SSE 协议契约（见第三章 Phase 2 小节）  
  - 所有组件样式通过 globals.css 设计 token 引用，不硬编码任何颜色值  
  - 完全遵守本规格文档的组件替换对照表和验收标准  
```  

#### backend-agent  

```  
职责：所有后端代码变更  
触发：协调者下发后端任务  
输出：  
  - 变更后的代码  
  - API 变更清单（如有新增/修改 endpoint 或 SSE 事件，必须明确列出）  
  - 如 SSE 事件格式有变更，必须同步通知协调者  

约束：  
  - 不修改任何前端文件  
  - 不单方面修改 SSE 协议（需协调者同步 frontend-agent）  
  - 完全遵守本规格文档的 LangChain 升级规格和 SSE 协议契约  
```  

#### test-agent  

```  
职责：测试用例编写 + 执行 + 报告生成  
触发：协调者发出 "Phase X 开发完成，请执行测试" 信号  
输出：docs/test/3.0 test.md（追加写入，按 Gate 分区）  
执行规则：  
  - 按 Phase 触发，不跨 Phase 合并测试  
  - 失败不停测，记录后继续，最后汇总  
  - 报告格式固定（见第五章模板）  
  - 必读：docs/test/README.md（测试方法论，含已验证的经验）  
```  

#### ux-polish-agent  

```  
职责：Phase 3 的视觉验收（Playwright 视觉验证）  
触发：协调者在 Phase 2 Gate 通过后，单独下发  
输出：视觉验收报告（追加写入 docs/test/3.0 test.md）  
工具：  
  - Playwright（操作模拟 + 截图验收）  
  - 参考 docs/test/README.md 中已有的 Playwright 经验  
  截图存储：frontend/tests/screenshots/v3/  
```  

#### prompt-agent  

```  
职责：Prompt 模板优化与 LangChain PromptTemplate 适配  
触发：Phase 2 中，协调者需要优化 Prompt 结构时  
输出：更新后的 templates.py + 变更说明  
```  

### 2.2 协作流程图  

```  
用户  
│  
▼  
主 Claude（协调者）  
│  
├─── Phase 1A ──→ frontend-agent（shadcn/ui + assistant-ui）  
│         │  
├─── Phase 1B ──→ backend-agent（LangChain 升级）  
│         │  
│    ← ← ← 两者并行完成 → → →  
│         │  
▼         ▼  
协调者：Gate 1 信号 ──→ test-agent（回归验证）  
│  
test-agent 提交报告  
│  
协调者：Gate 1 Review  
│  
通过 → Phase 2  
不通过 → 指派修复 → 重测  
│  
▼  
协调者：Gate 2 信号 ──→ test-agent（协议验证）  
│  
通过 → Phase 3（ux-polish-agent）  
│  
协调者：Gate 3 ──→ test-agent + ux-polish-agent  
```  

### 2.3 Gate Review 标准  

#### Gate 1（Phase 1 完成条件）  

```  
必须通过：  
✅ UT-01 ~ UT-11 全部通过（11/11）  
✅ shadcn Dialog 替换新建主题 Modal（视觉 + 功能一致）  
✅ shadcn DropdownMenu 替换对话 ··· 菜单  
✅ shadcn Sonner 替换 NodeToast + BookmarkToast  
✅ assistant-ui Thread/Message 替换 MessageBubble  
✅ assistant-ui Composer 替换 InputBar  
✅ LangChain PromptTemplate 替换手写字符串拼接  
✅ LangChain JsonOutputParser 替换手写正则解析  
✅ LangChain ConversationBufferMemory 替换手动 history  

不要求：  
  - 视觉与 v2.0 像素级一致（允许 shadcn 默认样式差异）  
  - 性能优化  
```  

#### Gate 2（Phase 2 完成条件）  

```  
必须通过：  
✅ reasoning SSE 事件正确发送（后端）  
✅ assistant-ui Reasoning 组件正确接收并渲染  
✅ 流式中：reasoning 内容实时展开  
✅ 完成后：reasoning 块自动折叠  
✅ 手动展开/折叠交互正常  
✅ MiniMax M2.7 模型响应正常（重点验证 reasoning 事件拆分是否正确）  
✅ UT-01 ~ UT-11 无回归  
```  

#### Gate 3（Phase 3 完成条件）  

```  
必须通过：  
✅ UT-01 ~ UT-11 无回归  
✅ ux-polish-agent Playwright 视觉验收报告提交  
✅ 无 P0 视觉 bug（布局破坏 / 元素消失 / 文字溢出）  
```  

---  

## 三、Phase 规划  

### Phase 1A｜前端重构（frontend-agent 主导）  

**并行于 Phase 1B，无依赖关系**  

#### shadcn/ui 接入  

```bash  
# 初始化（不影响现有代码）  
npx shadcn@latest init  

# 按需安装  
npx shadcn@latest add dialog  
npx shadcn@latest add dropdown-menu  
npx shadcn@latest add sonner  
```  

#### 组件替换对照表  

| 现有组件 | 替换为 | 变更范围 |  
|---|---|---|  
| 新建主题 Modal（手写） | shadcn Dialog | components/TopicList/ |  
| 对话 ··· 菜单（手写） | shadcn DropdownMenu | components/Sidebar/ConversationList.tsx |  
| NodeToast.tsx | shadcn Sonner | components/Chat/ |  
| BookmarkToast.tsx | shadcn Sonner | components/Intervention/ |  
| MessageBubble.tsx | assistant-ui MessagePrimitive | components/Chat/ |  
| InputBar.tsx | assistant-ui ComposerPrimitive | components/Chat/ |  

#### assistant-ui 接入  

```bash  
npm install @assistant-ui/react  
```  

接入点：  

```  
ChatView.tsx  
  → 使用 Thread Primitive 作为容器  
  → useAssistantRuntime hook 替代手写 streaming 状态  

MessageBubble.tsx  
  → 使用 Message.Root / Message.Content Primitive  
  → 内置 streaming 光标（▌）  

InputBar.tsx  
  → 使用 Composer.Root / Composer.Input / Composer.SendButton  
  → 内置 disabled 状态（AI 回答中自动 disabled）  

自定义 Runtime：  
  → 实现 useExternalStoreRuntime（适配现有 SSE 流式 API）  
  → 不替换后端 API，只是适配层  
```  

#### globals.css 设计 token 建立  

```css  
/* 建立 v3.0 设计语言基础 */  
:root {  
  --radius: 0.75rem;  

  /* CurioSync 专属语义 token */  
  --color-converge-bg:        45  93% 96%;  
  --color-converge-border:    45  93% 58%;  
  --color-transition-bg:      217 91% 97%;  
  --color-transition-border:  217 91% 60%;  
  --color-bookmark-bg:        142 71% 97%;  
  --color-bookmark-border:    142 71% 45%;  

  /* 掌握度节点色 */  
  --color-mastery-understood: 221 83% 53%;  
  --color-mastery-exposed:    214 80% 88%;  
  --color-mastery-unaware:    220 14% 90%;  
}  
```  

**约束：所有组件引用 token，不硬编码颜色值**  

#### 验收标准（提交 Gate 1 前自查）  

```  
□ npx shadcn@latest init 完成，shadcn.json 存在  
□ Dialog / DropdownMenu / Sonner 均可正常调用  
□ assistant-ui 安装完成，无 peer dependency 冲突  
□ 新建主题 Modal 功能完整（输入/提交/跳转）  
□ 对话菜单功能完整（重命名/删除/二次确认）  
□ Toast 出现/消失动画正常  
□ 消息流式渲染正常（光标闪烁 ▌）  
□ 输入框 AI 回答中自动 disabled  
□ globals.css token 已建立，无硬编码颜色  
```  

---  

### Phase 1B｜后端 LangChain 升级（backend-agent 主导）  

**并行于 Phase 1A，无依赖关系**  

#### 1. PromptTemplate 替换手写字符串拼接  

```python  
# 目标：backend/prompts/templates.py  
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate  

MAIN_CHAT_PROMPT = ChatPromptTemplate.from_messages([  
    SystemMessagePromptTemplate.from_template(MAIN_SYSTEM_PROMPT),  
    # 对话历史由 Memory 注入，不在这里手动拼接  
])  

TITLE_PROMPT = ChatPromptTemplate.from_messages([  
    ("human", TITLE_GENERATION_PROMPT)  
])  
```  

#### 2. JsonOutputParser 替换手写正则解析  

```python  
# 目标：backend/services/llm_service.py  
from langchain.output_parsers import JsonOutputParser  
from langchain_core.runnables import RunnableSequence  

parser = JsonOutputParser()  
chain = MAIN_CHAT_PROMPT | self.llm | parser  
```  

#### 3. ConversationBufferMemory 替换手动 history 传递  

```python  
from langchain.memory import ConversationBufferMemory  

# 每个 conversation_id 对应一个 Memory 实例  
# 保留最近 20 条（10轮）  
memory = ConversationBufferMemory(  
    memory_key="chat_history",  
    return_messages=True,  
    k=10  
)  
```  

#### 4. `<think>` 过滤逻辑处理  

```  
v2.0：手写状态机过滤 <think>...</think>  
v3.0：M2.7 通过专用 reasoning 事件输出推理内容  
      Phase 1B 阶段：保留过滤逻辑作为兼容保护  
      Phase 2 接入后：由 reasoning 事件替代，过滤逻辑可移除  
```  

#### 验收标准（提交 Gate 1 前自查）  

```  
□ PromptTemplate 已替换，templates.py 无手写 f-string 拼接  
□ JsonOutputParser 已接入，解析失败降级逻辑保留  
□ Memory 已接入，历史对话正确注入 Prompt  
□ 所有现有 API 响应格式不变（后端接口契约不变）  
□ /api/conversations/{id}/chat SSE 流式响应格式不变  
```  

---  

### Phase 2｜Reasoning SSE 事件拆分（前后端同步）  

**依赖：Gate 1 通过**  
**前后端必须同步进行，严格遵守 SSE 协议契约**  

#### SSE 协议契约（前后端共识，不可单方面修改）  

```  
v3.0 新增 SSE 事件：reasoning  

格式：  
  event: reasoning  
  data: {"text": "推理过程的流式文字片段"}  

位置：在 content 事件之前发送  

完整事件顺序：  
  event: reasoning        ← 新增（M2.7 推理过程，流式多条）  
  data: {"text": "让我先分析一下这个问题..."}  

  event: reasoning  
  data: {"text": "从分子层面来看..."}  

  event: content          ← 不变  
  data: {"text": "表面张力是"}  

  event: content  
  data: {"text": "液体表面..."}  

  event: node_hint        ← 不变  
  ...  

  event: done             ← 不变  
  ...  

前端消费规则：  
  case 'reasoning': callbacks.onReasoning(data.text)   ← 新增  

后端发送规则：  
  M2.7 返回的 <think> 内容 → reasoning 事件  
  M2.7 返回的正式回答     → content 事件  
  两者严格分离，不混合  
```  

#### 后端任务（backend-agent）  

```python  
# backend/.env  
MINIMAX_MODEL=MiniMax-M2.7-highspeed   # 已确认，v2.0 已采用，无需修改  

# llm_service.py：识别 reasoning 内容，发送 reasoning 事件  
async def chat_stream(...):  
    is_in_reasoning = False  

    async for chunk in self.llm.astream(messages):  
        text = chunk.content  

        if "<think>" in text:  
            is_in_reasoning = True  
            continue  
        elif "</think>" in text:  
            is_in_reasoning = False  
            continue  

        if is_in_reasoning:  
            yield f"event: reasoning\ndata: {json.dumps({'text': text})}\n\n"  
        else:  
            yield f"event: content\ndata: {json.dumps({'text': text})}\n\n"  
```  

#### 前端任务（frontend-agent）  

```typescript  
// 1. api.ts：新增 onReasoning 回调  
interface StreamCallbacks {  
  onReasoning: (text: string) => void  // 新增  
  onContent: (text: string) => void  
  // ... 其余不变  
}  

// SSE 解析新增 case：  
case 'reasoning':  
  callbacks.onReasoning(data.text)  
  break  

// 2. 接入 assistant-ui Reasoning 组件  
// npx assistant-ui add reasoning  
// ChatView.tsx 中接入 Reasoning 组件  
```  

#### Reasoning 组件行为规范  

```  
流式输出中：  
  ▼ 思考过程（实时追加文字）  
    模型正在推理...（流式拼接）  
  ─────────────────  
  正式回答（同步流式输出）  

完成后：  
  ► 思考过程（自动折叠）  
  ─────────────────  
  正式回答（完整显示）  

用户手动点击 ►/▼ 可切换展开/折叠  
```  

---  

### Phase 3｜视觉验收（ux-polish-agent 主导）  

**依赖：Gate 2 通过**  

```  
ux-polish-agent 执行范围：  

  1. 全流程走查  
     新建主题 → 发消息 → 看 reasoning → 切图谱 → 切回对话  

  2. shadcn 组件视觉验收  
     Dialog / DropdownMenu / Sonner 样式  

  3. Reasoning 折叠块交互验收  
     展开/折叠/流式状态的视觉表现  

  4. assistant-ui 组件视觉验收  
     消息气泡样式 / 光标 ▌ 闪烁  

工具：Playwright（唯一工具）  
截图：frontend/tests/screenshots/v3/  
输出：视觉验收报告追加到 docs/test/3.0 test.md Gate 3 区域  
```  

---  

## 四、技术规格  

### 4.1 环境变量（v2.0 继承，无变更）  

```bash  
# backend/.env  
MINIMAX_API_KEY=sk-cp-WHPtVsX6OUPNfQ0ilS0mdQtGAiEpdVzpoq86cKqQpPjfTuHRYiO1nx5fEhgUh4H97Oq1ox5icHACvpFFu37Ptc14snu_gJjQsBEwWA8KJLoGqdodEeo12Nw  
MINIMAX_BASE_URL=https://api.minimaxi.com/v1  
MINIMAX_MODEL=MiniMax-M2.7-highspeed     # v2.0 已切换，Phase 2 无需修改  
SUPABASE_URL=https://evhugykdnydjttizmfip.supabase.co  
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aHVneWtkbnlkanR0aXptZmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjEwMTcsImV4cCI6MjA5MDMzNzAxN30.skhgrdozlS5KpA5cw_qLD7m2m7R-vV-tw43omp__83I  
CORS_ORIGINS=http://localhost:3000  
# 注：MINIMAX_GROUP_ID 已废弃，不再使用  
# 注：MINIMAX_BASE_URL 为 minimaxi.com，非 minimax.chat  

# frontend/.env.local  
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000  
```  

### 4.2 新增依赖  

**前端**  

```bash  
# shadcn/ui（CLI 安装）  
npx shadcn@latest init  

# assistant-ui  
npm install @assistant-ui/react  
```  

**后端**  

```bash  
# requirements.txt 新增  
langchain-core  
```  

### 4.3 文件变更预期  

**前端新增/变更**  

```  
frontend/  
├── components/ui/                  ← shadcn 自动生成（新增目录）  
│   ├── dialog.tsx  
│   ├── dropdown-menu.tsx  
│   └── sonner.tsx  
├── components/Chat/  
│   ├── MessageBubble.tsx           ← 重构（assistant-ui）  
│   └── InputBar.tsx                ← 重构（assistant-ui）  
├── components/Intervention/  
│   ├── BookmarkToast.tsx           ← 重构（Sonner）  
│   └── NodeToast.tsx               ← 重构（Sonner）  
├── lib/  
│   └── api.ts                      ← 新增 onReasoning 回调（Phase 2）  
└── app/globals.css                 ← 新增设计 token  
```  

**后端新增/变更**  

```  
backend/  
├── services/  
│   └── llm_service.py              ← 重构（LangChain 完整能力）  
└── prompts/  
    └── templates.py                ← 重构（PromptTemplate）  
```  

---  

## 五、开发时序  

```  
Day 1：  
  ├── frontend-agent：Phase 1A 启动（shadcn 初始化 + 组件安装）  
  └── backend-agent：Phase 1B 启动（LangChain 能力梳理）  

Day 2~3：  
  ├── frontend-agent：组件替换（Dialog / DropdownMenu / Sonner）  
  └── backend-agent：PromptTemplate + JsonOutputParser 接入  

Day 4~5：  
  ├── frontend-agent：assistant-ui 接入（MessageBubble / InputBar）  
  └── backend-agent：Memory 接入 + 自查  

Day 6：  
  └── 协调者：触发 Gate 1 → test-agent 执行回归验证  

Day 7（Gate 1 通过后）：  
  ├── backend-agent：Phase 2 启动（reasoning 事件拆分）  
  └── frontend-agent：Phase 2 启动（onReasoning 回调 + Reasoning 组件）  

Day 8~9：  
  Phase 2 开发  

Day 10：  
  └── 协调者：触发 Gate 2 → test-agent 执行协议验证  

Day 11（Gate 2 通过后）：  
  └── 协调者：触发 Phase 3 → ux-polish-agent 执行视觉验收  

Day 12：  
  └── 协调者：Gate 3 → 全部通过 → v3.0 完成  
```  

---  

## 六、测试体系  

### 6.1 测试触发机制  

```  
Phase 1 结束 → 协调者信号 → test-agent 执行 Gate 1 回归验证  
Phase 2 结束 → 协调者信号 → test-agent 执行 Gate 2 协议验证  
Phase 3 结束 → 协调者信号 → test-agent 完整回归  
                           + ux-polish-agent Playwright 视觉验收  
```  

### 6.2 test-agent 触发规则  

- **"Phase 1 开发完成，请执行 Gate 1 测试"**  
  执行：回归 UT-01~11 + 自行补充 Phase 1 新增用例  
  输出：docs/test/3.0 test.md Gate 1 区域  

- **"Phase 2 开发完成，请执行 Gate 2 测试"**  
  执行：Reasoning 协议验证 + 回归 UT-01~11  
  输出：docs/test/3.0 test.md Gate 2 区域  

- **"Phase 3 开发完成，请执行 Gate 3 测试"**  
  执行：完整回归（所有已有用例）  
  输出：docs/test/3.0 test.md Gate 3 区域  

### 6.3 测试用例 ID 规则  

```  
v3.0 新增自动化用例：UT-50 起  
Reasoning 相关用例：UT-60 起  
Playwright 视觉验收用例：PL-01 起  
```  

### 6.4 各 Gate 测试方向指导  

**Gate 1 重点**  

```  
- UT-01~11 全部回归（无功能回归）  
- shadcn Dialog 替换后，Modal 键盘导航（Tab / Escape）是否正常  
- Sonner Toast 出现/消失动画是否正常  
- assistant-ui 接入后，流式光标 ▌ 是否正常显示  
- InputBar disabled 状态是否由 assistant-ui 内置逻辑正确处理  
- Playwright 操作参考：docs/test/README.md 2.3 节已验证经验  
```  

**Gate 2 重点**  

```  
- reasoning SSE 事件格式是否符合协议契约（见第三章 Phase 2 小节）  
- frontend onReasoning 回调是否被正确触发  
- 流式中 reasoning 内容是否实时追加  
- 完成后 reasoning 块是否自动折叠  
- 手动展开/折叠是否正常  
- UT-01~11 无回归  
```  

**Gate 3 重点**  

```  
- 全量回归（UT-01~11 + Gate 1 新增 + Gate 2 新增）  
- ux-polish-agent Playwright 视觉验收报告  
- 无 P0 视觉 bug（布局破坏 / 元素消失 / 文字溢出）  
```  

### 6.5 测试执行原则  

```  
1. 失败不停测：一个用例失败，记录后继续，最后汇总  
2. 自行补充用例：在方向指导范围内，test-agent 自行判断  
3. 不超出范围：不测试 v3.0 范围之外的功能  
4. 先跑已有用例，再跑新增用例  
5. Playwright 操作参考：docs/test/README.md 2.3 节已验证经验  
```  

### 6.6 测试报告格式（固定模板）  

追加写入 `docs/test/3.0 test.md` 对应 Gate 区域：  

```  
执行时间：{{datetime}}  
执行 Agent：test-agent  

## 总览  
回归测试：X/11 通过  
新增用例：X/X 通过  
Gate 结论：通过 ✅ / 不通过 ❌  

## 失败详情  
（仅列出失败项）  
用例 ID：UT-XX  
步骤：[描述]  
期望：[期望结果]  
实际：[实际结果]  

## 建议  
（test-agent 自行判断是否有值得注意的观察，无则填"无"）  
```  

---  

## 七、技术栈使用情况  

| 技术 | v2.0 使用程度 | v3.0 目标 |  
|---|---|---|  
| FastAPI | ✅ 完整使用 | ✅ 不变 |  
| LangChain | ⚠️ 仅用 ChatOpenAI | ✅ PromptTemplate + Parser + Memory |  
| MiniMax 模型 | abab6.5s-chat | ✅ M2.7-highspeed（v2.0 已切换） |  
| shadcn/ui | ❌ 未使用 | ✅ Dialog + DropdownMenu + Sonner |  
| assistant-ui | ❌ 未使用 | ✅ MessagePrimitive + ComposerPrimitive + Reasoning |  
| Supabase | ✅ 完整使用 | ✅ 不变 |  
| Next.js 14 | ✅ 完整使用 | ✅ 不变 |  
| React Flow | ✅ 完整使用 | ✅ 不变 |  
| Playwright | ✅ E2E 测试 | ✅ 继续使用（视觉验收扩展） |  

---  

*文档版本 v3.0 | CurioSync*  
*前置版本：v2.0（基线已冻结）*  
*Agent 配置：.claude/agents/（全部已冻结）*  
*根配置：CLAUDE.md（已完成）*  
*对应测试文档：docs/test/3.0 test.md*  
*测试方法论：docs/test/README.md*  
```