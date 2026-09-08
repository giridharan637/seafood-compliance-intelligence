"""
conftest.py — pytest configuration and shared fixtures for backend tests.
Uses a TEMPORARY TEST DATABASE to avoid corrupting production/demo data.
"""
import os
import sys
import pytest
import tempfile
import shutil

# Ensure backend is on path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


@pytest.fixture(scope="session", autouse=True)
def use_test_database(tmp_path_factory):
    """
    Session-scoped fixture that creates a temporary SQLite database,
    generates a minimal dataset, trains ML models, and tears down after
    all tests complete. Ensures tests do not pollute production data.
    """
    # Create temp dir for test database
    test_db_dir = tmp_path_factory.mktemp("test_db")
    test_db_path = str(test_db_dir / "test_seafood.db")

    import database as db_module
    original_db_path = db_module.DB_PATH

    # Override DB path for entire test session
    db_module.DB_PATH = test_db_path

    # Initialize and populate test DB
    db_module.init_db()

    from data_generator import generate_dataset
    generate_dataset(500)  # Small dataset for fast test execution

    from ml_engine import preprocess_and_train_models
    preprocess_and_train_models()

    yield test_db_path

    # Restore original DB path after tests
    db_module.DB_PATH = original_db_path


@pytest.fixture(scope="module")
def api_client():
    """Provides FastAPI TestClient using production app (which will use test DB via session fixture)."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture(scope="module")
def sample_batch_id():
    """Returns the first batch_id from the test database."""
    from database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT batch_id FROM product_batches LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else "BTC-SEA-5001"


@pytest.fixture(scope="module")
def sample_shipment_id():
    """Returns the first shipment_id from the test database."""
    from database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT shipment_id FROM shipments LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else "SHP-2026-101"
