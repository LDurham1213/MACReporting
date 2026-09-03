from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from psycopg.rows import dict_row
from psycopg.errors import ForeignKeyViolation, CheckViolation
from typing import Any, cast
import os
import re
import psycopg

app = Flask(__name__)
CORS(app)

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


def get_latest_template_version(connection, template_id):
    row = connection.execute(
        """
        SELECT version
        FROM report_template_versions
        WHERE report_template_id = %s
        ORDER BY version DESC
        LIMIT 1
        """,
        (template_id,)
    ).fetchone()

    return row["version"] if row else None


def generate_question_code(connection, question_text):
    base = re.sub(
        r"[^A-Z0-9]+",
        "_",
        question_text.upper()
    ).strip("_") or "QUESTION"

    code = base
    counter = 2

    while connection.execute(
        "SELECT 1 FROM questions WHERE question_code = %s",
        (code,)
    ).fetchone():
        code = f"{base}_{counter}"
        counter += 1

    return code


def create_next_template_version(
    connection,
    template_id,
    created_by,
    replace_question=None,
    exclude_question=None
):
    current_version = get_latest_template_version(
        connection,
        template_id
    )

    new_version = (
        1
        if current_version is None
        else current_version + 1
    )

    connection.execute(
        """
        UPDATE report_template_versions
        SET active = FALSE
        WHERE report_template_id = %s
        """,
        (template_id,)
    )

    connection.execute(
        """
        INSERT INTO report_template_versions (
            report_template_id,
            version,
            created_by,
            active
        )
        VALUES (%s, %s, %s, TRUE)
        """,
        (
            template_id,
            new_version,
            created_by
        )
    )

    if current_version is None:
        return new_version

    if replace_question:
        question_id = replace_question["question_id"]
        question_version = replace_question["question_version"]
        section_name = replace_question["section_name"]
        display_order = replace_question["display_order"]
        required = replace_question["required"]

        connection.execute(
            """
            INSERT INTO report_questions (
                report_template_id,
                report_version,
                question_id,
                question_version,
                section_name,
                display_order,
                required,
                created_by,
                active
            )
            SELECT
                report_template_id,
                %s,
                question_id,
                CASE
                    WHEN question_id = %s
                    THEN %s
                    ELSE question_version
                END,
                CASE
                    WHEN question_id = %s
                    THEN %s
                    ELSE section_name
                END,
                CASE
                    WHEN question_id = %s
                    THEN %s
                    ELSE display_order
                END,
                CASE
                    WHEN question_id = %s
                    THEN %s
                    ELSE required
                END,
                %s,
                active
            FROM report_questions
            WHERE report_template_id = %s
              AND report_version = %s
            """,
            (
                new_version,
                question_id,
                question_version,
                question_id,
                section_name,
                question_id,
                display_order,
                question_id,
                required,
                created_by,
                template_id,
                current_version
            )
        )

        return new_version

    if exclude_question:
        connection.execute(
            """
            INSERT INTO report_questions (
                report_template_id,
                report_version,
                question_id,
                question_version,
                section_name,
                display_order,
                required,
                created_by,
                active
            )
            SELECT
                report_template_id,
                %s,
                question_id,
                question_version,
                section_name,
                display_order,
                required,
                %s,
                active
            FROM report_questions
            WHERE report_template_id = %s
              AND report_version = %s
              AND question_id <> %s
            """,
            (
                new_version,
                created_by,
                template_id,
                current_version,
                exclude_question
            )
        )

        return new_version

    connection.execute(
        """
        INSERT INTO report_questions (
            report_template_id,
            report_version,
            question_id,
            question_version,
            section_name,
            display_order,
            required,
            created_by,
            active
        )
        SELECT
            report_template_id,
            %s,
            question_id,
            question_version,
            section_name,
            display_order,
            required,
            %s,
            active
        FROM report_questions
        WHERE report_template_id = %s
          AND report_version = %s
        """,
        (
            new_version,
            created_by,
            template_id,
            current_version
        )
    )

    return new_version


@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# REPORT TEMPLATES
# =========================================================

@app.route("/report-templates", methods=["GET"])
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


@app.route("/report-templates", methods=["POST"])
def create_report_template():
    data = request.get_json()

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


