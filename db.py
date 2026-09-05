from dotenv import load_dotenv
from psycopg.rows import dict_row
from typing import Any, cast
import os
import psycopg

load_dotenv()

SYSTEM_EMAIL = "seed@macreporting.local"


def get_db_connection() -> psycopg.Connection[dict[str, Any]]:
    connection = psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "macreporting"),
        user=os.getenv("DB_USER", "macreporting_app"),
        password=os.getenv("DB_PASSWORD"),
        row_factory=dict_row  # pyright: ignore[reportArgumentType]
    )

    return cast(
        psycopg.Connection[dict[str, Any]],
        connection
    )


def get_system_user_id(connection):
    row = connection.execute(
        "SELECT user_id FROM users WHERE email = %s",
        (SYSTEM_EMAIL,)
    ).fetchone()

    if not row:
        raise RuntimeError("System seed user not found.")

    return row["user_id"]