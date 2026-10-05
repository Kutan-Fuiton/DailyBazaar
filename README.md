# 🥬 Vaniq (DailyBazaar) — Financial Intelligence for Everyday Bazaar Spending

> **Version:** `2.0.0` • **Codename:** `DailyBazaar` (formerly *Spendly*)  
> **Aesthetic:** Neo-Brutalist Glassmorphism • **Palette:** Obsidian Dark, Electric Lime, Cyan Glow, Sunset Mango  
> **Status:** Production-Ready Core Architecture & Live Full-Stack API Integration

---

## 📖 Table of Contents
1. [Executive Overview & Brand Philosophy](#-executive-overview--brand-philosophy)
2. [System Architecture](#-system-architecture)
3. [Repository Directory Structure](#-repository-directory-structure)
4. [Tech Stack Breakdown](#-tech-stack-breakdown)
5. [Core Working Features (Production Deep Dive)](#-core-working-features-production-deep-dive)
6. [Intelligent Backend Processing Pipeline](#-intelligent-backend-processing-pipeline)
7. [REST API Reference](#-rest-api-reference)
8. [Local Development & Setup Guide](#-local-development--setup-guide)
9. [Active Developer Notes & In-Flight Polish](#-active-developer-notes--in-flight-polish)
10. [Planned Feature Roadmap (Short to Mid Term)](#-planned-feature-roadmap-short-to-mid-term)
11. [The "Unplanned Horizon" — Speculative & Visionary Concepts](#-the-unplanned-horizon--speculative--visionary-concepts)
12. [Contribution & Engineering Guidelines](#-contribution--engineering-guidelines)

---

## 🌟 Executive Overview & Brand Philosophy

**Vaniq** is a hyper-modern financial intelligence platform designed specifically for the dynamics of local wet markets, grocery runs, and daily bazaars. While conventional personal finance software is built for static credit card receipts and clean digital invoices, Vaniq is tailored to handle:
- **Handwritten & wrinkled bazaar receipts** via AI-powered OCR and vision parsers.
- **Dynamic commodity price volatility** across specific local markets, mandis, and corner shops.
- **Vernacular item synonyms and colloquial naming** through multi-tier fuzzy matching cascades.
- **Tactile, high-energy UI UX** blending neo-brutalist typography (`Syne`, `Hanken Grotesk`, `Space Mono`) with translucent glass layers and electric high-contrast accents.

### Brand Design Tokens
- **Background:** Obsidian Surface (`#111508` / `#0C0F04`)
- **Primary Energy:** Electric Lime (`#C3F400` / `#ABD600`)
- **Secondary Glow:** Cyan Spark (`#00DCE5` / `#63F7FF`)
- **Accent Alert:** Mango Sunset (`#FFB86F` / `#FFDCBD`) & Hot Coral (`#FFB4AB`)
- **Glassmorphism:** `backdrop-filter: blur(12px)` with `1px` subtle translucent white borders and `4px 4px 0px #000` tactile neo-brutalist offset drop shadows.

---

## 🏗 System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  Vaniq Web Client                      │
                                  │    React 19 + TypeScript + Vite + Tailwind CSS v4      │
                                  │         Framer Motion + Shadcn UI + Base UI            │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              │ HTTP REST + Bearer JWT Auth
                                                              │ Base URL: /api/v1
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  FastAPI Backend Server                │
                                  │              (Python 3.10+, Uvicorn Async)             │
                                  └───────────────┬────────────────────────┬───────────────┘
                                                  │                        │
                    ┌─────────────────────────────┴────────┐               │
                    ▼                                      ▼               ▼
 ┌──────────────────────────────────────┐        ┌─────────────────┐ ┌────────────────────────┐
 │       Unified Database Layer         │        │  AI Vision/OCR  │ │ Intelligent Services   │
 │   1. Supabase PostgreSQL (Cloud)     │        │  LlamaParse     │ │ - RapidFuzz Matcher    │
 │   2. MySQL Server (Local Engine)     │        │  Tesseract OCR  │ │ - Volatility Detector  │
 │   3. SQLite3 (Offline Fallback)      │        │  Image Cleanup  │ │ - Spending DNA Engine  │
 └──────────────────────────────────────┘        └─────────────────┘ └────────────────────────┘
```

---

## 📁 Repository Directory Structure

```text
DailyBazaar/
├── backend/                             # Python FastAPI Backend
│   ├── app/
│   │   ├── core/                        # Configuration, Database engine, Auth security, Dependencies
│   │   │   ├── config.py                # Pydantic Settings (.env configuration loader)
│   │   │   ├── database.py              # 3-Tier DB Engine (Supabase -> MySQL -> SQLite fallback)
│   │   │   ├── deps.py                  # JWT Auth dependency injection (get_current_user)
│   │   │   └── security.py              # Password hashing (bcrypt) & JWT token signing
│   │   ├── models/                      # SQLAlchemy ORM Models
│   │   │   ├── user.py                  # User account entity
│   │   │   ├── item.py                  # Item catalog, ItemAliases, ItemPriceHistory
│   │   │   ├── transaction.py           # Transactions & TransactionItems
│   │   │   ├── location.py              # Vendor shops, Mandi hubs, MarketPriceHistory
│   │   │   ├── shopping_list.py         # ShoppingLists & ShoppingListItems
│   │   │   └── scan.py                  # Scan receipts & OCR raw metadata
│   │   ├── ocr/                         # AI Vision & OCR parsing scripts
│   │   │   └── llama_parsing.py         # LlamaCloud multi-modal receipt extractor
│   │   ├── routes/                      # API Endpoints (Mounted under /api/v1)
│   │   │   ├── auth.py                  # Registration, JWT login, Google SSO OAuth
│   │   │   ├── dashboard.py             # Analytics, spending trends, top items, price maps
│   │   │   ├── items.py                 # Catalogue CRUD, aliases, 30-day price history
│   │   │   ├── locations.py             # Market hub locations & price reports
│   │   │   ├── profile.py               # User statistics & Spending DNA breakdown
│   │   │   ├── scan.py                  # Receipt upload & scan-to-transaction confirmation
│   │   │   ├── shopping_lists.py        # Planning, checklists, item estimates
│   │   │   └── transactions.py          # Haul logging, transaction querying & deletion
│   │   ├── schemas/                     # Pydantic validation request/response schemas
│   │   ├── services/                    # Business Logic Layer
│   │   │   ├── analytics_service.py     # Volatility, weekly % deltas, spending categories
│   │   │   ├── matching_service.py      # RapidFuzz 3-tier item matching cascade
│   │   │   ├── ocr_service.py           # OCR text normalization & JSON mapping
│   │   │   ├── parsing_service.py       # Deterministic line item regex & heuristic parser
│   │   │   ├── suggestion_service.py    # Auto-complete suggestions & restock frequency
│   │   │   └── unit_service.py          # Weight/volume/metric unit normalization
│   │   └── main.py                      # FastAPI App initialization, CORS, Lifespan hook
│   ├── docs/                            # Deep technical design documentation
│   ├── requirements.txt                 # Core Python production dependencies
│   └── requirements-ml.txt              # Optional ML & OCR processing packages
│
├── frontend/                            # React 19 + TypeScript Single Page Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx                  # Root shell, Splash Screen, Auth modal gatekeeper
│   │   │   └── routes.tsx               # Central React Router navigation registry
│   │   ├── features/                    # Modular Feature-Driven Pages & Components
│   │   │   ├── home/                    # Dashboard view, financial wave chart, quick stats
│   │   │   ├── scan/                    # Unified Input Hub (OCR Scan, Manual Entry, Planning)
│   │   │   ├── items/                   # Item inventory catalog, custom drawer, alias editor
│   │   │   ├── transactions/            # Financial Pulse, Haul history, Spending DNA breakdown
│   │   │   └── profile/                 # User settings, security, financial stats
│   │   ├── shared/                      # Global reusable utilities, API clients, contexts
│   │   │   ├── api/                     # Axios/Fetch client modules per route
│   │   │   ├── context/                 # AuthContext (JWT session management)
│   │   │   ├── types/                   # Shared TypeScript models
│   │   │   └── components/              # Navbar, Buttons, Modals, Drawers, Loaders
│   │   ├── index.css                    # Tailwind CSS v4 styling & Neo-Brutalist design tokens
│   │   └── main.tsx                     # Vite DOM mount point
│   ├── package.json                     # Frontend npm dependencies and build scripts
│   └── vite.config.ts                   # Vite configuration with React & Tailwind plugins
│
├── VaniqDesign/                         # Visual specifications, tokens, and design references
│   ├── DESIGN.md                        # Master UI design tokens & brand style guide
│   └── code.html                        # Reference prototype implementation
└── README.md                            # Main project documentation (You are here)
```

---

## ⚡ Tech Stack Breakdown

### Frontend (Client Layer)
| Technology | Version | Purpose |
|---|---|---|
| **React** | `19.2.5` | Reactive component-driven UI architecture |
| **TypeScript** | `~6.0.2` | End-to-end type safety across schemas & state |
| **Vite** | `^8.0.10` | Ultra-fast build engine & Hot Module Replacement (HMR) |
| **Tailwind CSS** | `^4.2.4` | Modern zero-runtime styling engine with CSS variables |
| **Framer Motion** | `^12.38.0` | Fluid animations, spring physics, and screen transitions |
| **React Router DOM** | `^7.14.2` | Declarative client-side routing & deep linking |
| **Lucide React** | `^1.11.0` | Crisp SVG interface iconography |
| **Base UI / Shadcn** | `^1.4.1 / ^4.5.0` | Accessible headless primitives & styled components |

### Backend (Server & Intelligence Layer)
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | `^0.115.0` | High-performance asynchronous REST API framework |
| **Uvicorn** | `^0.30.0` | Lightning-fast ASGI web server |
| **SQLAlchemy** | `^2.0.0` | ORM with unified relationship mappings & session pooling |
| **RapidFuzz** | `^3.9.0` | C++ accelerated Levenshtein / WRatio fuzzy text matching |
| **Passlib (Bcrypt)** | `^1.7.4` | Secure irreversible password hashing |
| **PyJWT / Python-Jose** | `^3.3.0` | Stateless JSON Web Token authentication |
| **Pydantic v2** | `^2.8.0` | Strict data validation & schema serialization |

### AI & Vision Processing
- **LlamaCloud (`llama-parse`)**: Multi-modal document vision API extracting structured JSON arrays (`name`, `qty`, `price`, `unit`) from unstructured and handwritten bills.
- **Tesseract OCR / Pillow / OpenCV**: Local fallback pipeline for offline image pre-processing, contrast equalization, grayscale thresholding, and glyph extraction.

### Database Engine (Tri-Tier Auto-Discovery)
1. **Supabase PostgreSQL** (`psycopg2-binary`): Primary cloud database supporting high-concurrency production deployments.
2. **Local MySQL** (`pymysql`): Secondary fallback for self-hosted local installations.
3. **SQLite3**: Zero-configuration local database (`vaniq.db`) activated automatically if remote servers are unreachable.

---

## 🚀 Core Working Features (Production Deep Dive)

### 1. Unified Authentication & Multi-Tenancy
- **JWT Stateless Authentication**: Secure register (`/auth/register`) and login (`/auth/login/json`) returning signed access tokens.
- **Google SSO Integration**: One-click Google Identity authentication with auto-provisioning.
- **Tenant Isolation**: Every database entity is strictly scoped to `user_id` at the database foreign key level. Queries automatically isolate user data.

### 2. Multi-Modal Unified Scan Hub (`/scan`)
- **Camera / Receipt Upload**: Upload photos or PDFs of physical grocery receipts.
- **Autonomous Parsing**: Converts messy receipt photos into structured data.
- **Interactive Review & Verification**: Review, adjust line items, correct parsed prices/quantities, and assign shop locations before saving.
- **Atomic Confirmation**: Converts the scan into a logged transaction, auto-updates the user's item catalog, and records new price points in `ItemPriceHistory`.

### 3. Rapid Manual "Haul" Logger
- **One-Tap Manual Entry**: Quickly log bazaar purchases without receipts.
- **Smart Catalog Matching**: Automatically identifies canonical catalog items and attaches custom emojis.
- **Real-Life Units & Pricing**: Supports flexible metric/imperial units (kg, g, l, ml, pcs, dozen, bunch).

### 4. Item Catalog & Synonyms Intelligence (`/items`)
- **Custom Item Catalog**: User-managed directory of grocery items with custom emojis, categories (Produce, Dairy, Spices, Meat, Bakery, Staples), and base prices.
- **Alias & Synonym Management**: Map multiple colloquial names to a single item (e.g., *"Alu"*, *"Batata"*, *"Potato"*, *"Aloo Jyoti"* all resolve to 🥔 **Potato**).
- **30-Day Historical Price Sparklines**: Visualize commodity price fluctuations for any specific item over time.

### 5. Bazaar Planning & Shopping Lists
- **Checklist Engine**: Create, archive, and manage active shopping lists with estimated vs. actual pricing.
- **Live Estimate Aggregator**: Real-time calculation of projected basket totals before heading to the market.

### 6. Financial Pulse Dashboard & Analytics (`/home` & `/transactions`)
- **Total Damage Counter**: Today's, weekly, and monthly spend totals with weekly percentage change indicators.
- **7-Day Spending Waveform**: Interactive visualization of expenditure trends.
- **Top Items Breakdown**: Top 10 most frequently purchased goods with average cost and last purchase dates.
- **Price Volatility & Spike Alerts**: Algorithms detect abnormal price spikes (>10% above rolling averages) to alert users to market surges.
- **Spending DNA**: Proportional category distribution charts showing budget breakdown across food groups.

---

## 🧠 Intelligent Backend Processing Pipeline

### 1. Three-Tier Item Matching Cascade (`matching_service.py`)
When a scanned receipt or voice string produces a raw text item (e.g., *"Fresh Org Tomatos 1kg"*), Vaniq resolves it to a canonical item using a cascading strategy:
```
Raw String Input
      │
      ▼
[ Tier 1: Exact Match ] ────(Found)────► Return Canonical Item
      │ (Miss)
      ▼
[ Tier 2: Alias Table Match ] ─(Found)─► Return Canonical Item
      │ (Miss)
      ▼
[ Tier 3: RapidFuzz WRatio (≥80) ] ────► Match Best Candidate OR Create New
```

### 2. Volatility & Price Spike Detection (`analytics_service.py`)
- Computes 7-day and 30-day rolling average prices per item.
- Evaluates recent purchases:
  $$\Delta_{\text{price}} = \frac{\text{Current Price} - \text{Rolling Average}}{\text{Rolling Average}} \times 100$$
- Triggers dynamic alert banners whenever $\Delta_{\text{price}} > +10\%$.

---

## 📡 REST API Reference

All API routes are mounted with the `/api/v1` prefix.

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user account | No |
| `POST` | `/auth/login/json` | Authenticate credentials & receive JWT token | No |
| `POST` | `/auth/login` | OAuth2 form-urlencoded login endpoint | No |
| `POST` | `/auth/google` | Google SSO ID Token verification | No |
| `GET` | `/auth/me` | Fetch authenticated user profile | Yes |

### Receipt Scanning (`/api/v1/scan`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/scan` | Upload receipt image/PDF for AI OCR analysis | Yes |
| `POST` | `/scan/confirm` | Confirm parsed items & record atomic transaction | Yes |

### Transactions (`/api/v1/transactions`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/transactions` | List & filter logged transactions (pagination, search) | Yes |
| `POST` | `/transactions` | Manually log a transaction with line items | Yes |
| `GET` | `/transactions/{id}` | Get single transaction detail receipt | Yes |
| `DELETE` | `/transactions/{id}` | Delete transaction record & reverse price history | Yes |

### Item Catalogue & Volatility (`/api/v1/items`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/items` | List user inventory items (search & category filter) | Yes |
| `POST` | `/items` | Add a new canonical item to catalogue | Yes |
| `GET` | `/items/{id}` | Retrieve item details and synonyms/aliases | Yes |
| `DELETE` | `/items/{id}` | Delete item from user inventory | Yes |
| `POST` | `/items/{id}/aliases` | Add OCR alias / synonym keyword to an item | Yes |
| `DELETE` | `/items/{id}/aliases/{alias_id}` | Remove alias keyword | Yes |
| `GET` | `/items/{id}/history` | 30-day historical price points for trend graphing | Yes |

### Dashboard & Analytics (`/api/v1/dashboard` & `/api/v1/users`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/dashboard/summary` | Today/week/month totals, delta %, savings potential | Yes |
| `GET` | `/dashboard/trends` | 7-day daily spend breakdown | Yes |
| `GET` | `/dashboard/top-items` | Top 10 most purchased items | Yes |
| `GET` | `/dashboard/price-map` | Sparklines and price delta percentages | Yes |
| `GET` | `/users/me/stats` | Category-wise Spending DNA and active alert count | Yes |

### Shopping Lists (`/api/v1/shopping-lists`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/shopping-lists` | List active and archived shopping lists | Yes |
| `POST` | `/shopping-lists` | Create a new shopping checklist | Yes |
| `GET` | `/shopping-lists/{id}` | Get shopping list with items & estimates | Yes |
| `DELETE` | `/shopping-lists/{id}` | Remove shopping list | Yes |

### Locations & Vendor Hubs (`/api/v1/locations`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/locations` | List user's saved markets/vendors | Yes |
| `POST` | `/locations` | Save a new bazaar or shop location | Yes |
| `GET` | `/locations/{id}/prices` | View historical item prices at this location | Yes |

---

## 🛠 Local Development & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (`npm` v9+)
- **Python**: v3.10 or higher
- *(Optional)* **MySQL Server** or **Supabase Account** (Defaults to SQLite out-of-the-box)

---

### Backend Setup

1. **Navigate to the backend folder**:
   ```powershell
   cd backend
   ```

2. **Set up Python Virtual Environment**:
   ```powershell
   python -m venv env
   .\env\Scripts\Activate.ps1   # On Windows PowerShell
   # source env/bin/activate    # On Linux/macOS
   ```

3. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `backend/.env` file (see `.env.example`):
   ```env
   APP_NAME=Vaniq
   DEBUG=True
   HOST=0.0.0.0
   PORT=8000
   SECRET_KEY=super_secret_jwt_key_change_in_production
   FRONTEND_URL=http://localhost:5173

   # Optional: Database Connection (defaults to SQLite if left empty)
   # SUPABASE_DB_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
   # MYSQL_HOST=localhost
   # MYSQL_USER=root
   # MYSQL_PASSWORD=your_password
   # MYSQL_MAIN_DB=vaniq_main

   # Optional: AI OCR Keys
   # LLAMA_API_KEY=your_llama_cloud_api_key
   ```

5. **Start the Backend API Server**:
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - **API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Frontend Setup

1. **Navigate to the frontend folder**:
   ```powershell
   cd frontend
   ```

2. **Install NPM Packages**:
   ```powershell
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `frontend/.env` file:
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```

4. **Start the Vite Dev Server**:
   ```powershell
   npm run dev
   ```
   - **Web Application URL:** [http://localhost:5173](http://localhost:5173)

---

## 📝 Active Developer Notes & In-Flight Polish

The following engineering tasks are actively in progress or targeted for near-term polish:

1. **Client-Side Data Caching (Fast Reloads)**:
   - Implement client-side query caching (via TanStack Query or an SWR-style IndexedDB layer) so returning to `/items`, `/transactions`, or `/home` loads instantly without showing skeleton spinners.
2. **Arbitrary Decimal Quantities & Unit System**:
   - Enable precise floating-point quantity inputs (e.g., `0.350 kg`, `250 g`, `1.5 dozen`).
   - Add automated unit conversions (e.g., converting grams directly into kilograms for consistent price-per-unit history).
3. **UI Contrast & Focus States**:
   - Refine numeric input bars on web browsers where dark mode inputs can show white native browser controls.
   - Enforce uniform glass glow focus states across all modal inputs.

---

## 🗺 Planned Feature Roadmap (Short to Mid Term)

Refer to [`backend/docs/VANIQ_FEATURE_ROADMAP.md`](file:///c:/Users/Subarno%20Chakraborty/Coding/Project/DailyBazaar/backend/docs/VANIQ_FEATURE_ROADMAP.md) for full architectural specs.

### 1. Price Intelligence & Community Benchmarking
- **Crowd-Sourced Price Comparison**: Anonymously aggregate commodity prices across users at identical market locations (e.g., *"You paid ₹40/kg for Onions; market average at Gariahat Bazaar is ₹34/kg"*).
- **Seasonal Trend Forecasting**: Rolling linear regression to forecast seasonal price shifts (e.g., tomato/onion monsoon price spikes).
- **Personal Grocery Inflation Index**: Track custom personal inflation rates against national CPI data.

### 2. Multi-User & Household Collaboration
- **Shared Household Budgets**: Multi-user shared vaults where family members or roommates log shared grocery expenses.
- **Split Expense Settlement**: Splitwise-style "who owes whom" calculations on bazaar runs.

### 3. Smart Logging & Input Extensions
- **Voice-to-Transaction Logging**: Use Whisper / Web Speech API to dictate purchases in natural language (*"Bought 2 kilos potatoes for 50 rupees and 500g ginger for 40"*).
- **"Market Run" Rapid Bulk Entry**: A spreadsheet-style fast-logging table optimized for entering 15+ items in under 30 seconds.
- **Checklist-to-Transaction Conversion**: One-tap action on the Shopping List page to convert checked items directly into a logged transaction with recorded price histories.

### 4. Vernacular & Multi-Language OCR
- **Regional Script Ingestion**: Expand OCR preprocessing with Tesseract language packs and multi-modal models to parse handwritten slips in Hindi, Bengali, Tamil, Telugu, and other regional scripts.

---

## 🔮 The "Unplanned Horizon" — Speculative & Visionary Concepts

These ideas represent high-potential, long-range future concepts not yet scheduled on the development roadmap:

### 1. Augmented Reality (AR) "Mandi Vision"
- **Live Camera Price Overlay**: Point a mobile device camera at a vegetable stall chalkboard or vendor price display. Using on-device lightweight WebAssembly vision models, the app overlays floating green/red indicators showing whether the quoted price is above or below historical averages before you pay.

### 2. Decentralized Local Mandi Price Mesh (P2P Gossip Network)
- **Zero-Knowledge Price Proofs**: Cryptographically verified, privacy-preserving peer-to-peer price gossip protocol allowing neighborhood shoppers to crowdsource daily produce prices across local bazaars without relying on a central corporate database.

### 3. AI Kitchen & Smart Pantry Auto-Deduction
- **Smart Scale & IoT Sensor Sync**: Wireless kitchen container scales that automatically detect depletion of rice, lentils, or oil, auto-generating replenishment line items on your Vaniq shopping list when stocks drop below 20%.

### 4. Nutritional Cost-Efficiency Engine
- **Macro-Nutrient Value Intelligence**: Analyze spending relative to nutritional yield (e.g., *"Cost per 100g protein"* across paneer, eggs, lentils, and chicken; *"Vitamins per Rupee"* across seasonal greens).

### 5. Autonomous Voice Bargaining Coach
- **Real-Time Vendor Negotiation Assistant**: An earpiece-accessible LLM agent that listens to ambient vendor quotes and whispers suggested counter-offers based on today's verified wholesale mandi rates (*"Offer ₹30 for 1.5kg, the wholesale rate just dropped 15% this morning"*).

### 6. Conversational Chatbot Ingestion (WhatsApp & Telegram)
- **Zero-UI Ingestion Bot**: Drop a receipt photo, voice note, or casual text message directly into a Vaniq WhatsApp/Telegram chat bot. The webhook processes the image, matches items, and updates your personal dashboard without requiring you to open the web app.

---

## 🤝 Contribution & Engineering Guidelines

1. **Strict Multi-Tenancy Scoping**: Never write a database query for `Item`, `Transaction`, or `ShoppingList` without appending `.filter(Model.user_id == current_user.id)`.
2. **Design System Fidelity**: Do not introduce generic styling. Reuse the curated tokens defined in `frontend/src/index.css` and typography rules in `VaniqDesign/DESIGN.md`.
3. **Fuzzy Matching Protocol**: Always route unstructured string inputs through `matching_service.py` to preserve catalog integrity and avoid duplicate item creation.
4. **Iconography**: Use `<span className="material-symbols-outlined">icon_name</span>` for all iconography.

---

<div align="center">
  <sub>Engineered with precision for the modern bazaar shopper • Powered by Vaniq</sub>
</div>