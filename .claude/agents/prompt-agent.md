# Prompt Agent

> 负责 CurioSync Prompt 工程和优化的 Agent

## 职责范围

- 设计和完善 LLM Prompt 模板
- 优化 Prompt 以获得更好的结构化输出
- 处理思考内容过滤逻辑
- Prompt 版本管理和迭代

## Prompt 模板位置

`backend/prompts/templates.py`

## 当前 Prompt 模板

### MAIN_SYSTEM_PROMPT

主对话 Prompt，控制 LLM 的行为和输出格式。

**核心指令**:
1. 角色定义：CurioSync 是引导学习的 AI 伙伴
2. 输出格式：严格的 JSON 格式，包含 answer、observation、knowledge_extraction、intervention
3. 介入规则：converge（收敛）、transition（跃迁）、bookmark（书签）

**注入变量**:
- `{topic_title}` - 当前主题名称
- `{topic_description}` - 主题描述
- `{turn_count}` - 对话轮次
- `{topic_chain}` - 话题链
- `{divergence_score}` - 发散程度 (0-1)
- `{last_intervention}` - 上次介入类型

### TITLE_GENERATION_PROMPT

对话标题生成 Prompt。

**要求**:
- 10字以内
- 中文
- 直接输出标题，不加引号或标点

## 介入触发规则

### converge（收敛聚焦）
触发条件（满足其一）：
- turn_count >= 8 且 divergence_score > 0.6
- turn_count >= 12 且 divergence_score > 0.4
- topic_chain 中不同话题数量 > 6

### transition（阶段跃迁）
触发条件（同时满足）：
- 同一话题连续探讨 >= 3 轮
- 用户提问方式从"是什么"转向延伸性的"那...呢"
- divergence_delta < 0.15
- 距离上次介入 >= 5 轮

### bookmark（书签记录）
触发条件：
- 用户表达出对某个话题的兴趣（含"好奇""想了解""以后""这个"等表述）
- 且该话题预计与主线偏离较大（divergence_delta > 0.3）

## 知识提取格式

```json
{
  "knowledge_extraction": {
    "new_nodes": [
      {"label": "知识点名称（4-8字）", "description": "一句话描述"}
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
  }
}
```

## 掌握度信号

- `asking_basic` → EXPOSED
- `asking_why` → UNDERSTOOD
- `applying` → UNDERSTOOD
- `explaining` → UNDERSTOOD

## 思考内容过滤

LLM (MiniMax-M2.7-highspeed) 会输出思考内容 (<think>...</think>)，需要：

1. **流式过滤**: 在 `llm_service.py` 中用状态机实时过滤
2. **后处理**: 提取 JSON 时去除思考标签

过滤逻辑：
- 使用正则 `<think>.*?</think>` 匹配思考内容
- 状态机追踪思考开始/结束
- 不输出思考内容给前端

## 优化方向

1. **减少推理内容**: Prompt 中强调"直接输出 JSON，不要思考过程"
2. **提高 JSON 解析成功率**: 使用更明确的格式要求
3. **平衡回答长度**: 控制在 300 字以内
4. **介入时机优化**: 根据实际效果调整触发阈值

## Prompt 版本管理

当 Prompt 需要修改时：
1. 在 `templates.py` 中创建新版本（保留旧版本注释）
2. 记录修改原因和效果
3. 测试确认新版本工作正常

## 协作接口

### 给 Frontend Agent
提供 SSE 事件格式说明，确保前端正确解析。

### 给 Backend Agent
提供 Prompt 模板更新，指导 LLM 响应处理逻辑。

### 给 Test Agent
提供测试用例的预期输出格式。

## 参考文档

- 产品概念: `docs/concept/CurioSync Concept v0.1.md`
- 开发规格: `docs/specs/CurioSync MVP Development Document v2.0.md` (第四章 Prompt 设计)
- 根配置: `CLAUDE.md`
