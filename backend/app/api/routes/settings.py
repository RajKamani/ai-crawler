import logging
from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase
from app.api.deps import get_current_user
from app.models.schemas import CrawlerSettingUpdate

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])
logger = logging.getLogger(__name__)

@router.get("/crawlers")
async def get_crawler_settings(user = Depends(get_current_user)):
    """Fetch all crawler schedule configurations, showing user-specific values when overridden"""
    try:
        # Fetch both global settings and user settings
        query = supabase.table("crawler_settings").select("*")
        query.params = query.params.add("or", f"(user_id.is.null,user_id.eq.{user.id})")
        res = query.execute()
        
        # Merge settings (user-specific overrides global)
        merged = {}
        for row in res.data:
            cname = row["crawler_name"]
            # If not in merged yet, or if this row has user_id, set it
            if cname not in merged or row["user_id"] is not None:
                merged[cname] = row
                
        return {"settings": list(merged.values()), "count": len(merged)}
    except Exception as e:
        logger.error(f"Error fetching crawler settings: {e}")
        raise HTTPException(500, f"Failed to fetch settings: {str(e)}")

@router.patch("/crawlers/{name}")
async def update_crawler_setting(
    name: str, 
    body: CrawlerSettingUpdate,
    user = Depends(get_current_user)
):
    """Update crawler schedule interval or active status"""
    updates = {}
    if body.interval_minutes is not None:
        updates["interval_minutes"] = body.interval_minutes
    
    if body.is_active is not None:
        updates["is_active"] = body.is_active

    if not updates:
        raise HTTPException(400, "Nothing to update")

    updates["updated_at"] = "now()"

    try:
        # Try to find user-specific setting first
        user_res = supabase.table("crawler_settings") \
            .select("*") \
            .eq("crawler_name", name) \
            .eq("user_id", user.id) \
            .execute()
        
        if user_res.data:
            # Update existing user setting
            res = supabase.table("crawler_settings") \
                .update(updates) \
                .eq("crawler_name", name) \
                .eq("user_id", user.id) \
                .execute()
        else:
            # Create a user-specific setting, starting with values from global setting
            global_res = supabase.table("crawler_settings") \
                .select("*") \
                .eq("crawler_name", name) \
                .is_("user_id", "null") \
                .execute()
            
            if not global_res.data:
                raise HTTPException(404, f"Crawler settings for '{name}' not found")
            
            global_row = global_res.data[0]
            # Merge with updates
            new_row = {
                "crawler_name": name,
                "user_id": user.id,
                "interval_minutes": updates.get("interval_minutes", global_row["interval_minutes"]),
                "is_active": updates.get("is_active", global_row["is_active"])
            }
            res = supabase.table("crawler_settings").insert(new_row).execute()
        
        return {
            "setting": res.data[0], 
            "message": f"Crawler '{name}' updated. Scheduler will apply changes within 3 minutes."
        }
    except Exception as e:
        logger.error(f"Error updating crawler setting for {name}: {e}")
        raise HTTPException(500, f"Failed to update database setting: {str(e)}")

