import logging
from fastapi import APIRouter, HTTPException, Depends, Body
from app.api.deps import get_current_user
from app.services.ai_summary import AISummaryService

router = APIRouter(prefix="/api/v1/summary", tags=["summary"])
logger = logging.getLogger(__name__)

summary_service = AISummaryService()

@router.post("")
async def get_post_summary(body: dict = Body(...), user = Depends(get_current_user)):
    """Generate or retrieve cached summary for a specific post"""
    post_id = body.get("post_id")
    if not post_id:
        raise HTTPException(400, "post_id is required")

    try:
        summary = await summary_service.get_summary(post_id)
        return {"post_id": post_id, "summary": summary}
    except Exception as e:
        logger.error(f"Error generating summary for post {post_id}: {e}")
        raise HTTPException(500, f"Failed to generate summary: {str(e)}")
