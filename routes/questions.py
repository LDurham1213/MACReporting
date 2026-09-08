import re

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select

from db import SYSTEM_EMAIL, get_db_session
from models import Question, QuestionVersion, ReportQuestion, ReportTemplateVersion, User

questions_bp = Blueprint("questions", __name__)

def get_system_user_id(session):
    user_id = session.execute(select(User.user_id).where(User.email == SYSTEM_EMAIL)).scalar_one_or_none()
    if user_id is None:
        raise RuntimeError("System seed user not found.")
    return user_id

def get_latest_template_version(session, template_id):
    return session.execute(
        select(func.max(ReportTemplateVersion.version))
        .where(ReportTemplateVersion.report_template_id == template_id)
    ).scalar_one_or_none()

def generate_question_code(session, question_text):
    base = re.sub(r"[^A-Z0-9]+", "_", question_text.upper()).strip("_") or "QUESTION"
    code = base
    counter = 2
    while session.execute(select(Question.question_id).where(Question.question_code == code)).first():
        code = f"{base}_{counter}"
        counter += 1
    return code

def create_next_template_version(session, template_id, created_by, replace_question=None, exclude_question=None):
    current_version = get_latest_template_version(session, template_id)
    new_version = 1 if current_version is None else current_version + 1

    versions = session.execute(
        select(ReportTemplateVersion).where(ReportTemplateVersion.report_template_id == template_id)
    ).scalars().all()
    for version in versions:
        version.active = False

    session.add(ReportTemplateVersion(
        report_template_id=template_id,
        version=new_version,
        create_by=created_by,
        active=True
    ))

    if current_version is None:
        return new_version

    current_questions = session.execute(
        select(ReportQuestion).where(
            ReportQuestion.report_template_id == template_id,
            ReportQuestion.report_version == current_version
        )
    ).scalars().all()

    for current in current_questions:
        if exclude_question == current.question_id:
            continue

        question_version = current.question_version
        section_name = current.section_name
        display_order = current.disp_ord
        required = current.required

        if replace_question and current.question_id == replace_question["question_id"]:
            question_version = replace_question["question_version"]
            section_name = replace_question["section_name"]
            display_order = replace_question["display_order"]
            required = replace_question["required"]

        session.add(ReportQuestion(
            report_template_id=template_id,
            report_version=new_version,
            question_id=current.question_id,
            question_version=question_version,
            section_name=section_name,
            disp_ord=display_order,
            required=required,
            create_by=created_by,
            active=current.active
        ))

    return new_version

# =========================================================
# QUESTIONS
# =========================================================

@questions_bp.route("/questions", methods=["GET"])
def get_questions():
    session = get_db_session()
    try:
        questions = session.execute(
            select(Question)
            .where(Question.active.is_(True))
            .order_by(Question.question_id)
        ).scalars().all()

        results = []
        for question in questions:
            version = session.execute(
                select(QuestionVersion)
                .where(QuestionVersion.question_id == question.question_id)
                .order_by(QuestionVersion.version.desc())
                .limit(1)
            ).scalar_one_or_none()

            if not version:
                continue

            report_question = session.execute(
                select(ReportQuestion)
                .join(
                    ReportTemplateVersion,
                    (ReportTemplateVersion.report_template_id == ReportQuestion.report_template_id)
                    & (ReportTemplateVersion.version == ReportQuestion.report_version)
                )
                .where(
                    ReportQuestion.question_id == question.question_id,
                    ReportQuestion.question_version == version.version,
                    ReportQuestion.active.is_(True),
                    ReportTemplateVersion.active.is_(True)
                )
                .order_by(ReportQuestion.report_template_id)
                .limit(1)
            ).scalar_one_or_none()

            results.append({
                "id": question.question_id,
                "question_code": question.question_code,
                "version": version.version,
                "question_text": version.question_text,
                "question_type": version.question_type,
                "report_template_id": report_question.report_template_id if report_question else None,
                "section_name": report_question.section_name if report_question else None,
                "required": report_question.required if report_question else None,
                "display_order": report_question.disp_ord if report_question else None
            })

        return jsonify(results)
    finally:
        session.close()

@questions_bp.route("/questions", methods=["POST"])
def create_question():
    data = request.get_json(silent=True) or {}
    template_id = data["report_template_id"]
    session = get_db_session()
    try:
        created_by = get_system_user_id(session)
        question_code = data.get("question_code") or generate_question_code(session, data["question_text"])

        question = Question(question_code=question_code)
        session.add(question)
        session.flush()

        question_id = question.question_id
        session.add(QuestionVersion(
            question_id=question_id,
            version=1,
            question_text=data["question_text"],
            question_type=data["question_type"],
            create_by=created_by,
            active=True
        ))

        new_template_version = create_next_template_version(session, template_id, created_by)

        session.add(ReportQuestion(
            report_template_id=template_id,
            report_version=new_template_version,
            question_id=question_id,
            question_version=1,
            section_name=data.get("section_name"),
            disp_ord=data["display_order"],
            required=data.get("required", False),
            create_by=created_by,
            active=True
        ))

        session.commit()

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
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

