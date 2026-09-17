"""
Business logic service for custom tasks with user-scoping.
"""
from typing import Any, Dict, List, Optional
from app.db.repositories.task_repo import TaskRepository
from app.models.task import TaskCreate, TaskUpdate
from app.core.exceptions import ResourceNotFoundException


class TaskService:
    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def create_task(self, task: TaskCreate, user_id: int) -> Dict[str, Any]:
        return self.repo.create(task, user_id)

    def get_all_tasks(self, user_id: int, category: Optional[str] = None, completed: Optional[bool] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all(user_id=user_id, category=category, completed=completed)

    def get_task_by_id(self, task_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        return self.repo.get_by_id(task_id, user_id)

    def update_task(self, task_id: int, task: TaskUpdate, user_id: int) -> Dict[str, Any]:
        return self.repo.update(task_id, task, user_id)

    def toggle_task(self, task_id: int, user_id: int) -> Dict[str, Any]:
        task = self.repo.get_by_id(task_id, user_id)
        if not task:
            raise ResourceNotFoundException("Task", task_id)
        new_status = not bool(task["is_completed"])
        return self.repo.update(task_id, TaskUpdate(is_completed=new_status), user_id)

    def delete_task(self, task_id: int, user_id: int) -> bool:
        return self.repo.delete(task_id, user_id)
