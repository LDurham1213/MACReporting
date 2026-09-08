from flask import Blueprint, jsonify, request
from sqlalchemy import select

from db import SYSTEM_EMAIL, get_db_session
from models import ReportTemplate, ReportTemplateVersion, User

templates_bp = Blueprint("templates", __name__)

@templates_bp.route("/report-templates", methods=["GET"])
def get_report_templates():
    session = get_db_session()
    try:
        templates = session.execute(
            select(
                ReportTemplate.report_template_id.label("id"),
                ReportTemplate.name,
                ReportTemplate.description,
                ReportTemplate.active
            )
            .where(ReportTemplate.active.is_(True))
            .order_by(ReportTemplate.report_template_id)
        ).mappings().all()
        return jsonify([dict(template) for template in templates])
    finally:
        session.close()

@templates_bp.route("/report-templates", methods=["POST"])
def create_report_template():
    data = request.get_json(silent=True) or {}
    session = get_db_session()
    try:
        system_user = session.execute(select(User).where(User.email == SYSTEM_EMAIL)).scalar_one_or_none()
        if not system_user:
            return jsonify({"error": "System seed user not found"}), 500

        template = ReportTemplate(name=data["name"], description=data.get("description"))
        session.add(template)
        session.flush()

        session.add(ReportTemplateVersion(
            report_template_id=template.report_template_id,
            version=1,
            create_by=system_user.user_id,
            active=True
        ))
        session.commit()

        return jsonify({
            "id": template.report_template_id,
            "name": template.name,
            "description": template.description,
            "active": template.active
        }), 201
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

@templates_bp.route("/report-templates/<int:template_id>", methods=["PUT"])
def update_report_template(template_id):
    data = request.get_json(silent=True) or {}
    session = get_db_session()
    try:
        template = session.get(ReportTemplate, template_id)
        if not template:
            return jsonify({"error": "Report template not found"}), 404

        template.name = data["name"]
        template.description = data.get("description")
        session.commit()

        return jsonify({
            "id": template.report_template_id,
            "name": template.name,
            "description": template.description,
            "active": template.active
        })
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

@templates_bp.route("/report-templates/<int:template_id>", methods=["DELETE"])
def delete_report_template(template_id):
    session = get_db_session()
    try:
        template = session.get(ReportTemplate, template_id)
        if not template:
            return jsonify({"error": "Report template not found"}), 404

        template.active = False
        versions = session.execute(
            select(ReportTemplateVersion).where(ReportTemplateVersion.report_template_id == template_id)
        ).scalars().all()
        for version in versions:
            version.active = False

        session.commit()
        return jsonify({"message": f"Report template {template_id} deactivated"})
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()