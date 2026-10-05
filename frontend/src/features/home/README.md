# Home Feature Module (`features/home`)

## Overview
Executive intelligence dashboard providing high-level financial health, price watch movements, inflation metrics, and active price alerts.

## Components

### `HomePage.tsx`
- **Purpose**: Unified landing screen for authenticated users.
- **Key Sections**:
  - **Hero Total Damage**: Animated SVG wave chart with week-over-week spending delta and savings potential.
  - **Executive KPIs**: Total items, most purchased grocery, total transactions, and daily average spend.
  - **Frequent Items Carousel**: Horizontal scrolling cards showcasing top reordered items with price and frequency tags.
  - **Price Watch & Recent Hauls**: Sparkline price trajectories and recent transaction ledger.
  - **Market Intelligence & Pulse**:
    - **Personal CPI Index**: MoM basket inflation calculation with category-level rate breakdowns.
    - **Price Watchdog**: Active item price spike and drop notifications.
- **Key API Integrations**:
  - `dashboardApi.summary()`
  - `dashboardApi.topItems()`
  - `dashboardApi.priceMap()`
  - `dashboardApi.inflationIndex()`
  - `dashboardApi.priceAlerts()`
  - `transactionsApi.list()`
