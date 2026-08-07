# ShuleOne Connect — Release notes (v97 · versionCode 97)

## Play Console "What's new" (user-facing — paste this)

We're now **ShuleOne Connect**! This update makes learning easier to find and use:

• Learning is organised by subject — recommended practice, grouped quests and a searchable “View all”.
• Smarter recommendations, picked for each child from their real progress.
• Clearer exam analysis: a child-vs-class chart you can scroll, with easy-to-read subject labels.
• School updates now show only what's current, each with its date.
• The student experience fits each level — primary, high school and college now get the right lessons and tools.
• Lots of quest activities fixed so lessons play smoothly from start to finish.

_(Short version, under 500 characters, if you prefer:)_

> Now **ShuleOne Connect**! Learning is grouped by subject with smarter, personalised recommendations. Clearer exam charts, current-only school updates with dates, a student experience tuned to each level (primary → college), and many quest activities fixed so lessons play smoothly.

---

## Full changelog (for testers / internal)

### New
- **App renamed to “ShuleOne Connect”** (display name only; same account, same install).
- **Recommended, from the real AI endpoint** — parent Learning and the student Quests tab now show each learner's actual next‑best step from the backend (`/api/learner/{id}/next`), with the “why”, instead of a locally‑guessed list. Student side falls back gracefully when there's no exam revision path.
- **Learning organised by subject** (parent): recommended tiles, per‑subject browse, and a grouped, **searchable “View all”** with collapsible sections and progress per subject.
- **Student Quests redesign**: modern subject tiles (progress ring + quest count), a Recommended card, quests **sub‑grouped by curriculum strand**, and compact quest rows so big lists stay tidy.
- **Level‑aware student experience**: primary, high‑school and college students get the right navigation and home — college drops the game elements and gains a fees summary and an assessments shortcut.

### Improved
- **Academics exam analysis**: child‑vs‑class **grouped‑column chart**, reliably scrollable, with clear subject abbreviations; the subject breakdown no longer gets cut off.
- **Communication → School updates**: shows only current/new updates and now displays each update's **date (with year)**.

### Fixed
- Quest **activities that previously said “this activity type isn't on mobile yet”** now play (story scenes, multi‑select, hotspots, fill‑in‑the‑blank and more).
- Hotspot/selection items that were invisible or stacked in one corner now lay out as a proper grid; answers appear in the blank as you type; no more duplicated question text or dead‑ends.

---

Build: versionCode **97**, versionName 1.0.0 · package `com.walgotech.shuleoneparents`
