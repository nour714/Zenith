"""
API endpoints for Custom Tasks management.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.deps import get_task_service, verify_auth
from app.services.task_service import TaskService
from app.models.task import TaskCreate, TaskUpdate
from app.models.common import APIResponse

router = APIRouter()


@router.post("", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_auth)])
def create_task(
    task: TaskCreate,
    service: TaskService = Depends(get_task_service)
) -> APIResponse[Dict[str, Any]]:
    new_task = service.create_task(task)
    return APIResponse(message="تمت إضافة المهمة بنجاح", data=new_task)


@router.get("", response_model=APIResponse[List[Dict[str, Any]]])
def list_tasks(
    category: Optional[str] = Query(None),
    completed: Optional[bool] = Query(None),
    service: TaskService = Depends(get_task_service)
) -> APIResponse[List[Dict[str, Any]]]:
    tasks = service.get_all_tasks(category=category, completed=completed)
    return APIResponse(data=tasks)


@router.get("/{task_id}", response_model=APIResponse[Dict[str, Any]])
def get_task(
    task_id: int,
    service: TaskService = Depends(get_task_service)
) -> APIResponse[Dict[str, Any]]:
    task = service.get_task_by_id(task_id)
    if not task:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("Task", task_id)
    return APIResponse(data=task)


@router.put("/{task_id}", response_model=APIResponse[Dict[str, Any]], dependencies=[Depends(verify_auth)])
def update_task(
    task_id: int,
    task: TaskUpdate,
    service: TaskService = Depends(get_task_service)
) -> APIResponse[Dict[str, Any]]:
    updated = service.update_task(task_id, task)
    return APIResponse(message="تم تحديث المهمة بنجاح", data=updated)


@router.patch("/{task_id}/toggle", response_model=APIResponse[Dict[str, Any]], dependencies=[Depends(verify_auth)])
def toggle_task(
    task_id: int,
    service: TaskService = Depends(get_task_service)
) -> APIResponse[Dict[str, Any]]:
    result = service.toggle_task(task_id)
    return APIResponse(message="تم تحديث حالة المهمة", data=result)


@router.delete("/{task_id}", response_model=APIResponse[bool], dependencies=[Depends(verify_auth)])
def delete_task(
    task_id: int,
    service: TaskService = Depends(get_task_service)
) -> APIResponse[bool]:
    deleted = service.delete_task(task_id)
    return APIResponse(message="تم حذف المهمة", data=deleted)
