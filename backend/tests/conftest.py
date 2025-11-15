import os
import time
import psycopg2
from pathlib import Path
import pytest
from dotenv import load_dotenv
import sys


# Load project .env if present
ROOT = Path(__file__).resolve().parents[1]
env_path = ROOT / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Ensure the project root (backend/) is on sys.path so `import app` works when running tests
sys.path.insert(0, str(ROOT))

# If developer dependencies like Flask-Migrate aren't installed in this environment,
# provide a minimal stub so the app factory can import. This avoids requiring
# installing dev-only packages just to run the unit tests in CI/dev containers.
try:
    import flask_migrate  # noqa: F401
except Exception:
    import types
    class _DummyMigrate:
        def __init__(self, *a, **k):
            pass
        def init_app(self, app, db):
            return None
    mod = types.ModuleType('flask_migrate')
    mod.Migrate = _DummyMigrate
    sys.modules['flask_migrate'] = mod

try:
    import flask_jwt_extended  # noqa: F401
except Exception:
    import types
    class _DummyJWTManager:
        def __init__(self, *a, **k):
            pass
        def init_app(self, app):
            return None
    mod = types.ModuleType('flask_jwt_extended')
    mod.JWTManager = _DummyJWTManager
    sys.modules['flask_jwt_extended'] = mod

try:
    import flask_cors  # noqa: F401
except Exception:
    import types
    def _dummy_cors(app):
        return None
    mod = types.ModuleType('flask_cors')
    mod.CORS = _dummy_cors
    sys.modules['flask_cors'] = mod


def _get_env(name, default=None):
    return os.environ.get(name, default)


def _create_database(user, password, host, port, dbname):
    # connect to default 'postgres' db to run CREATE DATABASE
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(dbname='postgres', user=user, password=password, host=host, port=port)
        conn.set_session(autocommit=True)
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (dbname,))
        exists = cur.fetchone() is not None
        if not exists:
            cur.execute(f"CREATE DATABASE \"{dbname}\"")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def _drop_database(user, password, host, port, dbname):
    # terminate connections and drop database
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(dbname='postgres', user=user, password=password, host=host, port=port)
        conn.set_session(autocommit=True)
        cur = conn.cursor()
        # force disconnect other connections
        cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=%s AND pid<>pg_backend_pid()", (dbname,))
        cur.execute(f"DROP DATABASE IF EXISTS \"{dbname}\"")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@pytest.fixture(scope='session')
def test_database():
    """Create a fresh test database using same credentials as in .env but with a _test suffix.

    Yields the DATABASE_URL for the test DB and ensures cleanup at the end of the session.
    """
    user = _get_env('DATABASE_USER', 'postgres')
    password = _get_env('DATABASE_PASSWORD', '')
    host = _get_env('DATABASE_HOST', 'localhost')
    port = _get_env('DATABASE_PORT', '5432')
    name = _get_env('DATABASE_NAME', 'appdb')

    test_name = f"{name}_test"

    _create_database(user, password, host, port, test_name)

    # Construct SQLAlchemy URL and export so create_app picks it up
    test_url = f"postgresql://{user}:{password}@{host}:{port}/{test_name}"
    os.environ['DATABASE_URL'] = test_url

    # wait a moment for the DB to be ready
    time.sleep(0.1)
    yield test_url

    # teardown: drop the test database
    _drop_database(user, password, host, port, test_name)


@pytest.fixture(scope='function')
def client(test_database):
    """Create the Flask test client and initialize database schema for each test function."""
    # Import here so that app config picks up the overridden DATABASE_URL
    from app import create_app
    from app.models.base import db

    app = create_app()

    # Create tables
    with app.app_context():
        db.create_all()

    client = app.test_client()

    yield client

    # Teardown: drop all tables in the test database between tests
    with app.app_context():
        db.session.remove()
        db.drop_all()
        # dispose engine to ensure no open connections when dropping DB at session teardown
        try:
            db.engine.dispose()
        except Exception:
            pass
