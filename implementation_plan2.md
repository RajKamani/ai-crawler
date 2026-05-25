# Backend Improvement Plan — AI Content Crawler

Comprehensive backend hardening, feature additions, and reliability improvements.

## User Review Required

> [!IMPORTANT]
> This plan touches **12 files** across 7 areas. Changes are ordered dependency-first. Please review each section and flag anything you want to skip or modify.

> [!WARNING]
> **Crawl trigger endpoint** (`POST /api/v1/crawl`) currently runs synchronously — blocking the request until the crawl finishes. This plan makes it async with a background thread executor, but if you want a full task queue (Celery, etc.), let me know.

## Open Questions

> [!IMPORTANT]
> 1. **Push Notifications**: Do you want Expo push notifications sent to the user's device when new posts arrive? This requires storing Expo push tokens per user and a new `notification_tokens` table. I'll add the backend infra for it.
> 2. **Post Views / "Mark as Read"**: Should the `post_views` table track *which user* viewed a post (per-user), or just a global view count on the post?  I'll assume per-user for now.
> 3. **Rate Limiting**: Should we add rate limiting per user (e.g., 60 req/min) via a middleware, or leave it for now?
> 4. **Stale post cleanup**: Should we auto-delete posts older than N days (e.g., 90 days)? This keeps the DB lean.

---

## Proposed Changes

### 1. Database Schema Additions

New tables and columns needed to support notifications, post views, and crawl stats.

#### [MODIFY] [schema.sql](file:///c:/Users/Administrator/Downloads/Crawler/backend/db/schema.sql)

Add 3 new items to the schema:

```sql
-- 7. Post Views (Mark as Read) Table
CREATE TABLE IF NOT EXISTS post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);

-- 8. Push Notification Tokens Table
CREATE TABLE IF NOT EXISTS notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    expo_push_token TEXT NOT NULL UNIQUE,
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user ON notification_tokens(user_id);

-- 9. Crawl Logs Table (track crawl runs)
CREATE TABLE IF NOT EXISTS crawl_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    posts_found INTEGER DEFAULT 0,
    posts_saved INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);
```

---

### 2. Error Handling & Validation — Pydantic Request Models

Replace all `body: dict = Body(...)` with proper Pydantic models for automatic validation, OpenAPI docs, and type safety.

#### [NEW] [schemas.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/models/schemas.py)

Create Pydantic request/response schemas:

- `BookmarkCreate(post_id: UUID)`
- `SubredditAdd(subreddit_name: str)`  with `@field_validator` for cleaning
- `BlogAdd(name: str, url: HttpUrl)` with URL validation
- `CrawlerTrigger(crawler: str)` with `Literal` enum
- `CrawlerSettingUpdate(interval_minutes: Optional[int], is_active: Optional[bool])`
- `SummaryRequest(post_id: UUID)`
- `PostViewMark(post_id: UUID)`
- `NotificationTokenRegister(expo_push_token: str, device_name: Optional[str])`

#### [MODIFY] All routes under [routes/](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes)

Swap `body: dict = Body(...)` → typed Pydantic model parameters in:
- [bookmarks.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/bookmarks.py)
- [crawl.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/crawl.py)
- [summary.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/summary.py)
- [settings.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/settings.py)
- [user_subreddits.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/user_subreddits.py)
- [user_blogs.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/user_blogs.py)

---

### 3. Post Views / "Mark as Read" Feature

#### [NEW] [post_views.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/post_views.py)

New route file with:
- `POST /api/v1/posts/views` — Mark a post as viewed by the current user (upsert)
- `GET /api/v1/posts/views` — Get all viewed post IDs for the current user

#### [MODIFY] [posts.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/posts.py)

- Inject `is_viewed: bool` into each post in both `get_posts()` and `get_personalized_feed()` responses (same pattern as `is_bookmarked`)

---

### 4. Push Notifications for New Data

#### [NEW] [notifications.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/notifications.py)

New route file with:
- `POST /api/v1/notifications/register` — Register an Expo push token for the current user
- `DELETE /api/v1/notifications/unregister` — Unregister a token
- `GET /api/v1/notifications/tokens` — List user's registered tokens

#### [NEW] [notification_service.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/services/notification_service.py)

Service that:
- Sends Expo push notifications via `https://exp.host/--/api/v2/push/send` (httpx POST)
- Accepts `title`, `body`, `data` payload
- Fetches all active tokens from `notification_tokens` and sends in batch

#### [MODIFY] [base.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/crawlers/base.py)

