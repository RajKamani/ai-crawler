from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Any
from datetime import datetime

class PostBase(BaseModel):
    title: str
    content: Optional[str] = None
    url: str
    author: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    ai_summary: Optional[str] = None
    raw_data: Optional[Any] = None
    published_at: datetime

class PostCreate(PostBase):
    source_id: str

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    ai_summary: Optional[str] = None

class Post(PostBase):
    id: str
    source_id: str
    created_at: datetime

    class Config:
        from_attributes = True
