# Items & Market Intel Feature Module (`features/items`)

## Overview
Manages the user's grocery catalogue, item details, historical price charts, crowdsourced market intelligence, and predictive price forecasting.

## Components

### 1. `ItemsPage.tsx`
- **Purpose**: Master inventory grid showing all tracked items with category filters, search filtering, and one-click starter-pack seeding.
- **Key Functions**:
  - `loadItems()`: Fetches `/items` catalogue.
  - `handleSeedDefaults()`: Calls `/items/seed-defaults` to provision standard Indian bazaar grocery staples.
  - Search and category state filtering across item names and categories.

### 2. `ItemDetailDrawer.tsx`
- **Purpose**: Slide-out drawer displaying detailed item metrics across three specialized tabs:
  - **Overview**: Price trends, min/max price, frequency, and purchase logs.
  - **AI Advisory**: Gemini-powered market timing, storage tips, and smart buy suggestions.
  - **Market Intel**: Live market benchmark comparison (`intelligenceApi.getMarketComparison`) and 30-day linear regression price forecasts (`intelligenceApi.getPriceForecast`) with BUY/WAIT recommendations.

### 3. `components/ItemAutocomplete.tsx`
- **Purpose**: Searchable dropdown matching user keystrokes against catalogue items to suggest existing units, categories, and past purchase prices.
