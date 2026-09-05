import re

from flask import Blueprint, jsonify, request

from db import get_db_connection, get_system_user_id


questions_bp = Blueprint("questions", __name__)


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
            create_by,
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
                disp_ord,
                required,
                create_by,
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
                    ELSE disp_ord
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
                disp_ord,
                required,
                create_by,
                active
            )
            SELECT
                report_template_id,
                %s,
                question_id,
                question_version,
                section_name,
                disp_ord,
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
            disp_ord,
            required,
            create_by,
            active
        )
        SELECT
            report_template_id,
            %s,
            question_id,
            question_version,
            section_name,
            disp_ord,
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


# =========================================================
# QUESTIONS
# =========================================================

@questions_bp.route("/questions", methods=["GET"])
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
                rq.disp_ord AS display_order
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
                    rq.disp_ord
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


@questions_bp.route("/questions", methods=["POST"])
def create_question():
    data = request.get_json(silent=True) or {}
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
                create_by,
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
                disp_ord,
                required,
                create_by,
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


@questions_bp.route(
    "/questions/<int:question_id>",
    methods=["PUT"]
)
def update_question(question_id):
    data = request.get_json(silent=True) or {}
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
                create_by,
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
                    disp_ord,
                    required,
                    create_by,
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


@questions_bp.route(
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

@questions_bp.route(
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
                rq.disp_ord AS display_order
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

            ORDER BY rq.disp_ord
            """,
            (
                template_id,
                version
            )
        ).fetchall()

    return jsonify(questions)
