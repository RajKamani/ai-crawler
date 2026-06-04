import logging
from datetime import date
from app.database import supabase

logger = logging.getLogger(__name__)

class AISummaryAllowanceService:
    def _get_today_str(self) -> str:
        """Returns current date in YYYY-MM-DD format"""
        return date.today().isoformat()

    async def get_or_create_allowance(self, user_id: str) -> dict:
        """Get or initialize the daily allowance entry for a user"""
        today = self._get_today_str()
        try:
            # Query allowance for today
            res = supabase.table("user_summary_allowance") \
                .select("free_used, rewarded_earned, rewarded_used") \
                .eq("user_id", user_id) \
                .eq("usage_date", today) \
                .execute()
            
            if res.data and len(res.data) > 0:
                row = res.data[0]
            else:
                # Initialize new row for today
                insert_res = supabase.table("user_summary_allowance") \
                    .insert({
                        "user_id": user_id,
                        "usage_date": today,
                        "free_used": 0,
                        "rewarded_earned": 0,
                        "rewarded_used": 0
                    }) \
                    .execute()
                row = insert_res.data[0]
            
            free_used = row["free_used"]
            rewarded_earned = row["rewarded_earned"]
            rewarded_used = row["rewarded_used"]
            
            free_remaining = max(0, 5 - free_used)
            rewarded_available = max(0, rewarded_earned - rewarded_used)
            total_remaining = free_remaining + rewarded_available

            return {
                "free_remaining": free_remaining,
                "rewarded_available": rewarded_available,
                "total_remaining": total_remaining,
                "limit_reached": total_remaining <= 0
            }
        except Exception as e:
            logger.error(f"Error in get_or_create_allowance for user {user_id}: {e}")
            # Fallback to default limits if database check fails
            return {
                "free_remaining": 5,
                "rewarded_available": 0,
                "total_remaining": 5,
                "limit_reached": False
            }

    async def consume_allowance(self, user_id: str) -> bool:
        """Attempts to consume 1 credit of allowance. Returns True if successful."""
        today = self._get_today_str()
        try:
            # Ensure allowance row exists and get current values
            res = supabase.table("user_summary_allowance") \
                .select("free_used, rewarded_earned, rewarded_used") \
                .eq("user_id", user_id) \
                .eq("usage_date", today) \
                .execute()

            if not res.data or len(res.data) == 0:
                # If no row, create it and consume 1 free credit
                supabase.table("user_summary_allowance") \
                    .insert({
                        "user_id": user_id,
                        "usage_date": today,
                        "free_used": 1,
                        "rewarded_earned": 0,
                        "rewarded_used": 0
                    }) \
                    .execute()
                return True

            row = res.data[0]
            free_used = row["free_used"]
            rewarded_earned = row["rewarded_earned"]
            rewarded_used = row["rewarded_used"]

            if free_used < 5:
                # Consume free credit
                supabase.table("user_summary_allowance") \
                    .update({"free_used": free_used + 1}) \
                    .eq("user_id", user_id) \
                    .eq("usage_date", today) \
                    .execute()
                return True
            elif rewarded_used < rewarded_earned:
                # Consume rewarded credit
                supabase.table("user_summary_allowance") \
                    .update({"rewarded_used": rewarded_used + 1}) \
                    .eq("user_id", user_id) \
                    .eq("usage_date", today) \
                    .execute()
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error consuming allowance for user {user_id}: {e}")
            # Assume success on DB failure to avoid blocking user
            return True

    async def claim_reward(self, user_id: str) -> dict:
        """Increments earned rewarded credits by 1 for the user today"""
        today = self._get_today_str()
        try:
            # Get current rewarded_earned count
            res = supabase.table("user_summary_allowance") \
                .select("rewarded_earned") \
                .eq("user_id", user_id) \
                .eq("usage_date", today) \
                .execute()

            if res.data and len(res.data) > 0:
                rewarded_earned = res.data[0]["rewarded_earned"]
                # Update existing row
                supabase.table("user_summary_allowance") \
                    .update({"rewarded_earned": rewarded_earned + 1}) \
                    .eq("user_id", user_id) \
                    .eq("usage_date", today) \
                    .execute()
            else:
                # Insert new row with 1 rewarded credit earned
                supabase.table("user_summary_allowance") \
                    .insert({
                        "user_id": user_id,
                        "usage_date": today,
                        "free_used": 0,
                        "rewarded_earned": 1,
                        "rewarded_used": 0
                    }) \
                    .execute()

            return await self.get_or_create_allowance(user_id)
        except Exception as e:
            logger.error(f"Error claiming reward for user {user_id}: {e}")
            raise e
