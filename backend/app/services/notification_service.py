import logging
import httpx
from typing import List, Dict, Any
from app.database import supabase

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def get_active_tokens() -> List[str]:
    """Retrieve all active Expo push tokens from the database"""
    try:
        res = supabase.table("notification_tokens").select("expo_push_token").eq("is_active", True).execute()
        return [item["expo_push_token"] for item in res.data]
    except Exception as e:
        logger.error(f"Failed to fetch active notification tokens: {e}")
        return []

async def send_push_notification(tokens: List[str], title: str, body: str, data: Dict[str, Any] = None) -> bool:
    """Send push notification to a list of Expo push tokens"""
    if not tokens:
        return False

    payload = []
    for token in tokens:
        # Simple validation
        if not (token.startswith("ExponentPushToken[") or token.startswith("ExponentPushToken%5B") or token.startswith("ExponentPushToken")):
            logger.warning(f"Skipping invalid token format: {token}")
            continue
        item = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default"
        }
        if data:
            item["data"] = data
        payload.append(item)

    if not payload:
        return False

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={
                    "accept": "application/json",
                    "accept-encoding": "gzip, deflate",
                    "content-type": "application/json"
                },
                timeout=10.0
            )
            
            if res.status_code == 200:
                result = res.json()
                tickets = result.get("data", [])
                for i, ticket in enumerate(tickets):
                    if ticket.get("status") == "error":
                        error_msg = ticket.get("message", "")
                        logger.error(f"Expo push error: {error_msg}")
                        if "DeviceNotRegistered" in error_msg:
                            # Safely ignore or mark inactive
                            if i < len(tokens):
                                await mark_token_inactive(tokens[i])
                return True
            else:
                logger.error(f"Failed to send push notifications to Expo. Status: {res.status_code}, Body: {res.text}")
                return False
    except Exception as e:
        logger.error(f"Error sending push notifications: {e}")
        return False

async def mark_token_inactive(token: str) -> None:
    """Mark a token as inactive in the database if it is no longer valid"""
    try:
        supabase.table("notification_tokens").update({"is_active": False}).eq("expo_push_token", token).execute()
        logger.info(f"Marked token {token} as inactive")
    except Exception as e:
        logger.error(f"Failed to mark token inactive: {e}")

async def notify_new_post(post_title: str, post_id: str, source_type: str) -> None:
    """Notify all active tokens about a new post"""
    tokens = await get_active_tokens()
    if not tokens:
        return
    
    title = f"New post in {source_type.capitalize()}"
    body = post_title
    data = {
        "post_id": str(post_id),
        "source_type": source_type
    }
    await send_push_notification(tokens, title, body, data)
