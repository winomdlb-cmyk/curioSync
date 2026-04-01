# CurioSync 测试方法论

---

## 一、概述

### 1.1 本文档是什么

记录 CurioSync 项目测试的方法论、验证有效的经验流程、以及当前无法自动化的场景。

**核心目的：**
- 让后续测试人员快速上手
- 沉淀经验，避免重复踩坑
- 明确自动化边界，指导后续工具/方法论优化方向

### 1.2 使用方式

- 接手新功能测试前 → 先看第二部分，找到对应方法
- 遇到无法自动化的场景 → 查看第三部分，确认是否已知问题
- 解决新问题后 → 按维护规则更新本文档

### 1.3 维护规则

**什么时候需要更新：**
新的测试中出现任何问题时，无论是否解决。

**如何更新：**

- **问题已解决** → 将经验/方法/流程追加到第二部分
- **问题未解决** → 将问题及根因追加到第三部分
- 保持"方法 → 适用场景 → 坑"的记录结构
- 已失效的方法应删除或标注失效原因

---

## 二、有效的经验、方法、流程

### 2.1 阈值调整法（优先使用）

**原则：** 绕过 LLM 阈值判断，直接触发介入卡片代码路径

**适用场景：** 测试 UI 交互时，需要 LLM 自然触发介入卡片

**⚠️ 注意：** 此方法绕过了 LLM 语义判断，验证的是代码路径而非真实业务逻辑

**为什么优先用这个：**
- 测试的是完整流程：用户输入 → LLM 判断 → 介入触发 → UI 显示
- 结果更真实，反映实际用户体验

**具体操作步骤：**
1. 找到目标逻辑的阈值（`backend/services/llm_service.py` 或 `prompts/templates.py`）
2. 临时调整为极低值（如 turn_count >= 1）
3. 重启后端：`lsof -ti:8000 | xargs kill -9 && cd backend && python3 -m uvicorn main:app --reload --port 8000`
4. 执行 UI 测试
5. **立即恢复原始阈值**

**验证有效的场景：**

| 用例 | 原始阈值 | 调整后 |
|------|---------|-------|
| converge | turn_count >= 8 且 divergence_score > 0.6 | turn_count >= 1, divergence_score > 0.1 |
| transition | turn_count >= 3 且 divergence_delta < 0.15 | turn_count >= 1, divergence_delta < 0.5 |

**坑：**
- ⚠️ 每次修改后**必须立即恢复**，不可遗留到生产代码
- ⚠️ 此方法验证的是"代码路径存在且 UI 交互正常"，不是"LLM 介入判断逻辑合理"

---

### 2.2 直接注入法（阈值法失败后使用）

**原则：** 绕过 LLM，通过 API 直接操作数据库验证代码路径

**适用场景：** LLM 决策不可控时（如 bookmark），验证 UI 渲染和数据库写入路径

**⚠️ 注意：** 此方法绕过了 LLM 语义判断和真实业务逻辑，验证的是代码路径，谨慎使用

**为什么用这个：**
- 测试的是"如果 LLM 返回了介入，前端和数据库是否正确处理"
- 不依赖 LLM 输出，只验证代码路径

**具体操作步骤：**
1. 直接通过 Supabase REST API 插入测试数据（如 bookmark 记录）
2. 验证数据库写入成功
3. 验证前端能正确读取和显示

**验证有效的场景：**

| 用例 | 方法 |
|------|------|
| UT-35 bookmark 表记录验证 | 直接通过 Supabase REST API 插入并验证 |

**注意：**
- 此方法**不测试** LLM 判断是否正确，只测试代码路径
- 适合配合阈值调整法使用

**适用场景对比：**

| 方法 | 测试目标 | 适用场景 | 优先级 |
|------|---------|---------|-------|
| 阈值调整法 | LLM 判断 + UI 渲染完整流程 | converge、transition 等阈值明确的介入 | 优先 |
| 直接注入介入法 | UI 代码路径 + 数据库写入 | bookmark（LLM 决策不可控）时的端到端验证 | 次选 |