- After each `save_post()` success, call notification service to push to all registered tokens:
  `"New post: {title}" with data: { post_id, source_type }`

---

### 5. Async Crawl Trigger & Crawl Logging

#### [MODIFY] [crawl.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/routes/crawl.py)

- Run the crawler job in a `BackgroundTask` (FastAPI native) instead of blocking the request
- Create a `crawl_logs` entry with status `running` → `success`/`failed`
- Return `202 Accepted` with `crawl_log_id` instead of waiting for completion
- Add `GET /api/v1/crawl/logs` — List recent crawl log entries

#### [MODIFY] [jobs.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/scheduler/jobs.py)

- Each job wrapper (`job_crawl_*`) writes a crawl_log entry on start/finish
- Track `posts_found` and `posts_saved` counts (returned from crawlers)
- Fix the `run_async()` helper: `asyncio.get_event_loop()` is deprecated in 3.10+. Replace with a proper `asyncio.Runner` or `asyncio.new_event_loop()` pattern.

#### [MODIFY] [base.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/crawlers/base.py)

- `save_post()` returns a counter-friendly result (`True`/`False` for saved vs duplicate)
- Crawl methods return `(found_count, saved_count)` tuple for logging

---

### 6. Remove Mock Auth Token

#### [MODIFY] [deps.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/api/deps.py)

- Remove the hardcoded mock token (`mock-user-session-token-12345`) behind an `ENV` check:
  - If `ENV=development` → keep mock auth for local testing
  - If `ENV=production` → strictly validate via Supabase Auth only
- Add `ENV` field to [config.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/config.py)

---

### 7. CORS, Logging & General Hardening

#### [MODIFY] [main.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/main.py)

- Include new routers: `post_views`, `notifications`
- Add `ALLOWED_ORIGINS` env variable (defaults to `["*"]` in dev) to restrict CORS in production
- Add structured JSON logging with `uvicorn.logging` config for production

#### [MODIFY] [config.py](file:///c:/Users/Administrator/Downloads/Crawler/backend/app/config.py)

- Add new config fields:
  - `ENV: str = "development"` (development / production)
  - `ALLOWED_ORIGINS: str = "*"` (comma-separated list for CORS)
  - `LOG_LEVEL: str = "INFO"`

#### [MODIFY] [requirements.txt](file:///c:/Users/Administrator/Downloads/Crawler/backend/requirements.txt)

- Pin `httpx>=0.24.0` (remove `<0.25.0` upper bound — this causes conflicts with newer supabase)

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `app/models/schemas.py` | Pydantic request/response models |
| `app/api/routes/post_views.py` | Mark-as-read / post view tracking |
| `app/api/routes/notifications.py` | Expo push token registration |
| `app/services/notification_service.py` | Send push notifications via Expo API |

## Summary of Modified Files

| File | Changes |
|------|---------|
| `db/schema.sql` | +3 new tables (post_views, notification_tokens, crawl_logs) |
| `app/config.py` | +ENV, ALLOWED_ORIGINS, LOG_LEVEL |
| `app/api/deps.py` | Conditional mock auth based on ENV |
| `app/main.py` | +2 routers, CORS from env, JSON logging |
| `app/crawlers/base.py` | Return counts, push notifications on save |
| `app/scheduler/jobs.py` | Crawl logging, fix async runner |
| `app/api/routes/crawl.py` | BackgroundTask async, crawl logs endpoint |
| `app/api/routes/posts.py` | +is_viewed field |
| `app/api/routes/bookmarks.py` | Pydantic models |
| `app/api/routes/summary.py` | Pydantic models |
| `app/api/routes/settings.py` | Pydantic models |
| `app/api/routes/user_subreddits.py` | Pydantic models |
| `app/api/routes/user_blogs.py` | Pydantic models |
| `requirements.txt` | Unpin httpx upper bound |

---

## Verification Plan

### Automated Tests
- `curl` health endpoint: `GET /` and `GET /health`
- `curl` post views: `POST /api/v1/posts/views` with auth token
- `curl` notification register: `POST /api/v1/notifications/register`
- `curl` crawl trigger: `POST /api/v1/crawl` → verify 202 response
- `curl` crawl logs: `GET /api/v1/crawl/logs`
- Start local server with `uvicorn app.main:app --reload` and test all endpoints

### Manual Verification
- Check Supabase dashboard for new tables after running schema migration
- Trigger a crawl and verify `crawl_logs` entries appear
- Register a push token and trigger a crawl to verify notifications are sent
