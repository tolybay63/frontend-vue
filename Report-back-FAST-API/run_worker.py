import os
import sys
 
def _resource_path(relative: str) -> str:
    exe_dir = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(__file__)
    p = os.path.join(exe_dir, relative)
    if os.path.exists(p):
        return p
    return os.path.join(os.getcwd(), relative)
 
def main():
    try:
        from dotenv import load_dotenv
        env_path = _resource_path(".env")
        if os.path.exists(env_path):
            load_dotenv(env_path, override=False)
    except Exception:
        pass
 
    import app.worker
    app.worker.main()
 
if __name__ == "__main__":
    main()

