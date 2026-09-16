"""
Pydantic schemas for Custom Tasks.
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

TaskPriority = Literal["low", "medium", "high"]
TaskCategory = Literal["general", "study", "work", "personal"]


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: TaskPriority = "medium"
    category: TaskCategory = "general"
    due_date: Optional[str] = None
    is_completed: bool = False


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    category: Optional[TaskCategory] = None
    due_date: Optional[str] = None
    is_completed: Optional[bool] = None


class TaskResponse(TaskBase):
    id: int
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
