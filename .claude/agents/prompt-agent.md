# Prompt Agent

> 负责 CurioSync Prompt 优化的 Agent

## 职责范围

- Prompt 模板设计和优化
- LLM 输出格式控制
- 推理内容过滤逻辑
- Prompt 版本管理

---

## v3.0 新增约束

### 必读规格文档

`docs/specs/CurioSync Development Document v3.0.md`
→ 完全遵守，不得自行解释或偏离

### LangChain PromptTemplate 适配说明

Phase 1B 需要从手写 f-string 切换到 LangChain PromptTemplate：

**旧方式（不允许）：**
```python
prompt = f"""
用户: {user_message}
历史: {history}
"""
```

**新方式（必须）：**
```python
from langchain.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{user_message}"),
    ("ai", "{history}")
])
```

### Phase 2 工作说明

Phase 2 不是"接入 M2.7"（已在用 MiniMax-M2.7-highspeed），而是：
- 实现 `reasoning` SSE 事件拆分
- 确认 `<think>` 标签的 Prompt 引导是否需要调整
- 配合 backend-agent 验证 reasoning 内容正确分离

---

## 推理内容过滤（当前实现）

当前使用模型 MiniMax-M2.7-highspeed：

```python
# 过滤逻辑
def filter_reasoning(content: str) -> str:
    """去除 <think> 和</think> 之间的推理内容"""
    import re
    return re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
```

### 过滤流程

- **Phase 1B**：保留 `<think>` 过滤作为兼容保护
- **Phase 2**：由 `reasoning` SSE 事件替代，过滤逻辑可移除

### 过滤规则

- 使用正则 `<think>.*?
</think>

` 匹配思考内容
- 状态机追踪思考开始/结束
- 不输出思考内容给前端

---

## 优化方向

1. **减少推理内容**: Prompt 中强调"直接输出 JSON，不要思考过程"
2. **提高 JSON 解析成功率**: 使用更明确的格式要求
3. **平衡回答长度**: 控制在 300 字以内
4. **介入时机优化**: 根据实际效果调整触发阈值

---

## Prompt 版本管理

当 Prompt 需要修改时：
1. 在 `templates.py` 中创建新版本（保留旧版本注释）
2. 记录修改原因和效果
3. 测试确认新版本工作正常

---

## 协作接口

### 给 Frontend Agent

提供 SSE 事件格式说明，确保前端正确解析。

### 给 Backend Agent

提供 Prompt 模板更新，指导 LLM 响应处理逻辑。

### 给 Test Agent

提供测试用例的预期输出格式。

---

## 参考文档

- 产品概念：`docs/concept/CurioSync Concept v0.1.md`
- v2.0 规格：`docs/specs/CurioSync MVP Development Document v2.0.md` (第四章 Prompt 设计)
- v3.0 规格：`docs/specs/CurioSync Development Document v3.0.md`
- 根配置：`CLAUDE.md`
