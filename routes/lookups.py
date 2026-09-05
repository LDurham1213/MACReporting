from flask import Blueprint, jsonify

from db import get_db_connection


lookups_bp = Blueprint("lookups", __name__)


@lookups_bp.route("/users", methods=["GET"])
def get_users():
    with get_db_connection() as connection:
        users = connection.execute(
            """
            SELECT
                user_id,
                first_name,
                last_name,
                email
            FROM users
            WHERE active = TRUE
            ORDER BY last_name, first_name
            """
        ).fetchall()

    return jsonify(users)


@lookups_bp.route("/committees", methods=["GET"])
def get_committees():
    with get_db_connection() as connection:
        committees = connection.execute(
            """
            SELECT
                committee_id,
                committee_name
            FROM committees
            WHERE active = TRUE
            ORDER BY committee_name
            """
        ).fetchall()

    return jsonify(committees)