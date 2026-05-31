# Shared Global Sources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shift the feed architecture so that `sources` and `posts` are shared globally across users instead of being duplicated per user. If multiple users follow the same subreddit or RSS blog, they must share the same underlying global source and its crawled posts. The timeline feed must still be filtered strictly by the user's onboarding/settings selections.

**Architecture:**
1. Downgrade the database schema to remove `user_id` from `sources`, `crawler_settings`, and `crawl_logs`, and restore the unique constraint on `sources.url` and `posts.url`.
2. Refactor `reddit_crawler.py` and `blog_crawler.py` to create/use global sources only (where `user_id` does not exist).
3. Refactor scheduler jobs in `jobs.py` to run unified global crawls for the distinct union of active user subreddits and blogs, rather than scheduling per-user tasks.
4. Refactor `posts.py` and `settings.py` endpoints to remove `user_id` filtering on `sources` and `crawler_settings` tables, and correctly filter feed posts by user selections at query time.

**Tech Stack:** FastAPI, PostgreSQL (Supabase), Alembic, APScheduler, Python, React Native (Expo)

---

### Task 1: Database Schema Downgrade

**Files:**
- Run Command: Database migration downgrade via Alembic

**Step 1: Write a test verifying duplicate URLs fail (TDD fail)**
Run: `.venv\Scripts\python.exe C:\Users\Administrator\.gemini\antigravity-ide\brain\a58e2d21-6578-4a24-abaf-6a9184c3328f\scratch\check_table_constraints.py`
Expected: PASS (currently duplicate URLs succeed because of user-scoped index isolation).

**Step 2: Run Alembic downgrade**
Run: `.venv\Scripts\python.exe -m alembic downgrade 47cb4ab34251`
Expected: Successfully downgraded to revision `47cb4ab34251`.

**Step 3: Run the constraint check script again to verify it fails**
Run: `.venv\Scripts\python.exe C:\Users\Administrator\.gemini\antigravity-ide\brain\a58e2d21-6578-4a24-abaf-6a9184c3328f\scratch\check_table_constraints.py`
Expected: FAIL with Unique Constraint Violation on `sources_url_key`.

**Step 4: Cleanup constraint check test data**
Run a cleanup in the database to delete the temporary test source.

---

### Task 2: Refactor Reddit Crawler

**Files:**
- Modify: `backend/app/crawlers/reddit_crawler.py`

**Step 1: Write the failing test**
Create `C:\Users\Administrator\.gemini\antigravity-ide\brain\a58e2d21-6578-4a24-abaf-6a9184c3328f\scratch\test_shared_sources.py` (which will fail because crawlers/jobs still try to use `user_id` and do user-isolated crawls).

**Step 2: Run test to verify it fails**
Run: `.venv\Scripts\python.exe C:\Users\Administrator\.gemini\antigravity-ide\brain\a58e2d21-6578-4a24-abaf-6a9184c3328f\scratch\test_shared_sources.py`
Expected: FAIL (AttributeError or Database error on `user_id` column which no longer exists).

**Step 3: Refactor `reddit_crawler.py`**
- Modify `_get_or_create_source` to remove `user_id` parameters and database inserts.
- Refactor `crawl_user_subreddits` to `crawl_all_user_subreddits()` (no `user_id` parameter):
  - Queries `SELECT DISTINCT subreddit_name FROM user_subreddits WHERE is_active = true`.
  - Crawls each subreddit and maps them to a single global source.
  - Updates `last_crawled_at` for all active user subreddits to `now_iso`.

**Step 4: Run test to verify it passes**
(Test will still fail on blog crawler / scheduler, proceed to Task 3).

---

### Task 3: Refactor Blog Crawler

**Files:**
- Modify: `backend/app/crawlers/blog_crawler.py`

**Step 1: Refactor `blog_crawler.py`**
- Modify `_get_or_create_source` to remove `user_id` parameters and database inserts.
- Refactor `crawl_user_blogs` to `crawl_all_user_blogs()` (no `user_id` parameter):
  - Queries `SELECT DISTINCT blog_name, blog_url FROM user_blogs WHERE is_active = true`.
  - Deduplicates by URL.
  - Crawls each blog RSS feed and maps them to a single global source.
  - Updates `last_crawled_at` for all active user blogs to `now_iso`.

---

### Task 4: Refactor Scheduler Jobs

**Files:**
- Modify: `backend/app/scheduler/jobs.py`

**Step 1: Refactor jobs and dispatcher**
- Refactor `job_crawl_blog_user` to take no parameters, creating a crawl log with `user_id=None` and calling `blog_crawler.crawl_all_user_blogs()`.
- Refactor `job_crawl_reddit_user` to take no parameters, creating a crawl log with `user_id=None` and calling `reddit_crawler.crawl_all_user_subreddits()`.
- Modify `job_dispatch_due_crawls` to treat `blog_user` and `reddit_user` as global scheduler jobs. Remove loops over active user IDs.
- Modify `sync_scheduler_intervals` to schedule `blog_user` and `reddit_user` as global single jobs, removing user loops.

---

### Task 5: Refactor API Endpoints

**Files:**
- Modify: `backend/app/api/routes/posts.py`
- Modify: `backend/app/api/routes/settings.py`

**Step 1: Refactor `posts.py`**
- In `get_posts`, `get_personalized_feed`, and `get_active_feed_sources`:
  - Remove `user_id` conditions when querying `sources`.
  - Simplify source retrieval to just get active sources.
  - Ensure post results filter matching active subreddits / blogs selections.

**Step 2: Refactor `settings.py`**
- Remove user-specific logic from `/settings/crawlers` GET and PATCH endpoints.
- Update/retrieve `crawler_settings` globally without `user_id` filtering.

---

### Task 6: Verify Integration and Tests

**Files:**
- Run Command: `test_shared_sources.py`
- Run Command: `test_onboarding_filtering.py`

**Step 1: Run `test_shared_sources.py`**
Run: `.venv\Scripts\python.exe C:\Users\Administrator\.gemini\antigravity-ide\brain\a58e2d21-6578-4a24-abaf-6a9184c3328f\scratch\test_shared_sources.py`
Expected: PASS.

**Step 2: Run `test_onboarding_filtering.py`**
Run: `.venv\Scripts\python.exe C:\Users\Administrator\.gemini\antigravity-ide\brain\a58e2d21-6578-4a24-abaf-6a9184c3328f\scratch\test_onboarding_filtering.py`
Expected: PASS.
