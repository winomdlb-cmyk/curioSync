from typing import Optional
from database import get_supabase


class GraphService:
    def __init__(self):
        self.supabase = get_supabase()

    async def update_graph(self, topic_id: str, extracted_data: dict):
        """
        extracted_data 格式：
        {
          "new_nodes": [{"label": "表面张力", "description": "..."}],
          "new_edges": [
            {"source_label": "分子引力", "target_label": "表面张力", "relation": "导致"}
          ],
          "nodes_to_update": [
            {"label": "表面张力", "mastery_level": "UNDERSTOOD"}
          ]
        }
        """
        # 处理新节点（支持字符串或对象格式）
        new_nodes = extracted_data.get("new_nodes", [])
        for node in new_nodes:
            if isinstance(node, str):
                await self._add_node(topic_id, node, None)
            elif isinstance(node, dict):
                await self._add_node(topic_id, node.get("label", ""), node.get("description"))

        # 处理新边
        new_edges = extracted_data.get("new_edges", [])
        for edge in new_edges:
            if isinstance(edge, dict):
                await self._add_edge(
                    topic_id,
                    edge.get("source_label", ""),
                    edge.get("target_label", ""),
                    edge.get("relation"),
                )

        # 处理节点更新（支持字符串或对象格式）
        nodes_to_update = extracted_data.get("nodes_to_update", [])
        for node in nodes_to_update:
            if isinstance(node, str):
                await self._update_node_mastery(topic_id, node, "UNDERSTOOD")
            elif isinstance(node, dict):
                await self._update_node_mastery(
                    topic_id, node.get("label", ""), node.get("mastery_level", "UNDERSTOOD")
                )

    async def _add_node(
        self, topic_id: str, label: str, description: Optional[str] = None
    ):
        """检查节点是否已存在，不存在则插入"""
        # 查找是否已存在
        existing = (
            self.supabase.table("knowledge_nodes")
            .select("id")
            .eq("topic_id", topic_id)
            .eq("label", label)
            .execute()
        )

        if existing.data:
            return existing.data[0]["id"]

        # 获取现有节点数量，用于计算位置
        existing_count = (
            self.supabase.table("knowledge_nodes")
            .select("id")
            .eq("topic_id", topic_id)
            .execute()
        )
        position = self._assign_position(len(existing_count.data))

        # 插入新节点
        result = (
            self.supabase.table("knowledge_nodes")
            .insert(
                {
                    "topic_id": topic_id,
                    "label": label,
                    "description": description,
                    "position_x": position[0],
                    "position_y": position[1],
                    "mastery_level": "UNAWARE",
                }
            )
            .execute()
        )
        return result.data[0]["id"] if result.data else None

    async def _add_edge(
        self,
        topic_id: str,
        source_label: str,
        target_label: str,
        relation: Optional[str] = None,
    ):
        """添加边（如果两端节点都存在）"""
        # 查找源节点
        source = (
            self.supabase.table("knowledge_nodes")
            .select("id")
            .eq("topic_id", topic_id)
            .eq("label", source_label)
            .execute()
        )

        # 查找目标节点
        target = (
            self.supabase.table("knowledge_nodes")
            .select("id")
            .eq("topic_id", topic_id)
            .eq("label", target_label)
            .execute()
        )

        if not source.data or not target.data:
            return

        source_id = source.data[0]["id"]
        target_id = target.data[0]["id"]

        # 检查边是否已存在
        existing = (
            self.supabase.table("knowledge_edges")
            .select("id")
            .eq("topic_id", topic_id)
            .eq("source_id", source_id)
            .eq("target_id", target_id)
            .execute()
        )

        if existing.data:
            return

        # 插入新边
        self.supabase.table("knowledge_edges").insert(
            {"topic_id": topic_id, "source_id": source_id, "target_id": target_id, "relation": relation}
        ).execute()

    async def _update_node_mastery(self, topic_id: str, label: str, mastery_level: str):
        """更新节点掌握度（只升不降）"""
        LEVEL_ORDER = ["UNAWARE", "EXPOSED", "UNDERSTOOD"]

        node = (
            self.supabase.table("knowledge_nodes")
            .select("id, mastery_level")
            .eq("topic_id", topic_id)
            .eq("label", label)
            .execute()
        )

        if not node.data:
            return

        current_level = node.data[0]["mastery_level"]
        current_index = LEVEL_ORDER.index(current_level)
        new_index = LEVEL_ORDER.index(mastery_level)

        # 只升不降
        final_index = max(current_index, new_index)
        final_level = LEVEL_ORDER[final_index]

        if final_level != current_level:
            (
                self.supabase.table("knowledge_nodes")
                .update(
                    {"mastery_level": final_level, "updated_at": "now()"}
                )
                .eq("id", node.data[0]["id"])
                .execute()
            )

    async def get_graph(self, topic_id: str) -> dict:
        """返回完整图谱数据"""
        # 获取节点
        nodes_result = (
            self.supabase.table("knowledge_nodes")
            .select("*")
            .eq("topic_id", topic_id)
            .execute()
        )

        # 获取边
        edges_result = (
            self.supabase.table("knowledge_edges")
            .select("*")
            .eq("topic_id", topic_id)
            .execute()
        )

        nodes = []
        for n in nodes_result.data:
            nodes.append(
                {
                    "id": n["id"],
                    "label": n["label"],
                    "description": n.get("description"),
                    "mastery_level": n["mastery_level"],
                    "position": {"x": n["position_x"], "y": n["position_y"]},
                }
            )

        edges = []
        for e in edges_result.data:
            edges.append(
                {
                    "id": e["id"],
                    "source": e["source_id"],
                    "target": e["target_id"],
                    "relation": e.get("relation"),
                }
            )

        return {"nodes": nodes, "edges": edges}

    def _assign_position(self, existing_count: int) -> tuple[float, float]:
        """网格布局坐标计算"""
        col = existing_count % 5
        row = existing_count // 5
        x = 100 + col * 150
        y = 100 + row * 150
        return (x, y)
