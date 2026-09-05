from flask import Blueprint, jsonify, request

from db import get_db_connection, get_system_user_id


templates_bp = Blueprint("templates", __name__)


@templates_bp.route("/report-templates", methods=["GET"])
def get_report_templates():
    with get_db_connection() as connection:
        templates = connection.execute(
            """
            SELECT
                report_template_id AS id,
                name,
                description,
                active
            FROM report_templates
            WHERE active = TRUE
            ORDER BY report_template_id
            """
        ).fetchall()

    return jsonify(templates)


@templates_bp.route("/report-templates", methods=["POST"])
def create_report_template():
    data = request.get_json(silent=True) or {}

    with get_db_connection() as connection:
        created_by = get_system_user_id(connection)

        template = connection.execute(
            """
            INSERT INTO report_templates (
                name,
                description
            )
            VALUES (%s, %s)
            RETURNING
                report_template_id AS id,
                name,
                description,
                active
            """,
            (
                data["name"],
                data.get("description")
            )
        ).fetchone()

        if not template:
            return jsonify({
                "error": "Unable to create report template"
            }), 500

        connection.execute(
            """
            INSERT INTO report_template_versions (
                report_template_id,
                version,
                created_by,
                active
            )
            VALUES (%s, 1, %s, TRUE)
            """,
            (
                template["id"],
                created_by
            )
        )

    return jsonify(template), 201


@templates_bp.route(
    "/report-templates/<int:template_id>",
    methods=["PUT"]
)
def update_report_template(template_id):
    data = request.get_json(silent=True) or {}

    with get_db_connection() as connection:
        template = connection.execute(
            """
            UPDATE report_templates
            SET name = %s,
                description = %s
            WHERE report_template_id = %s
            RETURNING
                report_template_id AS id,
                name,
                description,
                active
            """,
            (
                data["name"],
                data.get("description"),
                template_id
            )
        ).fetchone()

    if not template:
        return jsonify({
            "error": "Report template not found"
        }), 404

    return jsonify(template)


@templates_bp.route(
    "/report-templates/<int:template_id>",
    methods=["DELETE"]
)
def delete_report_template(template_id):
    with get_db_connection() as connection:
        template = connection.execute(
            """
            UPDATE report_templates
            SET active = FALSE
            WHERE report_template_id = %s
            RETURNING report_template_id
            """,
            (template_id,)
        ).fetchone()

        if template:
            connection.execute(
                """
                UPDATE report_template_versions
                SET active = FALSE
                WHERE report_template_id = %s
                """,
                (template_id,)
            )

    if not template:
        return jsonify({
            "error": "Report template not found"
        }), 404

    return jsonify({
        "message": f"Report template {template_id} deactivated"
    })