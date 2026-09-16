"""
Business logic service for custom tasks.
"""
from typing import Any, Dict, List, Optional
from app.db.repositories.task_repo import TaskRepository
from app.models.task import TaskCreate, TaskUpdate


class TaskService:
    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def create_task(self, task: TaskCreate) -> Dict[str, Any]:
        return self.repo.create(task)

    def get_all_tasks(self, category: Optional[str] = None, completed: Optional[bool] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all(category=category, completed=completed)

    def get_task_by_id(self, task_id: int) -> Optional[Dict[str, Any]]:
        return self.repo.get_by_id(task_id)

    def update_task(self, task_id: int, task: TaskUpdate) -> Dict[str, Any]:
        return self.repo.update(task_id, task)

    def toggle_task(self, task_id: int) -> Dict[str, Any]:
        task = self.repo.get_by_id(task_id)
        if not task:
            from app.core.exceptions import ResourceNotFoundException
            raise ResourceNotFoundException("Task", task_id)
        new_status = not bool(task["is_completed"])
        return self.repo.update(task_id, TaskUpdate(is_completed=new_status))

    def delete_task(self, task_id: int) -> bool:
        return self.repo.delete(task_id)
