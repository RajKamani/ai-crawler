-- Database Schema for AI Content Crawler
-- Target: Supabase (PostgreSQL 15+)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sources Table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('blog', 'reddit', 'github')),
    url TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    crawl_frequency_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_crawled_at TIMESTAMPTZ
);

-- 2. Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT NOT NULL UNIQUE,
    author TEXT,
    category TEXT, -- 'tool', 'idea', 'framework', 'discussion', etc.
    tags TEXT[],
    ai_summary TEXT,
    raw_data JSONB,
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    search_vector tsvector
);

-- 3. Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- UUID from auth.users (Supabase Auth)
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- 4. User Custom Subreddits Table
CREATE TABLE IF NOT EXISTS user_subreddits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- UUID from auth.users (Supabase Auth)
    subreddit_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMPTZ DEFAULT now(),
    last_crawled_at TIMESTAMPTZ,
    UNIQUE(user_id, subreddit_name)
);

-- 5. User Custom Blogs Table
CREATE TABLE IF NOT EXISTS user_blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- UUID from auth.users (Supabase Auth)
    blog_name TEXT NOT NULL,
    blog_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMPTZ DEFAULT now(),
    last_crawled_at TIMESTAMPTZ,
    UNIQUE(user_id, blog_url)
);

-- 6. Crawler Settings Table
CREATE TABLE IF NOT EXISTS crawler_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_name TEXT UNIQUE NOT NULL,
    interval_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_source ON posts(source_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subreddits_user ON user_subreddits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subreddits_active ON user_subreddits(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_blogs_user ON user_blogs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blogs_active ON user_blogs(is_active) WHERE is_active = true;

-- Full-Text Search Index (GIN)
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(search_vector);

-- Trigger to automatically update tsvector on title or content change
CREATE OR REPLACE FUNCTION posts_trigger_func() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.content, '')), 'B');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON posts FOR EACH ROW EXECUTE FUNCTION posts_trigger_func();

-- Seed Default Sources
INSERT INTO sources (name, type, url, crawl_frequency_minutes) VALUES
('OpenAI Blog', 'blog', 'https://openai.com/blog/rss.xml', 60),
('Anthropic Blog', 'blog', 'https://www.anthropic.com/blog/rss', 60),
('Google DeepMind Blog', 'blog', 'https://deepmind.google/blog/rss.xml', 60),
('Meta AI Blog', 'blog', 'https://ai.meta.com/blog/rss/', 60),
('Hugging Face Blog', 'blog', 'https://huggingface.co/blog/feed.xml', 60),
('Stability AI Blog', 'blog', 'https://stability.ai/blog/rss', 60),
('Mistral AI News', 'blog', 'https://mistral.ai/news/rss.xml', 60),
('Cohere Blog', 'blog', 'https://cohere.com/blog/rss', 60),
('AI21 Labs Blog', 'blog', 'https://www.ai21.com/blog/rss', 60),
('Perplexity Blog', 'blog', 'https://www.perplexity.ai/hub/blog/rss', 60),
('r/artificial', 'reddit', 'r/artificial', 30),
('r/MachineLearning', 'reddit', 'r/MachineLearning', 30),
('r/LocalLLaMA', 'reddit', 'r/LocalLLaMA', 30),
('r/ChatGPT', 'reddit', 'r/ChatGPT', 30),
('r/singularity', 'reddit', 'r/singularity', 30),
('r/SideProject', 'reddit', 'r/SideProject', 30)
ON CONFLICT (url) DO NOTHING;

-- Seed Default Crawler Settings
INSERT INTO crawler_settings (crawler_name, interval_minutes) VALUES
('blog_global', 60),
('blog_user', 90),
('reddit_global', 30),
('reddit_user', 45),
('github_trending', 180)
ON CONFLICT (crawler_name) DO UPDATE 
SET interval_minutes = EXCLUDED.interval_minutes;
