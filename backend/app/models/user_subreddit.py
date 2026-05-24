from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserSubredditBase(BaseModel):
    subreddit_name: str
    is_active: Optional[bool] = True

class UserSubredditCreate(UserSubredditBase):
    pass

class UserSubreddit(UserSubredditBase):
    id: str
    user_id: str
    added_at: datetime
    last_crawled_at: Optional[datetime] = None

    class Config:
        from_attributes = True