@questions_bp.route("/questions/<int:question_id>", methods=["PUT"])
def update_question(question_id):
    data = request.get_json(silent=True) or {}
    template_id = data["report_template_id"]
    session = get_db_session()
    try:
        created_by = get_system_user_id(session)
        question = session.execute(
            select(Question).where(Question.question_id == question_id, Question.active.is_(True))
        ).scalar_one_or_none()

        if not question:
            return jsonify({"error": "Question not found"}), 404

        current_version = session.execute(
            select(func.max(QuestionVersion.version)).where(QuestionVersion.question_id == question_id)
        ).scalar_one_or_none()

        if current_version is None:
            return jsonify({"error": "Question version not found"}), 404

        new_question_version = current_version + 1

        versions = session.execute(
            select(QuestionVersion).where(QuestionVersion.question_id == question_id)
        ).scalars().all()
        for version in versions:
            version.active = False

        session.add(QuestionVersion(
            question_id=question_id,
            version=new_question_version,
            question_text=data["question_text"],
            question_type=data["question_type"],
            create_by=created_by,
            active=True
        ))

        new_template_version = create_next_template_version(
            session,
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

        exists = session.execute(
            select(ReportQuestion).where(
                ReportQuestion.report_template_id == template_id,
                ReportQuestion.report_version == new_template_version,
                ReportQuestion.question_id == question_id
            )
        ).scalar_one_or_none()

        if not exists:
            session.add(ReportQuestion(
                report_template_id=template_id,
                report_version=new_template_version,
                question_id=question_id,
                question_version=new_question_version,
                section_name=data.get("section_name"),
                disp_ord=data["display_order"],
                required=data.get("required", False),
                create_by=created_by,
                active=True
            ))

        session.commit()

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
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

@questions_bp.route("/questions/<int:question_id>", methods=["DELETE"])
def delete_question(question_id):
    session = get_db_session()
    try:
        created_by = get_system_user_id(session)
        question = session.execute(
            select(Question).where(Question.question_id == question_id, Question.active.is_(True))
        ).scalar_one_or_none()

        if not question:
            return jsonify({"error": "Question not found"}), 404

        template_ids = session.execute(
            select(ReportQuestion.report_template_id)
            .join(
                ReportTemplateVersion,
                (ReportTemplateVersion.report_template_id == ReportQuestion.report_template_id)
                & (ReportTemplateVersion.version == ReportQuestion.report_version)
            )
            .where(
                ReportQuestion.question_id == question_id,
                ReportQuestion.active.is_(True),
                ReportTemplateVersion.active.is_(True)
            )
            .distinct()
        ).scalars().all()

        for template_id in template_ids:
            create_next_template_version(session, template_id, created_by, exclude_question=question_id)

        question.active = False
        versions = session.execute(
            select(QuestionVersion).where(QuestionVersion.question_id == question_id)
        ).scalars().all()
        for version in versions:
            version.active = False

        session.commit()
        return jsonify({"message": f"Question {question_id} deactivated"})
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# =========================================================
# TEMPLATE QUESTIONS
# =========================================================

@questions_bp.route("/report-templates/<int:template_id>/questions", methods=["GET"])
def get_template_questions(template_id):
    session = get_db_session()
    try:
        version = session.execute(
            select(ReportTemplateVersion.version)
            .where(
                ReportTemplateVersion.report_template_id == template_id,
                ReportTemplateVersion.active.is_(True)
            )
            .order_by(ReportTemplateVersion.version.desc())
            .limit(1)
        ).scalar_one_or_none()

        if version is None:
            return jsonify([])

        rows = session.execute(
            select(
                Question.question_id.label("id"),
                Question.question_code,
                QuestionVersion.version.label("question_version"),
                QuestionVersion.question_text,
                QuestionVersion.question_type,
                ReportQuestion.report_template_id,
                ReportQuestion.report_version,
                ReportQuestion.section_name,
                ReportQuestion.required,
                ReportQuestion.disp_ord.label("display_order")
            )
            .join(Question, Question.question_id == ReportQuestion.question_id)
            .join(
                QuestionVersion,
                (QuestionVersion.question_id == ReportQuestion.question_id)
                & (QuestionVersion.version == ReportQuestion.question_version)
            )
            .where(
                ReportQuestion.report_template_id == template_id,
                ReportQuestion.report_version == version,
                ReportQuestion.active.is_(True)
            )
            .order_by(ReportQuestion.disp_ord)
        ).mappings().all()

        return jsonify([dict(row) for row in rows])
    finally:
        session.close()