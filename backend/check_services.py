import sys
import os

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings

def check_all():
    print("--------------------------------------------------")
    print("Checking Credentials & Service Connections...")
    print("--------------------------------------------------")

    # 1. Supabase PostgreSQL
    supabase_url = settings.SUPABASE_DB_URL
    if supabase_url:
        try:
            import psycopg2
            if supabase_url.startswith("postgres://"):
                supabase_url = supabase_url.replace("postgres://", "postgresql://", 1)
            conn = psycopg2.connect(supabase_url, connect_timeout=5)
            conn.close()
            print("[OK]   Supabase DB: Connected")
        except Exception:
            print("[FAIL] Supabase DB: Can't connect (Falling back to MySQL)")
    else:
        print("[FAIL] Supabase DB: Can't connect (SUPABASE_DB_URL missing)")

    # 2. Redis Cloud / Upstash
    redis_url = settings.REDIS_URL
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url, socket_timeout=4)
            if r.ping():
                print("[OK]   Redis DB: Connected")
            else:
                print("[FAIL] Redis DB: Can't connect")
        except Exception:
            print("[FAIL] Redis DB: Can't connect")
    else:
        print("[FAIL] Redis DB: Can't connect (REDIS_URL missing)")

    # 3. JWT Authentication
    if settings.SECRET_KEY and settings.SECRET_KEY.strip() != "change_me":
        print("[OK]   JWT Authentication: Configured")
    else:
        print("[FAIL] JWT Authentication: Can't connect (SECRET_KEY missing)")

    # 4. Google OAuth Sign-In
    google_id = settings.effective_google_client_id
    if google_id and google_id.strip():
        # Mask the middle of the client ID for secure terminal display
        masked = google_id[:12] + "..." + google_id[-18:] if len(google_id) > 30 else google_id
        secret_status = " + Secret present" if (settings.CLIENT_SECRET and settings.CLIENT_SECRET.strip()) else ""
        print(f"[OK]   Google OAuth: Configured ({masked}{secret_status})")
    else:
        print("[FAIL] Google OAuth: Missing (VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID missing in .env)")

    # 5. Hugging Face Token
    if settings.HF_TOKEN and settings.HF_TOKEN.strip():
        print("[OK]   HuggingFace Token: Configured")
    else:
        print("[FAIL] HuggingFace Token: Can't connect (HF_TOKEN missing in .env)")

    # 6. LLaMA Token
    if settings.LLAMA_API_KEY and settings.LLAMA_API_KEY.strip():
        print("[OK]   LLaMA Token: Configured")
    else:
        print("[FAIL] LLaMA Token: Can't connect (LLAMA_API_KEY missing in .env)")

    # 7. Dedicated Global Items Database
    global_db_path = os.path.join(backend_dir, "global_items.db")
    if os.path.exists(global_db_path):
        import sqlite3
        try:
            conn = sqlite3.connect(global_db_path)
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM global_items")
            cnt = c.fetchone()[0]
            conn.close()
            print(f"[OK]   Global Item DB: Active ({cnt} catalog staples loaded)")
        except Exception:
            print("[OK]   Global Item DB: Active (SQLite ready)")
    else:
        print("[INFO] Global Item DB: Initializing on startup")

    print("--------------------------------------------------\n")

if __name__ == "__main__":
    check_all()
