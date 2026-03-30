# Test Agent

> 负责 CurioSync 测试的 Agent

## 职责范围

- E2E 测试（Playwright）
- API 测试
- 性能测试
- 测试报告生成和维护

## 测试文件结构

```
frontend/tests/
├── e2e.spec.ts          # Playwright E2E 测试
└── TEST_REPORT.md       # 测试报告
```

## E2E 测试用例

### UT-01: 打开首页
- [x] 页面加载、标题验证
- [x] 新建按钮、Modal 正常

### UT-02: 创建主题
- [x] 跳转主题页
- [x] 返回主页显示新主题

### UT-03: 发送消息
- [x] 消息发送成功
- [x] AI 响应显示

### UT-04: 切换对话
- [x] 多对话切换
- [x] 空状态显示

### UT-05: 删除对话
- [x] 删除功能正常
- [x] 自动切换到其他对话

### UT-06: 切换视图
- [ ] 对话视图 ↔ 知识图谱视图切换
- [ ] 返回对话按钮

### UT-07: 知识图谱交互
- [x] 空图谱状态显示
- [x] 节点点击显示详情

### UT-08: 侧边栏收起/展开
- [x] 动画效果正常

### UT-09: 返回主页
- [x] 导航正常
- [x] 话题列表更新

## API 测试用例

### Topics API
- [x] GET /api/topics - 获取所有主题
- [x] POST /api/topics - 创建主题
- [x] GET /api/topics/{id} - 获取主题详情
- [x] DELETE /api/topics/{id} - 删除主题
- [x] 无效 UUID 返回 404

### Conversations API
- [x] GET /api/conversations - 获取对话列表
- [x] POST /api/conversations - 创建对话
- [x] GET /api/conversations/{id}/messages - 获取消息
- [x] DELETE /api/conversations/{id} - 删除对话
- [x] 无效 UUID 返回 404

### Chat API
- [x] SSE 流式响应
- [ ] 推理内容过滤
- [x] 状态更新

### Knowledge API
- [x] GET /api/knowledge/graph - 获取图谱
- [x] GET /api/knowledge/nodes/{id} - 获取节点详情
- [x] 无效 UUID 返回 404

## 运行测试

```bash
# 运行所有测试
npx playwright test

# 运行单个测试
npx playwright test tests/e2e.spec.ts:36

# 带调试
npx playwright test --debug
```

## 测试报告

测试报告位于 `frontend/tests/TEST_REPORT.md`，包含：
- 测试概览（通过率）
- API 测试结果
- E2E 测试结果
- Bug 列表
- 改进建议

## 当前问题

1. **超时问题**: 部分测试因 `waitForLoadState('networkidle')` 超时
   - 原因: SSE 流式请求导致网络不空闲
   - 解决: 使用固定等待或条件等待替代

2. **选择器问题**: 部分 CSS 选择器不够精确
   - 解决: 使用更具体的选择器或 data-testid

3. **页面状态同步**: 导航后状态更新不及时
   - 解决: 添加适当的等待或刷新逻辑

## 测试覆盖目标

### Phase 4 完成后
- [ ] 所有 9 个 E2E 测试通过
- [ ] 所有 API 测试通过
- [ ] 推理内容完全被过滤
- [ ] 页面加载时间 < 2s

### 性能测试
- [ ] 主题列表加载 < 500ms
- [ ] 对话切换 < 300ms
- [ ] 知识图谱渲染 < 1s（< 50 节点）

## 协作接口

### 给 Frontend Agent
- 提供 UI 测试反馈
- 报告选择器问题

### 给 Backend Agent
- 报告 API 测试问题
- 提供性能测试数据

### 给 UX Polish Agent
- 提供用户体验问题反馈

## 参考文档

- 产品概念: `docs/concept/CurioSync Concept v0.1.md`
- 开发规格: `docs/specs/CurioSync MVP Development Document v2.0.md`
- 根配置: `CLAUDE.md`
