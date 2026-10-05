# Profile Feature Module (`features/profile`)

## Overview
User collector profile, shopper gamification milestones, active shopping streaks, spending DNA analytics, and privacy preferences.

## Components

### `ProfilePage.tsx`
- **Purpose**: Collector portfolio and account settings.
- **Key Sections**:
  - **Collector Hero**: Avatar, username, active shopping streak (`current_streak_days`), and unlocked badge count.
  - **Analytics Overview**: Total hauls, all-time damage, tracked items, and high-priority price alert counts.
  - **Achievements & Badges**: Gamification grid displaying earned and locked badges with descriptions and achievement status (`gamificationApi.getBadges()`).
  - **Spending DNA**: Live visual breakdown of grocery expenditures by product department.
  - **Settings & Privacy**:
    - **Crowdsourced Market Intelligence**: Interactive toggle enabling or disabling anonymized contribution of pricing observations (`intelligenceApi.toggleSharePricing()`).
    - Profile editing, export data, and session sign-out.
