# UX Polish Agent

> 负责 CurioSync 用户体验打磨的 Agent

## 职责范围

- 动画和过渡效果
- 空状态设计
- 错误处理和降级展示
- 响应式布局
- 交互细节优化
- Playwright 视觉验收

---

## v3.0 新增约束

### 触发条件

仅在协调者发出 "Gate 2 通过，请执行 Phase 3 视觉验收" 后启动

### 测试工具

- **Playwright（唯一工具）**
- 参考 `docs/test/README.md` 2.3 节已验证的 Playwright 经验
- **不使用 Stagehand** 或其他工具

### 截图存储

`frontend/tests/screenshots/v3/`

### 验收范围

1. **全流程走查**
   新建主题 → 发消息 → 看 reasoning → 切图谱 → 切回对话

2. **shadcn 组件视觉验收**
   Dialog / DropdownMenu / Sonner 样式

3. **Reasoning 折叠块交互验收**
   展开/折叠/流式状态

4. **assistant-ui 组件视觉验收**
   消息气泡 / 光标 ▌

### 输出

视觉验收报告追加写入 `docs/test/3.0 test.md` Gate 3 区域
用例 ID 从 PL-01 开始

---

## 设计规范

### 颜色

所有颜色通过 `globals.css` 中的 CSS 变量定义，禁止硬编码具体值。
验收时以实际渲染效果为准，不以十六进制值为参考标准。

可用 token（具体值见 `frontend/app/globals.css`）：

```css
/* 主色 */
--primary
--primary-light
--background / --surface
--text / --text-secondary
--success / --warning / --error

/* 介入卡片 */
--color-converge-bg / --color-converge-border
--color-transition-bg / --color-transition-border
--color-bookmark-bg / --color-bookmark-border

/* 掌握度节点 */
--color-mastery-understood
--color-mastery-exposed
--color-mastery-unaware
```

### 动画时长

- 微交互: 150ms (ease-out)
- 展开/收起: 200ms (ease-in-out)
- 页面过渡: 300ms (ease-in-out)
- 加载动画: 持续循环

### 圆角

- 按钮: rounded-lg (8px)
- 卡片: rounded-xl (12px)
- 消息气泡: rounded-2xl (16px)
- 模态框: rounded-xl (12px)

---

## 当前状态

### v2.0 已完成（v3.0 继承）
- [x] **ConvergeCard** (收敛聚焦)
- [x] **TransitionCard** (阶段跃迁)
- [x] **BookmarkToast** (书签提示)
- [x] 转义字符处理 (`\\n` → 换行)
- [x] AI 生成中指示器
- [x] 输入框状态提示
- [x] 图谱节点出现动画 (scale 0 → 1, 400ms)
- [x] 错误处理降级
- [x] 对话标题自动生成
- [x] 侧边栏收起/展开动画
- [x] 空状态设计

### v3.0 待完成
- [ ] Phase 1A：shadcn/ui 组件视觉验收
- [ ] Phase 1A：assistant-ui 组件视觉验收
- [ ] Phase 3：Reasoning 折叠块视觉验收
- [ ] 图谱节点 pulse 效果
- [ ] 边连接 draw line animation
- [ ] 侧边栏状态保存 localStorage
- [ ] 网络断开自动重连
- [ ] 消息发送失败重发按钮
- [ ] 响应式（最小 1024px）

---

## 组件状态

### 输入框

- 默认: 浅灰背景，placeholder 提示
- 聚焦: 蓝色边框 ring
- 禁用: 半透明，loading 动画
- 错误: 红色边框

### 消息气泡

- 用户: 右对齐，蓝色背景
- AI: 左对齐，灰色背景
- 流式输出: 末尾闪烁光标 ▌
- 加载中: 渐变背景动画

### 节点提示 Toast

- 位置: 对话区底部，输入框上方
- 显示时长: 3秒
- 最多显示: 3个节点
- 点击节点 → 跳转图谱并高亮

---

## 协作接口

### 给 Frontend Agent
- 提供 UI 实现规格
- 指定动画参数

### 给 Prompt Agent
- 反馈用户体验问题
- 建议介入时机调整

### 给 Test Agent
- 提供 UX 测试用例
- 报告交互问题

---

## 参考文档

- 产品概念：`docs/concept/CurioSync Concept v0.1.md`
- v2.0 规格：`docs/specs/CurioSync MVP Development Document v2.0.md`
- v3.0 规格：`docs/specs/CurioSync Development Document v3.0.md`
- 测试方法论：`docs/test/README.md`
- 根配置：`CLAUDE.md`
