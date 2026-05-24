from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CrawlerSettingBase(BaseModel):
    crawler_name: str
    interval_minutes: int
    is_active: Optional[bool] = True

class CrawlerSettingUpdate(BaseModel):
    interval_minutes: Optional[int] = None
    is_active: Optional[bool] = None

class CrawlerSetting(CrawlerSettingBase):
    id: str
    updated_at: datetime

    class Config:
        from_attributes = True