---

### 2.3 Playwright 自动化测试经验

**适用场景：** UI 交互验证、回归测试

**常用模式：**

```typescript
// 1. 创建话题 → 跳转到话题页
const topic = await fetch('http://localhost:8000/api/topics', {
  method: 'POST',
  body: JSON.stringify({ title: '测试主题' })
}).then(r => r.json());
await page.goto(`${BASE_URL}/topic/${topic.id}`);

// 2. 发送消息并等待响应
const inputArea = page.locator('textarea[placeholder*="问点什么吧"]');
await inputArea.fill('测试消息');
await page.locator('button:has-text("↑")').click();
await page.waitForTimeout(8000); // 流式响应需要足够等待时间

// 3. 等待特定元素出现
await expect(page.locator('text=期望的文本')).toBeVisible({ timeout: 5000 });

// 4. API 预设对话状态
await fetch(`/api/conversations/${convId}/state`, {
  method: 'PUT',
  body: JSON.stringify({ divergence_score: 0.8, turn_count: 10 })
});
```

**坑：**

| 问题 | 原因 | 解决 |
|------|------|------|
| 流式响应测试不稳定 | waitForResponse 太快 | 用 `waitForTimeout(8000)` 代替 |
| 元素选中失败 | 选择器不精确 | 用 `has-text()` 而非精确文本匹配 |
| 重复的初始状态覆盖消息 | `onDone` 调用 `loadTopicData` | 移除重复的状态更新 |

**验证有效的流程：**
```
创建话题 → 发送消息 → 等待响应 → 验证 UI 变化 → 验证数据库（如需要）
```

**运行命令：**
```bash
cd frontend
npx playwright test                                    # 运行所有测试
npx playwright test --grep "UT-31"                     # 运行特定测试
```

---

### 2.4 API/数据库验证经验

**适用场景：** 验证后端逻辑、数据持久化、跨表一致性

**查询 Supabase：**
```bash
curl -X GET "${SUPABASE_URL}/rest/v1/bookmarks?topic_id=eq.${id}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}"
```

**预设对话状态（对部分场景有效）：**
```bash
PUT /api/conversations/{id}/state
{
  "divergence_score": 0.8,
  "turn_count": 10,
  "last_intervention": "none"
}
```

**坑：**
- ⚠️ 状态预设对 **LLM 生成决策类**（如 bookmark）无效，因为 LLM 会综合判断而非只读状态

---

## 三、尚无法自动化的测试问题

### UT-27 图谱节点未生成（v2.0 流程已通）

**现象：** 发送消息后，Supabase `knowledge_nodes` 表中无新节点创建

**根因：** Prompt 设计缺陷 - `knowledge_extraction` 只有格式定义，没有告诉 LLM 何时应该提取新节点

**现状：**
- v2.0 阶段：部分话题能生成节点（如 UT-11 有 39 节点），说明流程已通
- 部分话题不生成节点：是 Prompt 设计问题，LLM 靠猜测决定是否提取
- v3.0 待优化：在 Prompt 中增加明确提取规则

**建议：** v3.0 时在 prompt 的 `knowledge_extraction` 部分增加说明：
```
"knowledge_extraction": {
  "new_nodes": [
    // 当用户引入新概念时填写，已知概念不填
  ]
}
```

---

### UT-27 图谱节点未生成

**具体问题：** 对话后切换到图谱视图，未观察到新节点出现

**状态：** ⚠️ 需调查（可能是数据问题或 UI 问题，需手动进一步验证）

---

### 根因分类

| 根因 | 影响场景 | 可能的优化方向 |
|------|---------|--------------|
| LLM 语义判断过于严格 | bookmark 触发 | 考虑拆分"介入判断"为独立 Agent |
| - | - | 或提供"强制介入"调试模式 |

---

*最后更新：2026-03-30*
