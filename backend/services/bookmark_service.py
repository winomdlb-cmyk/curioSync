from database import get_supabase


class BookmarkService:
    def __init__(self):
        self.supabase = get_supabase()

    def create_bookmark(
        self,
        topic_id: str,
        conversation_id: str,
        bookmark_title: str,
        bookmark_description: str,
        message_context: str = None,
    ):
        """创建书签记录"""
        result = (
            self.supabase.table("bookmarks")
            .insert(
                {
                    "topic_id": topic_id,
                    "conversation_id": conversation_id,
                    "title": bookmark_title,
                    "description": bookmark_description,
                    "message_context": message_context,
                    "is_explored": False,
                }
            )
            .execute()
        )
        return result.data[0] if result.data else None

    def get_topic_bookmarks(self, topic_id: str):
        """获取主题下的所有书签"""
        result = (
            self.supabase.table("bookmarks")
            .select("*")
            .eq("topic_id", topic_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    def mark_as_explored(self, bookmark_id: str):
        """标记书签为已探索"""
        self.supabase.table("bookmarks").update(
            {"is_explored": True}
        ).eq("id", bookmark_id).execute()