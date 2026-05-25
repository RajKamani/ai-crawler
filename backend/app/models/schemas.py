from pydantic import BaseModel, Field, HttpUrl, field_validator
from uuid import UUID
from typing import Optional, Literal

class BookmarkCreate(BaseModel):
    post_id: UUID

class SubredditAdd(BaseModel):
    subreddit_name: str = Field(..., min_length=1)

    @field_validator('subreddit_name')
    @classmethod
    def clean_subreddit_name(cls, v: str) -> str:
        # Strip spaces, lower case, remove leading 'r/' or '/r/'
        v = v.strip().lower()
        if v.startswith('/r/'):
            v = v[3:]
        elif v.startswith('r/'):
            v = v[2:]
        v = v.strip('/')
        if not v:
            raise ValueError("Subreddit name cannot be empty")
        return v

class BlogAdd(BaseModel):
    name: str = Field(..., min_length=1)
    url: HttpUrl

class CrawlerTrigger(BaseModel):
    crawler: Literal['blog_global', 'blog_user', 'reddit_global', 'reddit_user', 'github_trending']

class CrawlerSettingUpdate(BaseModel):
    interval_minutes: Optional[int] = Field(None, ge=5, le=10080)
    is_active: Optional[bool] = None

class SummaryRequest(BaseModel):
    post_id: UUID

class PostViewMark(BaseModel):
    post_id: UUID

class NotificationTokenRegister(BaseModel):
    expo_push_token: str = Field(..., min_length=1)
    device_name: Optional[str] = None

class ToggleActiveState(BaseModel):
    is_active: bool

