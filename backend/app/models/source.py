from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class SourceBase(BaseModel):
    name: str
    type: str  # 'blog', 'reddit', 'github'
    url: str
    is_active: Optional[bool] = True
    crawl_frequency_minutes: Optional[int] = 60

class SourceCreate(SourceBase):
    pass

class Source(SourceBase):
    id: str
    created_at: datetime
    last_crawled_at: Optional[datetime] = None

    class Config:
        from_attributes = True