@app.route(
    "/report-templates/<int:template_id>",
    methods=["PUT"]
)
def update_report_template(template_id):
    data = request.get_json()

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


@app.route(
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


# =========================================================
# QUESTIONS
# =========================================================

@app.route("/questions", methods=["GET"])
def get_questions():
    with get_db_connection() as connection:
        questions = connection.execute(
            """
            SELECT
                q.question_id AS id,
                q.question_code,
                qv.version,
                qv.question_text,
                qv.question_type,
                rq.report_template_id,
                rq.section_name,
                rq.required,
                rq.display_order
            FROM questions q

            JOIN LATERAL (
                SELECT
                    version,
                    question_text,
                    question_type
                FROM question_versions
                WHERE question_id = q.question_id
                ORDER BY version DESC
                LIMIT 1
            ) qv ON TRUE

            LEFT JOIN LATERAL (
                SELECT
                    rq.report_template_id,
                    rq.section_name,
                    rq.required,
                    rq.display_order
                FROM report_questions rq

                JOIN report_template_versions rtv
                  ON rtv.report_template_id =
                     rq.report_template_id
                 AND rtv.version =
                     rq.report_version

                WHERE rq.question_id =
                      q.question_id
                  AND rq.question_version =
                      qv.version
                  AND rq.active = TRUE
                  AND rtv.active = TRUE

                ORDER BY rq.report_template_id
                LIMIT 1
            ) rq ON TRUE

            WHERE q.active = TRUE
            ORDER BY q.question_id
            """
        ).fetchall()

    return jsonify(questions)


@app.route("/questions", methods=["POST"])
def create_question():
    data = request.get_json()
    template_id = data["report_template_id"]

    with get_db_connection() as connection:
        created_by = get_system_user_id(connection)

        question_code = (
            data.get("question_code")
            or generate_question_code(
                connection,
                data["question_text"]
            )
        )

        question = connection.execute(
            """
            INSERT INTO questions (
                question_code
            )
            VALUES (%s)
            RETURNING question_id
            """,
            (question_code,)
        ).fetchone()

        if not question:
            return jsonify({
                "error": "Unable to create question"
            }), 500

        question_id = question["question_id"]

        connection.execute(
            """
            INSERT INTO question_versions (
                question_id,
                version,
                question_text,
                question_type,
                created_by,
                active
            )
            VALUES (
                %s,
                1,
                %s,
                %s,
                %s,
                TRUE
            )
            """,
            (
                question_id,
                data["question_text"],
                data["question_type"],
                created_by
            )
        )

        new_template_version = create_next_template_version(
            connection,
            template_id,
            created_by
        )

        connection.execute(
            """
            INSERT INTO report_questions (
                report_template_id,
                report_version,
                question_id,
                question_version,
                section_name,
                display_order,
                required,
                created_by,
                active
            )
            VALUES (
                %s,
                %s,
                %s,
                1,
                %s,
                %s,
                %s,
                %s,
                TRUE
            )
            """,
            (
                template_id,
                new_template_version,
                question_id,
                data.get("section_name"),
                data["display_order"],
                data.get("required", False),
                created_by
            )
        )

    return jsonify({
        "id": question_id,
        "question_code": question_code,
        "report_template_id": template_id,
        "section_name": data.get("section_name"),
        "question_text": data["question_text"],
        "question_type": data["question_type"],
        "required": data.get("required", False),
        "display_order": data["display_order"],
        "version": 1
    }), 201


@app.route(
    "/questions/<int:question_id>",
    methods=["PUT"]
)
def update_question(question_id):
    data = request.get_json()
    template_id = data["report_template_id"]

    with get_db_connection() as connection:
        created_by = get_system_user_id(connection)

        question = connection.execute(
            """
            SELECT question_id
            FROM questions
            WHERE question_id = %s
              AND active = TRUE
            """,
            (question_id,)
        ).fetchone()

        if not question:
            return jsonify({
                "error": "Question not found"
            }), 404

        version_row = connection.execute(
            """
            SELECT MAX(version) AS version
            FROM question_versions
            WHERE question_id = %s
            """,
            (question_id,)
        ).fetchone()

        if not version_row:
            return jsonify({
                "error": "Question version not found"
            }), 404

        current_version = version_row.get("version")

        if current_version is None:
            return jsonify({
                "error": "Question version not found"
            }), 404

        new_question_version = current_version + 1

        connection.execute(
            """
            UPDATE question_versions
            SET active = FALSE
            WHERE question_id = %s
            """,
            (question_id,)
        )

        connection.execute(
            """
            INSERT INTO question_versions (
                question_id,
                version,
                question_text,
                question_type,
                created_by,
                active
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                TRUE
            )
            """,
            (
                question_id,
                new_question_version,
                data["question_text"],
                data["question_type"],
                created_by
            )
        )

        new_template_version = create_next_template_version(
            connection,
            template_id,
            created_by,
            replace_question={
                "question_id": question_id,
                "question_version": new_question_version,
                "section_name": data.get("section_name"),
                "display_order": data["display_order"],
                "required": data.get("required", False)
            }
        )

        exists = connection.execute(
            """
            SELECT 1
            FROM report_questions
            WHERE report_template_id = %s
              AND report_version = %s
              AND question_id = %s
            """,
            (
                template_id,
                new_template_version,
                question_id
            )
        ).fetchone()

        if not exists:
            connection.execute(
                """
                INSERT INTO report_questions (
                    report_template_id,
                    report_version,
                    question_id,
                    question_version,
                    section_name,
                    display_order,
                    required,
                    created_by,
                    active
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    TRUE
                )
                """,
                (
                    template_id,
                    new_template_version,
                    question_id,
                    new_question_version,
                    data.get("section_name"),
                    data["display_order"],
                    data.get("required", False),
                    created_by
                )
            )

    return jsonify({
        "id": question_id,
        "report_template_id": template_id,
        "section_name": data.get("section_name"),
        "question_text": data["question_text"],
        "question_type": data["question_type"],
        "required": data.get("required", False),
        "display_order": data["display_order"],
        "version": new_question_version
    })


@app.route(
    "/questions/<int:question_id>",
    methods=["DELETE"]
)
def delete_question(question_id):
    with get_db_connection() as connection:
        created_by = get_system_user_id(connection)

        question = connection.execute(
            """
            SELECT question_id
            FROM questions
            WHERE question_id = %s
              AND active = TRUE
            """,
            (question_id,)
        ).fetchone()

        if not question:
            return jsonify({
                "error": "Question not found"
            }), 404

        templates = connection.execute(
            """
            SELECT DISTINCT
                rq.report_template_id
            FROM report_questions rq

            JOIN report_template_versions rtv
              ON rtv.report_template_id =
                 rq.report_template_id
             AND rtv.version =
                 rq.report_version

            WHERE rq.question_id = %s
              AND rq.active = TRUE
              AND rtv.active = TRUE
            """,
            (question_id,)
        ).fetchall()

        for template in templates:
            create_next_template_version(
                connection,
                template["report_template_id"],
                created_by,
                exclude_question=question_id
            )

        connection.execute(
            """
            UPDATE questions
            SET active = FALSE
            WHERE question_id = %s
            """,
            (question_id,)
        )

        connection.execute(
            """
            UPDATE question_versions
            SET active = FALSE
            WHERE question_id = %s
            """,
            (question_id,)
        )

    return jsonify({
        "message": f"Question {question_id} deactivated"
    })


# =========================================================
# TEMPLATE QUESTIONS
# =========================================================

@app.route(
    "/report-templates/<int:template_id>/questions",
    methods=["GET"]
)
def get_template_questions(template_id):
    with get_db_connection() as connection:
        version_row = connection.execute(
            """
            SELECT version
            FROM report_template_versions
            WHERE report_template_id = %s
              AND active = TRUE
            ORDER BY version DESC
            LIMIT 1
            """,
            (template_id,)
        ).fetchone()

        if not version_row:
            return jsonify([])

        version = version_row.get("version")

        if version is None:
            return jsonify([])

        questions = connection.execute(
            """
            SELECT
                q.question_id AS id,
                q.question_code,
                qv.version AS question_version,
                qv.question_text,
                qv.question_type,
                rq.report_template_id,
                rq.report_version,
                rq.section_name,
                rq.required,
                rq.display_order
            FROM report_questions rq

            JOIN questions q
              ON q.question_id =
                 rq.question_id

            JOIN question_versions qv
              ON qv.question_id =
                 rq.question_id
             AND qv.version =
                 rq.question_version

            WHERE rq.report_template_id = %s
              AND rq.report_version = %s
              AND rq.active = TRUE

            ORDER BY rq.display_order
            """,
            (
                template_id,
                version
            )
        ).fetchall()

    return jsonify(questions)


# =========================================================
# REPORTS
# =========================================================

@app.route("/reports", methods=["POST"])
def create_report():
    data = request.get_json()

    try:
        with get_db_connection() as connection:
            report = connection.execute(
                """
                INSERT INTO reports (
                    report_template_id,
                    report_template_version,
                    committee_id,
                    created_by_user_id,
                    report_title,
                    reporting_period,
                    event_date
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING *
                """,
                (
                    data["report_template_id"],
                    data["report_template_version"],
                    data["committee_id"],
                    data["created_by_user_id"],
                    data["report_title"],
                    data.get("reporting_period"),
                    data.get("event_date")
                )
            ).fetchone()

        return jsonify(report), 201

    except ForeignKeyViolation:
        return jsonify({
            "error": (
                "Invalid report reference. "
                "Check template, committee, or user IDs."
            )
        }), 400


@app.route(
    "/reports/<int:report_id>",
    methods=["GET"]
)
def get_report(report_id):
    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT *
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

    if not report:
        return jsonify({
            "error": "Report not found"
        }), 404

    return jsonify(report)


@app.route(
    "/reports/<int:report_id>",
    methods=["PUT"]
)
def update_report(report_id):
    data = request.get_json()

    with get_db_connection() as connection:
        existing = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not existing:
            return jsonify({
                "error": "Report not found"
            }), 404

        if existing["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        report = connection.execute(
            """
            UPDATE reports
            SET report_title = %s,
                reporting_period = %s,
                event_date = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE report_id = %s
            RETURNING *
            """,
            (
                data["report_title"],
                data.get("reporting_period"),
                data.get("event_date"),
                report_id
            )
        ).fetchone()

    return jsonify(report)


# =========================================================
# ANSWERS
# =========================================================

@app.route(
    "/reports/<int:report_id>/answers",
    methods=["POST"]
)
def save_answer(report_id):
    data = request.get_json()

    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404

        if report["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        answer = connection.execute(
            """
            INSERT INTO answers (
                report_id,
                question_id,
                question_version,
                answer_value,
                answered_by,
                notes
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )

            ON CONFLICT (
                report_id,
                question_id,
                question_version
            )

            DO UPDATE SET
                answer_value =
                    EXCLUDED.answer_value,
                answered_by =
                    EXCLUDED.answered_by,
                notes =
                    EXCLUDED.notes,
                answer_date =
                    CURRENT_TIMESTAMP

            RETURNING *
            """,
            (
                report_id,
                data["question_id"],
                data["question_version"],
                data.get("answer_value"),
                data["answered_by"],
                data.get("notes")
            )
        ).fetchone()

    return jsonify(answer), 200


@app.route(
    "/reports/<int:report_id>/answers",
    methods=["GET"]
)
def get_report_answers(report_id):
    with get_db_connection() as connection:
        answers = connection.execute(
            """
            SELECT
                a.answer_id,
                a.report_id,
                a.question_id,
                a.question_version,
                qv.question_text,
                a.answer_value,
                a.answer_date,
                a.answered_by,
                a.notes
            FROM answers a

            JOIN question_versions qv
              ON qv.question_id =
                 a.question_id
             AND qv.version =
                 a.question_version

            WHERE a.report_id = %s
            ORDER BY a.question_id
            """,
            (report_id,)
        ).fetchall()

    return jsonify(answers)


# =========================================================
# REPORT ACTION ITEMS
# =========================================================

@app.route(
    "/reports/<int:report_id>/action-items",
    methods=["POST"]
)
def create_action_item(report_id):
    data = request.get_json()

    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404

        if report["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        action_item = connection.execute(
            """
            INSERT INTO report_action_items (
                report_id,
                action_item,
                owner,
                due_date,
                status,
                notes,
                display_order
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING *
            """,
            (
                report_id,
                data["action_item"],
                data.get("owner"),
                data.get("due_date"),
                data.get("status"),
                data.get("notes"),
                data.get("display_order", 1)
            )
        ).fetchone()

    return jsonify(action_item), 201


@app.route(
    "/reports/<int:report_id>/action-items",
    methods=["GET"]
)
def get_action_items(report_id):
    with get_db_connection() as connection:
        action_items = connection.execute(
            """
            SELECT *
            FROM report_action_items
            WHERE report_id = %s
            ORDER BY
                display_order,
                action_item_id
            """,
            (report_id,)
        ).fetchall()

    return jsonify(action_items)


@app.route(
    "/reports/<int:report_id>/action-items/"
    "<int:action_item_id>",
    methods=["PUT"]
)
def update_action_item(
    report_id,
    action_item_id
):
    data = request.get_json()

    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404

        if report["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        action_item = connection.execute(
            """
            UPDATE report_action_items
            SET action_item = %s,
                owner = %s,
                due_date = %s,
                status = %s,
                notes = %s,
                display_order = %s,
                updated_at =
                    CURRENT_TIMESTAMP
            WHERE action_item_id = %s
              AND report_id = %s
            RETURNING *
            """,
            (
                data["action_item"],
                data.get("owner"),
                data.get("due_date"),
                data.get("status"),
                data.get("notes"),
                data.get("display_order", 1),
                action_item_id,
                report_id
            )
        ).fetchone()

    if not action_item:
        return jsonify({
            "error": "Action item not found"
        }), 404

    return jsonify(action_item)


# =========================================================
# REPORT DATES TO REMEMBER
# =========================================================

@app.route(
    "/reports/<int:report_id>/dates-to-remember",
    methods=["GET"]
)
def get_dates_to_remember(report_id):
    with get_db_connection() as connection:
        dates = connection.execute(
            """
            SELECT *
            FROM report_dates_to_remember
            WHERE report_id = %s
            ORDER BY
                display_order,
                report_date_id
            """,
            (report_id,)
        ).fetchall()

    return jsonify(dates)


@app.route(
    "/reports/<int:report_id>/dates-to-remember",
    methods=["POST"]
)
def create_date_to_remember(report_id):
    data = request.get_json()

    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404

        if report["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        report_date = connection.execute(
            """
            INSERT INTO report_dates_to_remember (
                report_id,
                reminder_date,
                item_deadline,
                owner,
                display_order
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING *
            """,
            (
                report_id,
                data.get("reminder_date"),
                data.get("item_deadline"),
                data.get("owner"),
                data.get("display_order", 1)
            )
        ).fetchone()

    return jsonify(report_date), 201


@app.route(
    "/reports/<int:report_id>/dates-to-remember/"
    "<int:report_date_id>",
    methods=["PUT"]
)
def update_date_to_remember(
    report_id,
    report_date_id
):
    data = request.get_json()

    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404

        if report["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        report_date = connection.execute(
            """
            UPDATE report_dates_to_remember
            SET reminder_date = %s,
                item_deadline = %s,
                owner = %s,
                display_order = %s,
                updated_at =
                    CURRENT_TIMESTAMP
            WHERE report_date_id = %s
              AND report_id = %s
            RETURNING *
            """,
            (
                data.get("reminder_date"),
                data.get("item_deadline"),
                data.get("owner"),
                data.get("display_order", 1),
                report_date_id,
                report_id
            )
        ).fetchone()

    if not report_date:
        return jsonify({
            "error": "Date to remember not found"
        }), 404

    return jsonify(report_date)


# =========================================================
# REPORT BUDGET ITEMS
# =========================================================

@app.route(
    "/reports/<int:report_id>/budget-items",
    methods=["POST"]
)
def create_budget_item(report_id):
    data = request.get_json()

    try:
        with get_db_connection() as connection:
            report = connection.execute(
                """
                SELECT locked
                FROM reports
                WHERE report_id = %s
                """,
                (report_id,)
            ).fetchone()

            if not report:
                return jsonify({
                    "error": "Report not found"
                }), 404

            if report["locked"]:
                return jsonify({
                    "error": (
                        "Locked reports "
                        "cannot be updated"
                    )
                }), 409

            budget_item = connection.execute(
                """
                INSERT INTO report_budget_items (
                    report_id,
                    category,
                    estimated_cost,
                    actual_cost,
                    notes,
                    display_order
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING *
                """,
                (
                    report_id,
                    data.get("category"),
                    data.get("estimated_cost"),
                    data.get("actual_cost"),
                    data.get("notes"),
                    data.get("display_order", 1)
                )
            ).fetchone()

        return jsonify(budget_item), 201

    except CheckViolation:
        return jsonify({
            "error": (
                "Budget amounts must be zero "
                "or greater, and display order "
                "must be greater than zero."
            )
        }), 400


@app.route(
    "/reports/<int:report_id>/budget-items",
    methods=["GET"]
)
def get_budget_items(report_id):
    with get_db_connection() as connection:
        budget_items = connection.execute(
            """
            SELECT *
            FROM report_budget_items
            WHERE report_id = %s
            ORDER BY
                display_order,
                budget_item_id
            """,
            (report_id,)
        ).fetchall()

    return jsonify(budget_items)


@app.route(
    "/reports/<int:report_id>/budget-items/"
    "<int:budget_item_id>",
    methods=["PUT"]
)
def update_budget_item(
    report_id,
    budget_item_id
):
    data = request.get_json()

    with get_db_connection() as connection:
        report = connection.execute(
            """
            SELECT locked
            FROM reports
            WHERE report_id = %s
            """,
            (report_id,)
        ).fetchone()

        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404

        if report["locked"]:
            return jsonify({
                "error": "Locked reports cannot be updated"
            }), 409

        budget_item = connection.execute(
            """
            UPDATE report_budget_items
            SET category = %s,
                estimated_cost = %s,
                actual_cost = %s,
                notes = %s,
                display_order = %s,
                updated_at =
                    CURRENT_TIMESTAMP
            WHERE budget_item_id = %s
              AND report_id = %s
            RETURNING *
            """,
            (
                data.get("category"),
                data.get("estimated_cost"),
                data.get("actual_cost"),
                data.get("notes"),
                data.get("display_order", 1),
                budget_item_id,
                report_id
            )
        ).fetchone()

    if not budget_item:
        return jsonify({
            "error": "Budget item not found"
        }), 404

    return jsonify(budget_item)


# =========================================================
# REPORT SECTION PROGRESS
# =========================================================

@app.route(
    "/reports/<int:report_id>/section-progress",
    methods=["GET"]
)
def get_report_section_progress(report_id):
    with get_db_connection() as connection:
        progress = connection.execute(
            """
            SELECT
                report_section_progress_id,
                report_id,
                section_name,
                completed,
                completed_at,
                completed_by_user_id
            FROM report_section_progress
            WHERE report_id = %s
            ORDER BY report_section_progress_id
            """,
            (report_id,)
        ).fetchall()

    return jsonify(progress), 200


@app.route(
    "/reports/<int:report_id>/section-progress",
    methods=["POST"]
)
def save_report_section_progress(report_id):
    data = request.get_json()

    section_name = data.get("section_name")
    completed = data.get("completed", True)
    completed_by_user_id = data.get(
        "completed_by_user_id"
    )

    if not section_name:
        return jsonify({
            "error": "section_name is required"
        }), 400

    if not completed_by_user_id:
        return jsonify({
            "error": (
                "completed_by_user_id "
                "is required"
            )
        }), 400

    with get_db_connection() as connection:
        progress = connection.execute(
            """
            INSERT INTO report_section_progress (
                report_id,
                section_name,
                completed,
                completed_at,
                completed_by_user_id
            )
            VALUES (
                %s,
                %s,
                %s,
                CASE
                    WHEN %s = TRUE
                    THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                %s
            )

            ON CONFLICT (
                report_id,
                section_name
            )

            DO UPDATE SET
                completed =
                    EXCLUDED.completed,
                completed_at =
                    CASE
                        WHEN EXCLUDED.completed = TRUE
                        THEN CURRENT_TIMESTAMP
                        ELSE NULL
                    END,
                completed_by_user_id =
                    EXCLUDED.completed_by_user_id

            RETURNING
                report_section_progress_id,
                report_id,
                section_name,
                completed,
                completed_at,
                completed_by_user_id
            """,
            (
                report_id,
                section_name,
                completed,
                completed,
                completed_by_user_id
            )
        ).fetchone()

    return jsonify(progress), 200


if __name__ == "__main__":
    app.run(debug=True)