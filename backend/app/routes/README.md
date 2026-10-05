# Backend Routes Module (`app/routes`)

This module exposes the REST API endpoints using FastAPI routers. All endpoints require Bearer JWT authentication (via `get_current_user` dependency) unless otherwise noted.

---

## Route Overview

| File | Prefix | Description |
| :--- | :--- | :--- |
| `auth.py` | `/auth` | User registration, login token generation, current session retrieval. |
| `transactions.py` | `/transactions` | Creation, retrieval, update, deletion of shopping hauls and line items. |
| `items.py` | `/items` | Master item catalogue, auto-complete suggestions, seed default items. |
| `scan.py` | `/scan` | Receipt OCR parsing and image processing via Gemini multimodal API. |
| `dashboard.py` | `/dashboard` | Executive KPIs, spend trends, price map, inflation index, run-rate forecast, and price alerts. |
| `profile.py` | `/users` | User profile stats, spending DNA, and privacy preference updates. |
| `intelligence.py` | `/intelligence` | Market price benchmarks, price forecasting, restock suggestions, and vendor recommendations. |
| `household.py` | `/households` | Collaborative households, expense splitting, and settlement calculation. |
| `gamification.py` | `/gamification` | Shopper achievement badges, progress, and shopping streaks. |
| `shopping_lists.py`| `/shopping-lists`| Smart shopping lists with natural language parsing and finalize-to-haul conversion. |

---

## Key Endpoints Detail

### Intelligence (`/intelligence`)
- `GET /intelligence/items/{id}/market-comparison`: Compares the user's item price against crowdsourced community benchmark averages.
- `GET /intelligence/items/{id}/price-forecast`: Predicts the 30-day price trajectory and provides BUY/WAIT recommendations.
- `GET /intelligence/restock-suggestions`: Identifies groceries due for restocking based on personal cycle cadences.
- `GET /intelligence/locations/recommendations`: Recommends optimal shopping venues based on historic item prices.
- `PATCH /intelligence/share-pricing`: Updates the user's crowdsourced pricing contribution preference.

### Household (`/households`)
- `POST /households`: Creates a new household group.
- `GET /households`: Lists all households where current user is a member.
- `GET /households/{id}/summary`: Returns collective spending breakdown and member net balances.
- `POST /households/{id}/members`: Invites a user via email or username.
- `POST /households/{id}/transactions/{tx_id}/split`: Records custom expense splits on a transaction.
- `GET /households/{id}/settlements`: Computes pairwise debt simplification matrix.

### Gamification (`/gamification`)
- `GET /gamification/badges`: Returns unlocked milestones, locked badges with progress, and active streak days.
