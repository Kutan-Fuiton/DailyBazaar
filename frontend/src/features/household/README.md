# Household Feature Module (`features/household`)

## Overview
Provides collaborative household budget management, shared expense tracking, and debt settlement in VANIQ.

## Components & Pages

### `HouseholdPage.tsx`
- **Purpose**: Main household dashboard where users can switch between their households, view aggregated spending summaries, invite members, and review settlement debt transfers.
- **Key Functions**:
  - `fetchHouseholds()`: Queries `/households` to populate available user households.
  - `loadDetails(id: number)`: Concurrently fetches household summary metrics (`/households/{id}/summary`) and settlements (`/households/{id}/settlements`).
  - `handleCreateHousehold(e: React.FormEvent)`: Submits creation payload to `/households`.
  - `handleInvite(e: React.FormEvent)`: Sends an invitation via email/username to `/households/{id}/members`.
- **Styling**:
  - Dark glass bento layout with electric lime (`#c3f400`) and cyan (`#00dce5`) accents.
  - Interactive status badges, debt transfer direction indicators, and responsive modals.
