# Shared API Layer (`shared/api`)

## Overview
Centralized HTTP client layer communicating with the FastAPI backend. Implements automatic Bearer JWT injection, error handling, and structured TypeScript contract mapping.

---

## API Clients

### 1. `client.ts`
- **Purpose**: Core fetch wrapper handling URL resolution, JSON serialization, Authorization headers (`localStorage.getItem("token")`), and unified `ApiError` responses.

### 2. `auth.ts`
- `login(username, password)`: Authenticates user and returns JWT token.
- `register(username, email, password)`: Registers a new user account.
- `me()`: Fetches current session user profile.

### 3. `transactions.ts`
- `list(params)`: Retrieves filtered list of user transactions.
- `get(id)`: Fetches single transaction with line items.
- `create(data)`: Records a new transaction with items, payment mode, and location.
- `update(id, data)`: Modifies existing transaction details.
- `delete(id)`: Removes transaction and recalibrates statistics.

### 4. `items.ts`
- `list(params)`: Queries catalogue items with optional category filtering.
- `get(id)`: Fetches item details, statistics, and historical prices.
- `seedDefaults()`: Seeds standard grocery starter pack.
- `getInsights(id)`: Fetches Gemini-powered storage tips and smart buy advice.

### 5. `dashboard.ts`
- `summary()`: Executive metrics (total damage, savings, active alerts).
- `trends()`: Rolling 7-day spend breakdown.
- `topItems()`: Most frequently ordered items.
- `priceMap()`: Sparkline price watch items.
- `profileStats()`: Spending DNA and alert count.
- `forecast()`: Monthly projected spend and pace status.
- `inflationIndex()`: MoM basket CPI calculations.
- `priceAlerts()`: Price spike and drop notifications.

### 6. `intelligence.ts`
- `getMarketComparison(itemId, locationId?)`: Crowdsourced price benchmarks and verdict.
- `getPriceForecast(itemId)`: 30-day linear regression price trend prediction.
- `getRestockSuggestions()`: Estimated grocery depletion and restock schedule.
- `getLocationRecommendations()`: Optimal store recommendations by total basket cost.
- `toggleSharePricing(share)`: Updates user's privacy opt-in preference.

### 7. `household.ts`
- `createHousehold(data)`: Creates a new shared household.
- `listHouseholds()`: Lists user's households.
- `getSummary(id)`: Fetches household spend breakdown and balances.
- `inviteMember(id, identifier)`: Invites member by username or email.
- `recordSplit(id, txId, splits)`: Records custom expense splits.
- `getSettlements(id)`: Computes pairwise debt simplification matrix.

### 8. `gamification.ts`
- `getBadges()`: Fetches user achievements, unlocked badges, and shopping streak.

### 9. `shoppingLists.ts`
- `list()`: Lists all shopping checklists.
- `create(data)`: Creates a new checklist.
- `parseText(text)`: Natural language text parser converting plain text to grocery line items.
- `toggleBought(listId, itemId, isBought)`: Toggles item check status.
- `finalize(listId, data)`: Converts completed shopping checklist into an official logged haul transaction.
