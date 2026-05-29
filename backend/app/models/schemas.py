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
    interval_minutes: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator('interval_minutes')
    @classmethod
    def validate_interval_minutes(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        # 1. Standard interval: 5 to 10080 minutes (7 days)
        if 5 <= v <= 10080:
            return v
        # 2. Daily time code: -1440 to -1 (minutes past midnight, 1-indexed negative)
        if -1440 <= v <= -1:
            return v
        # 3. Specific timestamp in minutes: >= 1000000
        if v >= 1000000:
            return v
        raise ValueError(
            "interval_minutes must be an interval (5-10080), "
            "a daily time code (-1440 to -1), or specific datetime epoch minutes (>= 1000000)"
        )


class SummaryRequest(BaseModel):
    post_id: UUID

class PostViewMark(BaseModel):
    post_id: UUID

class NotificationTokenRegister(BaseModel):
    expo_push_token: str = Field(..., min_length=1)
    device_name: Optional[str] = None

class ToggleActiveState(BaseModel):
    is_active: bool

