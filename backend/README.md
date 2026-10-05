# Spendly Backend

## Setup

### 1. Fill in your MySQL password

Edit `backend/.env`:
```
MYSQL_PASSWORD=your_mysql_root_password
```

### 2. Activate venv and run

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Open Swagger docs

http://localhost:8000/docs

---

## MySQL Connection

The backend auto-creates two things on first startup:
1. `spendly_main` database — holds the users table
2. `spendly_u{id}` database per user — created on register

**No manual MySQL setup needed** beyond having MySQL running with the root password in `.env`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register + create user DB |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET  | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/scan` | Upload bill image → OCR |
| POST | `/api/v1/scan/confirm` | Save confirmed scan as transaction |
| GET  | `/api/v1/items` | List items |
| POST | `/api/v1/items` | Create item |
| POST | `/api/v1/items/{id}/aliases` | Add OCR alias |
| GET  | `/api/v1/items/{id}/history` | Price history by location |
| GET  | `/api/v1/transactions` | List transactions |
| POST | `/api/v1/transactions` | Create manual transaction |
| GET  | `/api/v1/transactions/{id}` | Single transaction |
| GET  | `/api/v1/locations` | List locations |
| POST | `/api/v1/locations` | Add shop/market |
| GET  | `/api/v1/locations/{id}/prices` | Prices at this location |
| GET  | `/api/v1/dashboard/summary` | Today/week/month totals |
| GET  | `/api/v1/dashboard/trends` | Monthly trend (6 months) |
| GET  | `/api/v1/dashboard/top-items` | Most purchased items |
| GET  | `/api/v1/dashboard/price-map` | Cross-location price analytics |
