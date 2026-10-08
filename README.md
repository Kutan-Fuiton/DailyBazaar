# DailyBazaar (Vaniq)

Smart financial intelligence and price tracking platform built for wet markets, grocery runs, and daily bazaars.

---

## 🌟 Overview

**DailyBazaar** is a full-stack web application designed to track grocery expenses, analyze market commodity prices, and manage shopping hauls. It pairs multimodal AI vision for physical receipt parsing with fuzzy text matching to help shoppers monitor spending, track item price histories, and detect price fluctuations across local vendors.

---

## ✨ Features

- **📷 AI Bill Scanner & OCR**: Upload or snap photos of handwritten and printed grocery bills for automated item, quantity, and price extraction powered by LlamaParse and computer vision.
- **📊 Financial Analytics & Overview**: Track monthly spending totals, month-over-month deltas, and top frequently purchased groceries.
- **🏷️ Personal Inventory & Bazaar Catalog**: Manage your personal item catalogue with regional language support (English, বাংলা, हिंदी) and browse a master catalog of market staples.
- **🛒 Shopping Lists & Checklists**: Create and manage organized shopping lists with instant price estimates and interactive in-store checklist mode.
- **🧾 Past Hauls History**: Complete transaction logs showing itemized purchase receipts, vendor notes, dates, and total expense breakdown.
- **🔐 Secure Authentication**: Token-based JWT authentication with refresh token rotation and Google Sign-In integration.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion, Vanilla CSS Design System
- **Icons**: Lucide React, Google Material Symbols

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn (ASGI)
- **Database / ORM**: SQLAlchemy 2.0 with multi-tier engine support (Supabase PostgreSQL / MySQL / SQLite3)
- **Security**: Passlib (Bcrypt), PyJWT (HS256)
- **AI / OCR**: LlamaCloud (`llama-parse`), Tesseract OCR fallback
- **Text Processing**: RapidFuzz fuzzy string matching

---

## 📁 Project Structure

```text
DailyBazaar/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── core/             # Configuration, Database engine, Auth security
│   │   ├── models/           # SQLAlchemy ORM models (User, Item, Transaction, etc.)
│   │   ├── routes/           # REST endpoints (/auth, /scan, /items, /dashboard, etc.)
│   │   ├── schemas/          # Pydantic request & response models
│   │   ├── services/         # Analytics, Matching, and Unit conversion services
│   │   └── main.py           # Application entrypoint & middleware
│   ├── check_services.py     # Pre-flight service & credentials validator
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React Single Page Application
│   ├── src/
│   │   ├── features/         # Feature modules (home, scan, shop, stats, items, profile)
│   │   ├── shared/           # Reusable components, hooks, API client, AuthContext
│   │   ├── App.tsx           # App root & navigation router
│   │   └── main.tsx          # DOM entry point
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite build configuration
│
├── run.sh                    # Single-command startup script
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Git**

### Quick Start (One Command)

From the project root directory, run:

```bash
bash run.sh
```

This checks all credentials, boots the FastAPI backend on `http://localhost:8000`, and starts the Vite development server on `http://localhost:5173`.

---

### Manual Setup

#### 1. Backend Setup

```bash
cd backend
python -m venv env

# Activate Virtual Environment:
# Windows (PowerShell):
.\env\Scripts\Activate.ps1
# macOS / Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn app.main:app --reload --port 8000
```

- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- API Base URL: `http://localhost:8000/api/v1`

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

- Application URL: [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
APP_NAME=DailyBazaar
DEBUG=True
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173

# Security & Authentication
SECRET_KEY=your_secure_random_jwt_secret_key_here

# Database Configuration (Defaults to local SQLite if left empty)
SUPABASE_DB_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
CLIENT_SECRET=your_google_client_secret

# AI & OCR Extraction (Optional)
HF_TOKEN=your_huggingface_token
LLAMA_API_KEY=your_llama_cloud_api_key
```

---

## 📡 Key API Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user account |
| **Auth** | `POST` | `/api/v1/auth/login/json` | Authenticate and obtain JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/google` | Google OAuth SSO token verification |
| **Dashboard**| `GET` | `/api/v1/dashboard/overview` | Aggregated user metrics, trends & top items |
| **Scan** | `POST` | `/api/v1/scan` | Upload bill image for OCR extraction |
| **Scan** | `POST` | `/api/v1/scan/confirm` | Confirm parsed items and log haul |
| **Items** | `GET` | `/api/v1/items` | List user inventory items |
| **Catalog** | `GET` | `/api/v1/global-items` | Search global market items catalog |
| **Hauls** | `GET` | `/api/v1/transactions` | Query user's past haul receipts |
| **Lists** | `GET` | `/api/v1/shopping-lists` | Manage grocery planning checklists |

---

## 📄 License

This project is licensed under the MIT License.