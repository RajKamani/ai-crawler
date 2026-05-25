import logging
from fastapi import APIRouter, HTTPException, Depends, Body
from app.database import supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])
logger = logging.getLogger(__name__)

@router.get("/crawlers")
async def get_crawler_settings(user = Depends(get_current_user)):
    """Fetch all crawler schedule configurations"""
    try:
        res = supabase.table("crawler_settings") \
            .select("*") \
            .order("crawler_name") \
            .execute()
        return {"settings": res.data, "count": len(res.data)}
    except Exception as e:
        logger.error(f"Error fetching crawler settings: {e}")
        raise HTTPException(500, f"Failed to fetch settings: {str(e)}")

@router.patch("/crawlers/{name}")
async def update_crawler_setting(
    name: str, 
    body: dict = Body(...),
    user = Depends(get_current_user)
):
    """Update crawler schedule interval or active status"""
    interval = body.get("interval_minutes")
    is_active = body.get("is_active")

    updates = {}
    if interval is not None:
        if interval == 0 or interval < -1440:
            raise HTTPException(400, "Invalid schedule configuration. Interval must be positive or between -1 and -1440 for daily schedules.")
        updates["interval_minutes"] = interval
    
    if is_active is not None:
        updates["is_active"] = is_active

    if not updates:
        raise HTTPException(400, "Nothing to update")

    updates["updated_at"] = "now()"

    try:
        res = supabase.table("crawler_settings") \
            .update(updates) \
            .eq("crawler_name", name) \
            .execute()
        
        if not res.data:
            raise HTTPException(404, f"Crawler settings for '{name}' not found")
        
        return {
            "setting": res.data[0], 
            "message": f"Crawler '{name}' updated. Scheduler will apply changes within 3 minutes."
        }
    except Exception as e:
        logger.error(f"Error updating crawler setting for {name}: {e}")
        raise HTTPException(500, f"Failed to update database setting: {str(e)}")
