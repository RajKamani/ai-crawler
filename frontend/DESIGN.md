# Design System: AI Crawler

## 1. Visual Theme & Atmosphere
A stark, "Monospace Utilitarian" interface with high density (Density: 8) and strict grid variance (Variance: 3). The atmosphere feels like a command-line terminal fused with a modern editorial layout — brutalist, highly functional, and distinctly anti-corporate. Every element feels deliberate, rigid, and tactile.

## 2. Color Palette & Roles
- **Canvas White** (`#fcf9f8`) — Primary background surface. A warm, paper-like off-white.
- **Charcoal Ink** (`#1c1b1b`) — Primary text, 1px solid borders, heavy dividers, and structural lines.
- **Crimson Alert** (`#bc000a`) — Single accent color for active states, CTAs, and new feed notifications. (Max 1 accent. No purple/neon).
- **Muted Rust** (`#926f6a`) — Secondary text, inactive tab icons, empty state descriptions.
- **Surface Dim** (`#f0eded`) — Input backgrounds and secondary container fills.
- **Pure Surface** (`#ffffff`) — High-contrast text layered on top of Crimson Alert.

## 3. Typography Rules
- **Display:** `SpaceMono` — Used for headers, chips, and metadata. ALL CAPS strictly enforced for section titles, banners, and primary actions to create a teletype aesthetic.
- **Body:** `SpaceMono` — Used for standard reading text. Relaxed leading, strictly left-aligned, max 65 characters per line.
- **Mono:** `SpaceMono` — Used universally across the entire application. The app relies entirely on a monospace aesthetic to enforce the brutalist, developer-centric vibe.
- **Banned:** `Inter`, `Roboto`, `San Francisco`, and all generic system sans-serifs. Serif fonts are strictly BANNED in this UI.

## 4. Component Stylings
* **Buttons & Chips:** `0px` border radius (sharp corners). `1px` solid Charcoal Ink borders. Active states invert to Crimson Alert background with Pure Surface text. Tactile push feedback on active states.
* **Cards:** `0px` border radius. `1px` solid Charcoal Ink borders. No drop shadows. Use internal `1px` dividers for content separation inside the card.
* **Inputs:** Flat, no outer glow. `0px` border radius. Label beside or above. `1px` Charcoal Ink border. Background is Surface Dim.
* **Loaders:** Skeletal shimmer blocks matching exact layout dimensions. No generic circular spinners.
* **Empty States:** Stark, outline-icon-driven (e.g., `hourglass-outline`) with descriptive mono-spaced text. No soft, illustrated "cute" empty states.

## 5. Layout Principles
- Strict `1px` grid borders separating major layout areas (Header, Feed, Footer).
- No overlapping elements — every element occupies its own absolute cellular zone. No absolute-positioned content stacking.
- Full-bleed horizontal dividers (`height: 1px`, `backgroundColor: '#1c1b1b'`) are preferred over floating card gaps.
- Single-column collapse below 768px. No horizontal scroll on mobile viewports.
- No flexbox percentage math; use rigid Flex proportions or fixed heights where necessary. Contain layouts using max-width constraints.

## 6. Motion & Interaction
- **Tactile Physics:** `scale: 0.98` spring-physics depression on ALL interactive components (chips, cards, buttons) using React Native Reanimated. No simple opacity fades.
- **Spring Defaults:** `stiffness: 120, damping: 14` — premium, snappy, weighty feel. No linear easing.
- **Perpetual Micro-Interactions:** Subtle, continuous sequence looping for primary AI actions (heartbeat breathing on "Summarize") to indicate processing readiness.
- **Staggered Orchestration:** Waterfall cascade reveals (`FadeInUp` with delays) for onboarding items and lists.
- **Performance:** Hardware-accelerated transforms (`scale`, `translateY`) and `opacity` only. Never animate `height` or `width`.

## 7. Anti-Patterns (Banned)
- No rounded corners (strictly `borderRadius: 0`).
- No drop shadows or "neon" outer glows.
- No emojis anywhere.
- No `Inter` or generic system sans-serif fonts.
- No pure black (`#000000`) — always use Charcoal Ink (`#1c1b1b`).
- No overlapping elements — clean spatial cellular separation always.
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen").
- No soft pastel secondary colors — use only Muted Rust or Surface Dim.
- No fake round numbers (`99.99%`, `50%`).
- No filler UI text ("Swipe down", bouncing chevrons).
