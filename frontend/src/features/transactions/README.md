# Transactions Feature Module (`features/transactions`)

## Overview
Detailed financial ledger and predictive expenditure analysis, featuring 7-day spending distribution charts, monthly run-rate projection, spending DNA breakdowns, and complete haul histories.

## Components

### `TransactionsPage.tsx`
- **Purpose**: Spending deep-dive view.
- **Key Sections**:
  - **7-Day Bar Chart**: Interactive bar chart displaying daily burn rates across the rolling week.
  - **Forecast & Stats Bento**:
    - AI Run-Rate Projection: Month-to-date total, remaining days in month, and projected month-end total compared against budget pace (`dashboardApi.forecast()`).
    - General KPIs: Avg daily spend and total hauls logged.
  - **Spending DNA**: Proportional category distribution bars (Food & Produce, Dairy, Household, etc.).
  - **All Hauls**: Filterable, expandable list of all past shopping transactions with line item breakdowns.
