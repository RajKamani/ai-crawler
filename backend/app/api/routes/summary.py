import logging
from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import get_current_user
from app.services.ai_summary import AISummaryService
from app.services.summary_allowance import AISummaryAllowanceService
from app.models.schemas import SummaryRequest
from app.database import supabase

router = APIRouter(prefix="/api/v1/summary", tags=["summary"])
logger = logging.getLogger(__name__)

summary_service = AISummaryService()
allowance_service = AISummaryAllowanceService()

@router.get("/allowance")
async def get_summary_allowance(user = Depends(get_current_user)):
    """Retrieve the user's daily summary usage and remaining credits"""
    user_id = str(user.id)
    try:
        allowance = await allowance_service.get_or_create_allowance(user_id)
        return allowance
    except Exception as e:
        logger.error(f"Error fetching allowance for user {user_id}: {e}")
        raise HTTPException(500, f"Failed to check summary allowance: {str(e)}")

@router.post("/claim-reward")
async def claim_rewarded_credit(user = Depends(get_current_user)):
    """Claim +1 rewarded summary credit for watching an ad"""
    user_id = str(user.id)
    try:
        updated_allowance = await allowance_service.claim_reward(user_id)
        return {"status": "success", "allowance": updated_allowance}
    except Exception as e:
        logger.error(f"Error claiming reward for user {user_id}: {e}")
        raise HTTPException(500, f"Failed to claim ad reward: {str(e)}")

@router.post("")
async def get_post_summary(body: SummaryRequest, user = Depends(get_current_user)):
    """Retrieve cached summary (free) or consume daily credit to generate a new one"""
    post_id = str(body.post_id)
    user_id = str(user.id)
    try:
        # 1. Check if summary is already cached
        post_res = supabase.table("posts") \
            .select("ai_summary") \
            .eq("id", post_id) \
            .execute()
        
        if post_res.data and len(post_res.data) > 0 and post_res.data[0].get("ai_summary"):
            # Cache hit - return immediately without consuming credits
            summary = post_res.data[0]["ai_summary"]
            return {"post_id": post_id, "summary": summary, "cached": True}

        # 2. Cache miss - check and consume daily credit
        has_allowance = await allowance_service.consume_allowance(user_id)
        if not has_allowance:
            raise HTTPException(
                status_code=402, 
                detail="Daily limit reached. Watch an ad to get more credits."
            )

        # 3. Generate summary
        summary = await summary_service.get_summary(post_id)
        return {"post_id": post_id, "summary": summary, "cached": False}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generating summary for post {post_id}: {e}")
        raise HTTPException(500, f"Failed to generate summary: {str(e)}")
