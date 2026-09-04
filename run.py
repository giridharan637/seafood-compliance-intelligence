#!/usr/bin/env python3
"""
Seafood Compliance Intelligence System - Integrated Single-Command Runner
Starts the unified FastAPI backend & production SPA server on port 8001.
"""

import os
import sys
import argparse

# Ensure project root and backend directory are in sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

def check_and_prepare_environment():
    """Ensures database and frontend build exist before starting server."""
    db_path = os.path.join(BACKEND_DIR, "seafood_compliance.db")
    if not os.path.exists(db_path):
        print("[INFO] Database not found. Initializing SQLite database...")
        from database import init_db
        from data_generator import generate_dataset
        from ml_engine import preprocess_and_train_models
        from export_csv import export_all_to_csv
        init_db()
        generate_dataset(10000)
        preprocess_and_train_models()
        export_all_to_csv()
        print("[INFO] Default dataset generated and trained successfully.")

    frontend_dist = os.path.join(ROOT_DIR, "frontend", "dist")
    if not os.path.exists(frontend_dist) or not os.path.exists(os.path.join(frontend_dist, "index.html")):
        print("[WARN] frontend/dist not found. For single-server mode, run: 'npm run build' inside frontend/")

def main():
    parser = argparse.ArgumentParser(description="Run Seafood Compliance Intelligence System")
    parser.add_argument("--host", default="127.0.0.1", help="Host IP to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind (default: 8001)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    check_and_prepare_environment()

    print("\n" + "=" * 65)
    print(" [SEAFOOD COMPLIANCE INTELLIGENCE SYSTEM]")
    print("=" * 65)
    print(f" -> Web Application (UI + SPA) : http://{args.host}:{args.port}/")
    print(f" -> API Documentation (Swagger): http://{args.host}:{args.port}/docs")
    print(f" -> Health Check Endpoint      : http://{args.host}:{args.port}/api/health")
    print("=" * 65 + "\n")

    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        app_dir=ROOT_DIR
    )

if __name__ == "__main__":
    main()
