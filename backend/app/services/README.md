# Backend Services Module (`app/services`)

This directory contains the domain logic and computational engines powering the VANIQ (DailyBazaar) backend.

---

## 1. `intelligence_service.py`
**Purpose**: Computes crowdsourced market benchmarks, predictive price forecasts, restock recommendations, and vendor recommendations.

### Key Functions
- `get_market_comparison(item_id: int, user_id: int, db: Session, location_id: Optional[int] = None) -> MarketComparison`
  - **How it works**: Aggregates prices from users who opted into `share_pricing_data = True` within the last 90 days. Calculates benchmark metrics: market average, market minimum, user's last price, and percentage difference. Returns a verdict tag (`"GREAT_DEAL"`, `"FAIR_PRICE"`, `"OVERPAYING"`).
- `get_item_price_forecast(item_id: int, user_id: int, db: Session) -> PriceForecast`
  - **How it works**: Analyzes historical transaction line items. Applies linear regression trend fitting over past prices to predict price for the next 30 days, calculating confidence and volatility. Returns a recommendation (`"BUY_NOW"`, `"WAIT"`, or `"NEUTRAL"`).
- `get_restock_suggestions(user_id: int, db: Session) -> RestockSuggestions`
  - **How it works**: Calculates the average purchase cycle intervals (in days) between purchases for each item. Projects when the item is due for restock, categorizing items into `"DUE_NOW"`, `"UPCOMING"`, or `"STOCKED"`.
- `get_location_recommendations(user_id: int, db: Session) -> LocationRecommendationResponse`
  - **How it works**: Analyzes basket-level prices across distinct store locations and ranks locations based on total spend efficiency, savings percentage, and cheapest item count.
- `set_user_share_pricing(user_id: int, share: bool, db: Session) -> bool`
  - **How it works**: Updates user's privacy opt-in setting for sharing anonymized price observations with the community.

---

## 2. `badge_service.py`
**Purpose**: Gamification engine tracking badges, streaks, and shopper achievements.

### Key Functions
- `get_user_badges(user_id: int, db: Session) -> UserBadgesResponse`
  - **How it works**: Evaluates the user's transaction history, scanned hauls, and consecutive active days to evaluate achievement unlock criteria (e.g., First Haul, Centurion, Bargain Hunter, Streak Master). Returns list of earned and locked badges, progress, and current streak days.

---

## 3. `household_service.py`
**Purpose**: Multi-user household budgets, collaborative spend tracking, and pairwise debt settlement.

### Key Functions
- `create_household(name: str, owner_id: int, db: Session) -> Household`
  - **How it works**: Initializes a new household record and automatically adds the creator as `OWNER`.
- `invite_member(household_id: int, identifier: str, current_user_id: int, db: Session) -> HouseholdMember`
  - **How it works**: Resolves a target user by username or email and enrolls them as a `MEMBER`.
- `get_household_summary(household_id: int, db: Session) -> HouseholdSummary`
  - **How it works**: Aggregates all transactions belonging to the household, calculating each member's total spend and net balance.
- `calculate_settlements(household_id: int, db: Session) -> HouseholdSettlement`
  - **How it works**: Implements a debt-simplification settlement algorithm. Resolves net positive balances (creditors) against net negative balances (debtors) to produce minimal transfer instructions (`from_user` -> `to_user`).
- `record_split(transaction_id: int, splits: List[SplitItem], db: Session) -> List[ExpenseSplit]`
  - **How it works**: Saves fractional item or transaction cost assignments across household members.

---

## 4. `analytics_service.py`
**Purpose**: Dashboard metrics, personal inflation tracking, monthly run-rate forecasting, and spending DNA.

### Key Functions
- `get_monthly_forecast(db: Session, user_id: int) -> MonthlyForecast`
  - **How it works**: Computes daily run rate for the current calendar month and projects final month-end total compared against the previous month.
- `get_personal_inflation_index(db: Session, user_id: int) -> List[InflationEntry]`
  - **How it works**: Calculates month-over-month price changes across identical items in the user's typical grocery basket to compute a personalized Consumer Price Index (CPI).
- `get_price_alert_details(db: Session, user_id: int) -> PriceAlertDetails`
  - **How it works**: Detects anomalous price spikes (>15% above historical rolling median) or price drops across recent purchases.
- `get_spending_dna(db: Session, user_id: int) -> List[SpendingDnaEntry]`
  - **How it works**: Categorizes transaction items into food, dairy, household staples, produce, and generates percentage shares with design color tokens.
