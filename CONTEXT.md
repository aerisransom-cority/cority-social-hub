Cority Social Hub — Project Context
What this is
A personal social media command center for Cority's social media manager. A hosted Next.js web app (deployed on Vercel) that streamlines the full creative workflow: request briefs, AI copy drafting, brainstorm chat, visual mockups, UTM management, and performance tracking.
Solo user. Non-technical operator. File-based persistence (JSON/CSV, no database).
Tech stack
* Framework: Next.js 14 (pages router)
* Styling: Tailwind CSS
* AI: Claude API (claude-sonnet-4-20250514) via Anthropic SDK
* Graphics: HTML/CSS templates → PNG export (html2canvas) + Figma-ready
* Data: JSON files + CSV export (no database)
* Hosting: Vercel (connected to GitHub)
* Auth: None (solo user)
Build phases
* Phase 1 ✅ Foundation: Nav shell + Brand Settings page (pre-loaded with Cority strategy)
* Phase 2 ✅ Request brief form + AI copy drafting (per-platform variants, platform selector, saves to data/briefs.json)
* Phase 3 ✅ Auth (NextAuth.js JWT, 3 roles: Admin / Contributor / Reviewer, login at /login, proxy.js protects all routes) + Brainstorm Chat (brand-aware multi-turn AI, saves to data/chat-history.json) + Editorial Calendar (month view, drag-to-reschedule, saves to data/calendar.json) + Media Library shell (upload photos, tag system, grid view, local storage → Cloudinary-ready via STORAGE_PROVIDER env var)
* Phase 4 → UTM builder (enforces naming conventions) + UTM log (CSV export)
* Phase 5 → Performance sync (XLSX upload, UTM matching, basic dashboard)
* Phase 6 → Visual mockups (brand-templated, PNG + Figma export)
* Phase 7 → Proactive post suggestions (AI surfaces ideas from strategy + performance)
* Phase 8 → Product knowledge base (searchable customer stories, product portfolio, positioning — AI-queryable when drafting)
Brand context (loaded as Claude system prompt in all AI calls)
Vision: When a customer or prospect thinks about EHS+, they automatically think of Cority. How we win: Unified message + consistency + clarity + human-led, data-backed storytelling.
Voice pillars:
* Clarity: make complex EHS+ and AI topics simple and accessible (ELI5, not condescending)
* Empathy: meet the audience where they are; they face changing regulations and expectations
* Fact-based: no unverifiable claims; audience is skeptical of AI — back everything with data
* Action-oriented: always offer a practical way forward, even without the Cority product
Social storytelling themes:
1. Data-driven performance — siloed data is holding orgs back
2. Applied AI — practical Cortex AI use cases, not AI as a black box
3. Confident decision-making — when health and safety are on the line
4. Proactivity > reactivity — reactive culture is costly
5. Trust — EHS+ builds trust between companies, communities, and regulators
6. From risk to resilience — compliance as a resilience strategy
7. EHS+ as revenue driver, not cost center
8. Explain WHY and HOW — give context to Cority's converged approach
Active campaign themes (H1 2026):
* Global Brand: Converged EHS+ and Applied AI (IT consolidation, Sustainable Performance Advantage, Cortex AI)
* Environment + Sustainability: Take Control of Your Emissions
* Safety: Safety is Stronger
Always-on content: SME thought leadership, customer highlights, product education, memes and brand lore, industry commentary, behind-the-scenes, events, executive spotlights, customer wins, Verdantix/awards
High-performing content: Announcements, events with real people, internal differentiated thought leadership, data-led posts, customer stories/social proof
Underperforming: Text-only educational posts, reposts with thoughts, generic community engagement posts
Product knowledge (for AI context in all drafting)
Customer stories: 100+ case studies across industries including manufacturing, energy, healthcare, mining, transportation, and government. When drafting social proof content, customer highlight posts, or claims that need backing, reference real customer outcomes — e.g. CSX saved $500K on one health program, Walmart saved 100,000+ hours of manual labor, CAP saw a 49% decrease in compliance issues. Always check marketing restrictions (some customers are anonymized).
Product portfolio clouds: Environmental (Air Emissions, Chemical Management, Waste, Water, GHG), Health (Occupational Health, Industrial Hygiene, Employee Health, Ergonomics), Safety (Incident Management, Audits, Contractor Management, Permit to Work, Risk Assessment), Sustainability (Performance Management, Investor ESG, Supply Chain), Quality (Quality Management, Document Control). Platform includes myCority (mobile), CorAnalytics, Learning Management, Compliance Management, and Management of Change.
Key product positioning: CorityOne is the unified SaaS platform spanning all clouds. Cortex AI is Cority's applied AI product — always position as practical, use-case-specific, not a generic LLM wrapper. "Empower better" is the brand tagline. Never claim AI capabilities that aren't backed by specific product features.
Competitive differentiation: Cority is the only EHS+ platform with deep domain expertise built in (100+ EHS professionals on staff). Key differentiators: breadth of integrated solutions, offline mobile capabilities, customer success model, and people-first AI approach.
Media library (Phase 3)
Storage architecture: Storage-agnostic design — upload UI, tagging system, and media browser are built in Phase 3 with a single config variable determining the storage provider. Swap provider by changing one environment variable, no code changes needed.
Current provider: Vercel Blob (free tier = 250MB — sufficient for testing only, not a full media library)
Target provider: Cloudinary — has a free tier of 25GB which may be sufficient to start. Paid tiers start at ~$0.023/GB/month. When ready, set STORAGE_PROVIDER=cloudinary and add Cloudinary API keys to environment variables.
What the media library stores per asset: filename, upload date, file type (photo/video), tags (cloud, campaign, content type, people featured, event, platform suitability), source (event name, field visit, SME session), and whether it's been used in a brief.
AI media capabilities (Phase 3):
* Photo analysis: Claude can analyze an uploaded image and suggest caption angles, content pillar fit, platform recommendations, and lo-fi vs. polished assessment
* Video: Claude cannot watch video directly — support transcript upload or key frame extraction for analysis
Multi-user access (Phase 3+)
Roles:
* Admin (you): full access including Brand Settings, AI system prompt, UTM conventions, all data
* Contributor (SMEs, marketing teammates): submit briefs, view calendar, see approved drafts — no brand/UTM settings access
* Reviewer: read-only access to calendar and brief library
Auth approach: NextAuth.js with magic link or email/password. Users invited by Admin, assigned role on invite. No external identity provider needed.
Content Studio (Phase 3) is the first shared surface — design all Phase 3+ features with role-based visibility from the start.
Content Studio structure (Phase 3)
Three-part workspace inside the Content Studio tab:
1. Brainstorm + Draft — conversational AI interface, strategy-aware, outputs platform-specific copy variants
2. Mockup Builder — brand-templated graphic creation, PNG export, Figma-ready output; YouTube thumbnail mode separate from feed post mode
3. Editorial Calendar — Sprout Social-style calendar view (no platform connections); entries store post content, platform, scheduled date, status (draft / scheduled / posted), and linked brief; drag-to-reschedule; filterable by platform and content type; exportable as CSV
Platform cadence targets
* LinkedIn (primary): Company page 3–5x/week · 1–2 short-form vertical videos/week · 1–2 carousels/week · 2 memes/month
* YouTube: Shorts ramp to 5x/week · Long-form 2–4x/month
* Instagram, X, Facebook: Repurpose existing content — pressure test ideas, boost SEO
Request brief form fields (from existing Asana form)
* Name (auto)
* Describe your social request (required)
* When is this post needed by? (required)
* Who is the target audience? (required)
* What is the goal of this post? (required)
* Add your URL (optional)
* Add suggested copy (optional)
* Add suggested visuals (optional)
* Related Cloud: CorityOne · Health · Safety · Environmental · Sustainability · Quality · Analytics · EHS+ Converge Studio
UTM system (key conventions)
Social sources: linkedin, instagram, twitter, facebook, youtube Medium values: paidsocial (paid), social (organic), pp (promoted posts on LinkedIn) Campaign names: match existing taxonomy (see full UTM doc — complex, enforce via dropdowns not free text) Key rule: no uppercase in any UTM values
Content formats in scope
* LinkedIn: carousels, short-form video, text+image, memes
* YouTube: Shorts (vertical), long-form (horizontal), thumbnails, descriptions
* Instagram / X / Facebook: repurposed from LinkedIn/YouTube
* Scripts: Field Notes format (SME interview), Shorts scripts, long-form outlines
Design notes
* Brand color: Cority red #E3001B
* Figma export: graphics should be structured as HTML/CSS so they can be copied or exported cleanly
* File persistence: save/load as JSON in the project's /data folder; CSV export for UTMs and performance
