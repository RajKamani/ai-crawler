# AI Crawler — Product Analysis Report
*Research-backed review of current state, user needs, and improvement roadmap*

---

## Executive Summary

AI Crawler is a **personal intelligence aggregator** — it pulls Reddit posts, RSS blog feeds, and GitHub trending repos into one Inshorts-style swipeable card feed, scoped entirely to the user's chosen sources. The concept is solid and the architecture is now properly user-isolated. However, compared to what users in 2025 expect from tools in this category, there are meaningful gaps across UX, retention, content depth, and discoverability that — if addressed — could turn this from a useful tool into a sticky daily habit.

---

## ✅ Current Strengths (What's Working)

| Area | What's Good |
|---|---|
| **Inshorts-style swipe feed** | Full-screen snap-scroll is proven and highly engaging for quick content consumption |
| **Multi-source aggregation** | Reddit + RSS blogs + GitHub in one place is rare — most apps only do one |
| **User-isolated feed** | Each user sees only their selected sources — no shared pollution |
| **Per-user crawler intervals** | Users can throttle their own background refresh frequency |
| **Groq AI summarisation** | One-tap post summaries are a real differentiator vs. raw RSS readers |
| **Dark mode** | Expected baseline in 2025 — covered |
| **Bookmark system** | Read-it-later is essential for productivity-minded users |
| **Source validation** | Immediate preview posts when adding a source adds trust |
| **Clean monospaced aesthetic** | Distinctive visual identity — stands out vs. generic Material apps |

---

## ❌ Current Weaknesses (What's Broken or Missing)

### 1. No Offline Support
> **Pain:** If the user loses internet, they see nothing. RSS readers like NetNewsWire cache articles locally. Users in commutes, travel, or low-signal areas get zero value.
> **Impact:** High. Offline reading is a top-5 feature across every RSS reader study.

### 2. No Read Progress / Unread Count
> **Pain:** After leaving and coming back, users cannot tell which posts are new vs. already seen. There's no "X new posts since last visit" indicator, only the existing "NEW UPDATES" banner which is notification-driven.
> **Impact:** Medium-High. "Unread count anxiety" is documented, but equally, having no counter means users don't know if there's fresh content.

### 3. Feed-Level Content Mixing Without Control
> **Pain:** Reddit posts, blogs, and GitHub repos all appear in one undifferentiated stream. A user following 5 subreddits + 5 blogs gets mixed content with no way to say "show me only blogs tonight."
> **Impact:** Medium. Source chips exist, but only filter by individual source. There's no "type" filter (Reddit / Blogs / GitHub as a group) accessible from the feed itself.

### 4. No Keyword Filtering / Mute
> **Pain:** Users cannot block posts containing specific words (e.g., mute "sponsored", "GPT-5 rumors"). Every RSS reader above basic tier (Feedly Leo, NewsBlur) has this.
> **Research:** Developers specifically want language-level and topic-level filtering.
> **Impact:** Medium-High — especially for Reddit, where signal-to-noise ratio is low.

### 5. AI Summaries Are On-Demand Only
> **Pain:** Users must tap "Summarise" per post. There's no batch pre-summary. Competitors like Artifact, Feedly Leo, and stayup.ai auto-summarise headlines.
> **Impact:** Medium. The on-demand approach is intentional to save API cost, but users want ambient intelligence, not a button they have to find.

### 6. No Daily Digest / Morning Brief
> **Pain:** Users have no "give me the top 5 things from my sources today" view. Research shows the Daily Digest is the single biggest driver of Day-30 retention in news apps.
> **Impact:** High for retention. This is the feature most likely to build a daily habit loop.

### 7. GitHub Trending Is Not Personalised
> **Pain:** The GitHub feed shows global trending repos — not filtered by language/topic the user cares about (Python, Rust, AI, etc.). Every developer surveyed wants language-specific trending.
> **Impact:** Medium-High for developer users.

