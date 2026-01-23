import os
import sys
from pathlib import Path
import uvicorn
from app.main import app


def load_env_near_exe():
    try:
        from dotenv import load_dotenv
    except Exception:
        return
    exe_dir = Path(sys.executable).resolve().parent
    env_path = exe_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)


def main():
    load_env_near_exe()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()