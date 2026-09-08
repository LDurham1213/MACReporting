import os
from typing import Any, cast

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

SYSTEM_EMAIL = "seed@macreporting.local"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///macreporting.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


# Temporary PostgreSQL connection used by existing routes during migration.
def get_db_connection() -> psycopg.Connection[dict[str, Any]]:
    connection = psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "macreporting"),
        user=os.getenv("DB_USER", "macreporting_app"),
        password=os.getenv("DB_PASSWORD"),
        row_factory=dict_row
    )
    return cast(psycopg.Connection[dict[str, Any]], connection)


# New database-independent SQLAlchemy session.
def get_db_session():
    return SessionLocal()


def get_system_user_id(connection):
    row = connection.execute(
        "SELECT user_id FROM users WHERE email = %s",
        (SYSTEM_EMAIL,)
    ).fetchone()

    if not row:
        raise RuntimeError("System seed user not found.")

    return row["user_id"]