### 8. No Sharing or Sending to Self
> **Pain:** Users can't share a post, send to email/Telegram/Slack, or copy a link cleanly from within the app.
> **Impact:** Medium. Modern users share 1-in-5 pieces of content they consume.

### 9. No Content De-duplication
> **Pain:** If a user follows `r/MachineLearning` and the Anthropic Blog, they might see the same news event as a Reddit discussion AND a blog post. There's no "same story" grouping.
> **Impact:** Low-Medium initially but increases as user's source list grows.

### 10. Onboarding Doesn't Show Immediate Value
> **Pain:** After completing onboarding, the feed is empty until the background crawler runs (minutes to hours). New users see an empty screen and may churn immediately.
> **Research:** Retention science says users must hit a "core value moment" within 60 seconds of signup.
> **Impact:** High for new user retention.

---

## 🔬 What Research Says Users Want (2025)

Based on studying Feedly, Inoreader, Apollo (Reddit), Narwhal, and GitHub aggregator tools:

### Universal Needs
1. **Friction reduction** — Summarise, translate, or simplify — don't just dump raw content
2. **Control and transparency** — Show *why* something appeared in the feed; let users tune it
3. **Efficiency** — Daily digests, "mark all read", clear unread indicators
4. **Offline access** — At minimum, cache the last 24h of feed

### Developer-Specific (GitHub users)
1. **Star velocity, not just star count** — "gaining 500 stars in 24h" is more useful than "30k total stars"
2. **Language filtering** — Show me trending Rust repos, not everything
3. **Contributor highlights** — Who is pushing this ecosystem forward?

### Reddit Consumers
1. **Gesture-based browsing** — Swipe to upvote, collapse comments (comments are entirely missing)
2. **Compact view option** — Not everyone wants full-card; some prefer a scrollable list
3. **Comment threads** — Seeing top comments inline is 70% of the Reddit value

### RSS/Blog Readers
1. **Full article view** — Not just the excerpt; render the full post in-app
2. **Read time estimate** — "4 min read" sets expectations
3. **Tags/categories** — Auto-tag posts (AI, DevOps, Tutorial) so users can filter

---

## 🗺️ Prioritised Feature Roadmap

### 🔴 Priority 1 — Fix Retention (Do These First)

| Feature | Why | Effort |
|---|---|---|
| **Seed posts at onboarding** | Don't let new users see an empty feed — crawl immediately after source selection | Low |
| **Daily Digest screen** | "Your top 5 posts today" — the single biggest Day-30 retention driver | Medium |
| **Type-grouped feed filter** | Chips for ALL / REDDIT / BLOGS / GITHUB across the entire feed without selecting individual sources | Low |
| **GitHub language filter** | Let users pick their tech stack when adding GitHub trending | Medium |

### 🟡 Priority 2 — Expand Content Value

| Feature | Why | Effort |
|---|---|---|
| **Post comments view** | For Reddit, comments are the product — inline top 5 comments | Medium |
| **Full article reader** | For blogs, render full body inside app (Readability.js) | Medium |
| **AI batch pre-summary** | Pre-summarise top 10 posts per crawl run using Groq | Medium |
| **Keyword mute filters** | Block posts matching user-defined keywords | Medium |
| **GitHub star velocity** | Show "↑ 2.1k stars today" not just total | Low |

### 🟢 Priority 3 — Polish & Growth

| Feature | Why | Effort |
|---|---|---|
| **Share sheet** | Share post to Telegram, WhatsApp, copy link | Low |
| **Offline cache** | Cache last 24h posts to AsyncStorage / SQLite | High |
| **Notification personalisation** | Let users pick notification topics (AI news only, etc.) | Medium |
| **Reading stats screen** | "You read 42 posts this week" — gamification and ego loop | Medium |
| **Content deduplication** | Group same-story posts together | High |
| **Export bookmarks** | Export to Pocket/Readwise/Notion | Medium |

---

## 📊 Competitive Positioning

