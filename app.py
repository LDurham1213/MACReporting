from flask import Flask, jsonify, request
import sqlite3
import json
from pathlib import Path

app = Flask(__name__)

DATABASE = "database/macreporting.db"


def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


# GET all report templates
@app.route("/report-templates", methods=["GET"])
def get_report_templates():
    connection = get_db_connection()

    templates = connection.execute(
        "SELECT * FROM report_templates"
    ).fetchall()

    connection.close()

    return jsonify([dict(template) for template in templates])


# POST - create a new report template
@app.route("/report-templates", methods=["POST"])
def create_report_template():
    data = request.get_json()

    connection = get_db_connection()

    cursor = connection.execute(
        """
        INSERT INTO report_templates (name, description)
        VALUES (?, ?)
        """,
        (data["name"], data["description"])
    )

    connection.commit()

    new_id = cursor.lastrowid
    connection.close()

    return jsonify({
        "id": new_id,
        "name": data["name"],
        "description": data["description"]
    }), 201


# GET all questions
@app.route("/questions", methods=["GET"])
def get_questions():
    connection = get_db_connection()

    questions = connection.execute(
        "SELECT * FROM questions"
    ).fetchall()

    connection.close()

    return jsonify([dict(question) for question in questions])

# POST - create a new question
@app.route("/questions", methods=["POST"])
def create_question():
    data = request.get_json()

    connection = get_db_connection()

    cursor = connection.execute(
        """
        INSERT INTO questions (
            report_template_id,
            section_name,
            question_text,
            question_type,
            required,
            display_order
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data["report_template_id"],
            data["section_name"],
            data["question_text"],
            data["question_type"],
            data["required"],
            data["display_order"]
        )
    )

    connection.commit()

    new_id = cursor.lastrowid
    connection.close()

    return jsonify({
        "id": new_id,
        "report_template_id": data["report_template_id"],
        "section_name": data["section_name"],
        "question_text": data["question_text"],
        "question_type": data["question_type"],
        "required": data["required"],
        "display_order": data["display_order"]
    }), 201


# PUT - update a report template
@app.route("/report-templates/<int:template_id>", methods=["PUT"])
def update_report_template(template_id):
    data = request.get_json()

    connection = get_db_connection()

    connection.execute(
        """
        UPDATE report_templates
        SET name = ?, description = ?
        WHERE id = ?
        """,
        (
            data["name"],
            data["description"],
            template_id
        )
    )

    connection.commit()
    connection.close()

    return jsonify({
        "id": template_id,
        "name": data["name"],
        "description": data["description"]
    })

# PUT - update a question
@app.route("/questions/<int:question_id>", methods=["PUT"])
def update_question(question_id):
    data = request.get_json()

    connection = get_db_connection()

    connection.execute(
        """
        UPDATE questions
        SET report_template_id = ?,
            section_name = ?,
            question_text = ?,
            question_type = ?,
            required = ?,
            display_order = ?
        WHERE id = ?
        """,
        (
            data["report_template_id"],
            data["section_name"],
            data["question_text"],
            data["question_type"],
            data["required"],
            data["display_order"],
            question_id
        )
    )

    connection.commit()
    connection.close()

    return jsonify({
        "id": question_id,
        "report_template_id": data["report_template_id"],
        "section_name": data["section_name"],
        "question_text": data["question_text"],
        "question_type": data["question_type"],
        "required": data["required"],
        "display_order": data["display_order"]
    })

# DELETE - remove a report template
@app.route("/report-templates/<int:template_id>", methods=["DELETE"])
def delete_report_template(template_id):
    connection = get_db_connection()

    connection.execute(
        "DELETE FROM report_templates WHERE id = ?",
        (template_id,)
    )

    connection.commit()
    connection.close()

    return jsonify({
        "message": f"Report template {template_id} deleted"
    })

# DELETE - remove a question
@app.route("/questions/<int:question_id>", methods=["DELETE"])
def delete_question(question_id):
    connection = get_db_connection()

    connection.execute(
        "DELETE FROM questions WHERE id = ?",
        (question_id,)
    )

    connection.commit()
    connection.close()

    return jsonify({
        "message": f"Question {question_id} deleted"
    })

# GET - all questions for a specific report template
@app.route("/report-templates/<int:template_id>/questions", methods=["GET"])
def get_template_questions(template_id):
    connection = get_db_connection()

    questions = connection.execute(
        """
        SELECT *
        FROM questions
        WHERE report_template_id = ?
        ORDER BY display_order
        """,
        (template_id,)
    ).fetchall()

    connection.close()

    return jsonify([dict(question) for question in questions])

# GET - export all report templates and questions to JSON
@app.route("/export", methods=["GET"])
def export_data():
    connection = get_db_connection()

    report_templates = connection.execute(
        "SELECT * FROM report_templates"
    ).fetchall()

    questions = connection.execute(
        "SELECT * FROM questions"
    ).fetchall()

    connection.close()

    export_data = {
        "report_templates": [dict(template) for template in report_templates],
        "questions": [dict(question) for question in questions]
    }

    export_path = Path("database/macreporting_export.json")

    with open(export_path, "w") as file:
        json.dump(export_data, file, indent=4)

    return jsonify({
        "message": "Data exported successfully",
        "file": str(export_path)
    })

# POST - import report templates and questions from JSON
@app.route("/import", methods=["POST"])
def import_data():
    import_path = Path("database/macreporting_export.json")

    with open(import_path, "r") as file:
        data = json.load(file)

    connection = get_db_connection()

    for template in data["report_templates"]:
        connection.execute(
            """
            INSERT OR REPLACE INTO report_templates
            (id, name, description)
            VALUES (?, ?, ?)
            """,
            (
                template["id"],
                template["name"],
                template["description"]
            )
        )

    for question in data["questions"]:
        connection.execute(
            """
            INSERT OR REPLACE INTO questions
            (
                id,
                report_template_id,
                section_name,
                question_text,
                question_type,
                required,
                display_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                question["id"],
                question["report_template_id"],
                question["section_name"],
                question["question_text"],
                question["question_type"],
                question["required"],
                question["display_order"]
            )
        )

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Data imported successfully"
    })

if __name__ == "__main__":
    app.run(debug=True)