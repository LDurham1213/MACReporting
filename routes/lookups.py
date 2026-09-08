from flask import Blueprint, jsonify
from sqlalchemy import select

from db import get_db_session
from models import Committee, User

lookups_bp = Blueprint("lookups", __name__)

@lookups_bp.route("/users", methods=["GET"])
def get_users():
    session = get_db_session()
    try:
        users = session.execute(
            select(User.user_id, User.f_name.label("first_name"), User.l_name.label("last_name"), User.email)
            .where(User.active.is_(True))
            .order_by(User.l_name, User.f_name)
        ).mappings().all()
        return jsonify([dict(user) for user in users])
    finally:
        session.close()

@lookups_bp.route("/committees", methods=["GET"])
def get_committees():
    session = get_db_session()
    try:
        committees = session.execute(
            select(Committee.committee_id, Committee.committee_name, Committee.comm_abbr)
            .where(Committee.active.is_(True))
            .order_by(Committee.committee_name)
        ).mappings().all()
        return jsonify([dict(committee) for committee in committees])
    finally:
        session.close()