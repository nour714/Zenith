"""
Repository pattern for Custom Tasks SQL operations (PostgreSQL).
User-scoped for multi-tenancy.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.core.exceptions import ResourceNotFoundException
from app.models.task import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, conn) -> None:
        self.conn = conn

    def create(self, task: TaskCreate, user_id: int) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO zenith_custom_tasks (user_id, title, description, priority, category, due_date, is_completed)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (
                user_id,
                task.title,
                task.description,
                task.priority,
                task.category,
                task.due_date,
                1 if task.is_completed else 0
            )
        )
        row = cursor.fetchone()
        return dict(row)

    def get_all(
        self,
        user_id: int,
        category: Optional[str] = None,
        completed: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        query = "SELECT * FROM zenith_custom_tasks WHERE user_id = %s"
        params: List[Any] = [user_id]

        if category:
            query += " AND category = %s"
            params.append(category)
        if completed is not None:
            query += " AND is_completed = %s"
            params.append(1 if completed else 0)

        query += " ORDER BY is_completed ASC, created_at DESC"
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_by_id(self, task_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_custom_tasks WHERE id = %s AND user_id = %s", (task_id, user_id))
        row = cursor.fetchone()
        return dict(row) if row else None

    def update(self, task_id: int, task: TaskUpdate, user_id: int) -> Dict[str, Any]:
        existing = self.get_by_id(task_id, user_id)
        if not existing:
            raise ResourceNotFoundException("Task", task_id)

        update_fields = []
        values = []
        data = task.model_dump(exclude_unset=True)

        for field, val in data.items():
            if field == "is_completed" and val is not None:
                update_fields.append("is_completed = %s")
                values.append(1 if val else 0)
                update_fields.append("completed_at = %s")
                values.append(datetime.utcnow().isoformat() if val else None)
            else:
                update_fields.append(f"{field} = %s")
                values.append(val)

        if not update_fields:
            return existing

        values.extend([task_id, user_id])
        sql = f"UPDATE zenith_custom_tasks SET {', '.join(update_fields)} WHERE id = %s AND user_id = %s RETURNING *;"
        cursor = self.conn.cursor()
        cursor.execute(sql, values)
        row = cursor.fetchone()
        return dict(row)

    def delete(self, task_id: int, user_id: int) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM zenith_custom_tasks WHERE id = %s AND user_id = %s", (task_id, user_id))
        return cursor.rowcount > 0