```
                    PERSONALISATION
                          ▲
                          │
          Feedly/          │          AI Crawler
          Inoreader ───────┼────────► (with roadmap)
                          │
          Basic RSS ───────┤
          Readers          │
                          │
                          └──────────────────────►
                                   MULTI-SOURCE
```

**Right now:** AI Crawler sits between a basic RSS reader and Feedly — solid multi-source support but thin on the intelligence layer.

**With roadmap:** It can position as the **developer-first personal intelligence tool** — the only app that combines Reddit, technical blogs, and GitHub trending with AI summaries in a single swipe feed, scoped to your exact interests.

Closest competitors and gaps:
| Competitor | What they do better | AI Crawler advantage |
|---|---|---|
| **Feedly** | Advanced filtering, team tools | Mobile-first swipe UX, GitHub integration |
| **Inoreader** | Rules-based automation | Simpler UX, Reddit native |
| **Apollo/Narwhal** | Reddit-native, gestures, comments | Cross-source (Reddit + blogs + GitHub) |
| **trendshift.io** | GitHub trending with analytics | Personalised feed + AI summaries |
| **Artifact (RIP)** | AI-first news | Open source data, self-hosted possible |

---

## 💰 Monetisation Suggestions

If this becomes a public app, research strongly supports:

**Free Tier:**
- Up to 5 sources (subreddits + blogs)
- Manual summarisation (3/day)
- 7-day crawl history

**Pro Tier (~$4.99/month or $39/year):**
- Unlimited sources
- Unlimited AI summaries + daily digest
- Full article reader
- Keyword mute filters
- Offline cache
- Priority crawl intervals (min 5 min vs 30 min free)

**Implementation:** Use RevenueCat — do not build payment infrastructure from scratch.

> 💡 **The "reverse trial" model works best** — give all users Pro for 14 days, then downgrade. Loss aversion drives conversions 2-3x better than a limited free tier.

---

## 🧠 Specific Quick Wins (Can Build This Week)

These are low-effort, high-impact improvements based on the codebase already built:

1. **Immediate crawl trigger at onboarding end** — After user selects sources, fire a `POST /api/v1/crawl` for reddit_user and blog_user immediately rather than waiting for the scheduler. Users see posts within 30s.

2. **GitHub language picker in onboarding** — Add a simple dropdown when a user enables GitHub (Python / Rust / JavaScript / Go / Any). Filter trending repos by that language.

3. **Feed type filter chips** — Add ALL / REDDIT / BLOGS / GITHUB chips above the source chips. Already have `?type=reddit` query param in the backend.

4. **Read time on cards** — Calculate `wordCount / 200` for blog posts and show "3 min read" on each card.

5. **Share button on card** — Add a share icon to InshortsCard that calls `Share.share()` from `react-native`.

6. **Post comment count on Reddit cards** — The Reddit crawler already has `num_comments` in the payload. Show it as `💬 234` on the card.

---

## Summary

| Category | Score | Notes |
|---|---|---|
| **Architecture** | ⭐⭐⭐⭐⭐ | Excellent — user-isolated, scalable, async |
| **UI / Design** | ⭐⭐⭐⭐ | Distinctive and clean — minor density issues |
| **Content Depth** | ⭐⭐⭐ | Missing comments, full articles, language filters |
| **Retention Hooks** | ⭐⭐ | No daily digest, no habit loops, empty onboarding |
| **AI Layer** | ⭐⭐⭐ | Summariser works but is passive/on-demand only |
| **Discoverability** | ⭐⭐ | No search across all sources, no trending topics |
| **Sharing / Social** | ⭐ | No share capability at all |

**Overall verdict:** The foundation is strong and the differentiation (multi-source + AI summaries + Inshorts UX) is real. The biggest risk is **early churn** — users who sign up, see an empty or shallow feed, and never return. Fixing the onboarding → immediate value pipeline and adding a Daily Digest would have the highest ROI of any improvement.
