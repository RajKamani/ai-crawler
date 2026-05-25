import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.api.deps import get_current_user
from app.models.schemas import NotificationTokenRegister

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])
logger = logging.getLogger(__name__)

@router.post("/register")
async def register_push_token(body: NotificationTokenRegister, user = Depends(get_current_user)):
    """Register or update an Expo push token for the authenticated user"""
    try:
        token_data = {
            "user_id": user.id,
            "expo_push_token": body.expo_push_token,
            "device_name": body.device_name,
            "is_active": True
        }
        res = supabase.table("notification_tokens").upsert(token_data, on_conflict="expo_push_token").execute()
        if not res.data:
            raise HTTPException(500, "Failed to register notification token")
        return {"status": "success", "message": "Notification token registered"}
    except Exception as e:
        logger.error(f"Error registering push token for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to register push token: {str(e)}")

@router.post("/unregister")
async def unregister_push_token(body: NotificationTokenRegister, user = Depends(get_current_user)):
    """Unregister (delete) a push token for the authenticated user"""
    try:
        res = supabase.table("notification_tokens") \
            .delete() \
            .eq("expo_push_token", body.expo_push_token) \
            .eq("user_id", user.id) \
            .execute()
        return {"status": "success", "message": "Notification token unregistered"}
    except Exception as e:
        logger.error(f"Error unregistering push token for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to unregister push token: {str(e)}")

@router.get("/tokens")
async def get_registered_tokens(user = Depends(get_current_user)):
    """Get all push tokens registered for the authenticated user"""
    try:
        res = supabase.table("notification_tokens").select("*").eq("user_id", user.id).execute()
        return {"tokens": res.data}
    except Exception as e:
        logger.error(f"Error fetching registered tokens for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to fetch registered tokens: {str(e)}")
