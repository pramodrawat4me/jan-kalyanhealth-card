from typing import Generic, TypeVar

from pydantic import BaseModel

DataT = TypeVar("DataT")


class Meta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: DataT | None = None
    message: str | None = None
    meta: Meta | None = None


class ApiError(BaseModel):
    success: bool = False
    error: str
    message: str
    fields: dict[str, str] | None = None


def build_meta(page: int, limit: int, total: int) -> Meta:
    total_pages = (total + limit - 1) // limit if limit else 0
    return Meta(page=page, limit=limit, total=total, total_pages=max(total_pages, 1) if total else 0)
