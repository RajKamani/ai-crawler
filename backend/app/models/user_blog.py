from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class UserBlogBase(BaseModel):
    blog_name: str
    blog_url: str
    is_active: Optional[bool] = True

class UserBlogCreate(UserBlogBase):
    pass

class UserBlog(UserBlogBase):
    id: str
    user_id: str
    added_at: datetime
    last_crawled_at: Optional[datetime] = None

    class Config:
        from_attributes = True
