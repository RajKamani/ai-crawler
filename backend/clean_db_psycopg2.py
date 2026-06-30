import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
# Clean up password if needed, but psycopg2 can take URL directly.
if not db_url:
    print("No DATABASE_URL")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    print("Connected to DB.")
    
    cur.execute("DELETE FROM crawler_settings WHERE user_id IS NOT NULL;")
    print("Deleted user rows:", cur.rowcount)
    
    cur.execute("SELECT crawler_name FROM crawler_settings WHERE user_id IS NULL;")
    globals = [r[0] for r in cur.fetchall()]
    print("Global settings:", globals)
    
    conn.commit()
    cur.close()
    conn.close()
except Exception as e:
    print("DB error:", e)
