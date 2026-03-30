from database import get_supabase


class MasteryService:
    LEVEL_ORDER = ["UNAWARE", "EXPOSED", "UNDERSTOOD"]

    def __init__(self):
        self.supabase = get_supabase()

    def infer_level(
        self, current_level: str, signal: str, topic_id: str = None, topic_label: str = None
    ) -> str:
        """
        signal → target_level 映射：
          asking_basic  → EXPOSED
          asking_why    → UNDERSTOOD
          applying      → UNDERSTOOD
          explaining    → UNDERSTOOD

        只升不降原则
        """
        signal_to_level = {
            "asking_basic": "EXPOSED",
            "asking_why": "UNDERSTOOD",
            "applying": "UNDERSTOOD",
            "explaining": "UNDERSTOOD",
        }

        target_level = signal_to_level.get(signal, "UNAWARE")
        target_index = self.LEVEL_ORDER.index(target_level)
        current_index = self.LEVEL_ORDER.index(current_level)

        return self.LEVEL_ORDER[max(target_index, current_index)]

    async def update_mastery(
        self, topic_id: str, topic_label: str, mastery_level: str
    ):
        """更新知识节点的掌握度"""
        node = (
            self.supabase.table("knowledge_nodes")
            .select("id, mastery_level")
            .eq("topic_id", topic_id)
            .eq("label", topic_label)
            .execute()
        )

        if not node.data:
            return

        current_level = node.data[0]["mastery_level"]
        new_level = self.infer_level(current_level, mastery_level)

        if new_level != current_level:
            (
                self.supabase.table("knowledge_nodes")
                .update({"mastery_level": new_level, "updated_at": "now()"})
                .eq("id", node.data[0]["id"])
                .execute()
            )
