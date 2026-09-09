from datetime import date, datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from db import get_db_session
from models import (
    Answer, Committee, QuestionVersion, Report, ReportActionItem,
    ReportBudgetItem, ReportDateToRemember, ReportQuestion,
    ReportSectionProgress, ReportStatusHistory, ReportTemplate,
    User, UserRole
)
from pdf_services.pdf_service import generate_report_pdf

reports_bp = Blueprint("reports", __name__)
EDITABLE_STATUSES = ("draft", "returned_for_changes")
PDF_AUTHORIZED_ROLES = ("president", "technology_chair", "technology_admin")

def parse_date(value):
    if not value:
        return None
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return value

DB_TO_API_KEYS = {
    "rept_temp_id": "report_template_id",
    "rept_temp_vsn": "report_template_version",
    "create_by_uid": "created_by_user_id",
    "event_dt": "event_date",
    "create_dt": "created_at",
    "upd_dt": "updated_at",
    "pdf_create_by_uid": "pdf_created_by_user_id",
    "pdf_create_dt": "pdf_created_at",
    "rept_stat_hist_id": "report_status_history_id",
    "chgd_by_uid": "changed_by_user_id",
    "chgd_at": "changed_at",
    "answer_dt": "answer_date",
    "orig_filenm": "original_filename",
    "inc_in_pdf": "include_in_pdf",
    "upload_dt": "uploaded_at",
    "due_dt": "due_date",
    "disp_ord": "display_order",
}

def model_row(instance):
    if instance is None:
        return None
    return {column.name: getattr(instance, column.name) for column in instance.__table__.columns}

def api_row(row):
    if row is None:
        return None
    row = model_row(row) if hasattr(row, "__table__") else dict(row)
    return {DB_TO_API_KEYS.get(key, key): value for key, value in row.items()}

def api_rows(rows):
    return [api_row(row) for row in rows]

def get_edit_error(session, report_id):
    report = session.get(Report, report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    if report.locked or report.status not in EDITABLE_STATUSES:
        return jsonify({"error": "Only Draft or Returned for Changes reports can be updated"}), 409
    return None

# =========================================================
# REPORTS
# =========================================================
@reports_bp.route("/reports", methods=["GET"])
def get_reports():
    report_template_id = request.args.get("report_template_id", type=int)
    with get_db_session() as session:
        statement = (
            select(
                Report.report_id, Report.report_title,
                Report.rept_temp_id.label("report_template_id"),
                Report.rept_temp_vsn.label("report_template_version"),
                Report.committee_id, Committee.committee_name,
                Report.create_by_uid.label("created_by_user_id"),
                User.f_name.label("first_name"), User.l_name.label("last_name"),
                Report.reporting_period, Report.event_dt.label("event_date"),
                Report.status, Report.locked,
                Report.create_dt.label("created_at"), Report.upd_dt.label("updated_at")
            )
            .join(Committee, Committee.committee_id == Report.committee_id)
            .join(User, User.user_id == Report.create_by_uid)
        )
        if report_template_id is not None:
            statement = statement.where(Report.rept_temp_id == report_template_id)
        reports = session.execute(
            statement.order_by(Report.upd_dt.desc(), Report.report_id.desc())
        ).mappings().all()
        return jsonify([dict(report) for report in reports]), 200

@reports_bp.route("/reports", methods=["POST"])
def create_report():
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        try:
            report = Report(
                rept_temp_id=data["report_template_id"],
                rept_temp_vsn=data["report_template_version"],
                committee_id=data["committee_id"],
                create_by_uid=data["created_by_user_id"],
                report_title=data["report_title"],
                reporting_period=parse_date(data.get("reporting_period")),
                event_dt=parse_date(data.get("event_date"))
            )
            session.add(report)
            session.commit()
            session.refresh(report)
            return jsonify(api_row(report)), 201
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Invalid report reference. Check template, committee, or user IDs."}), 400

@reports_bp.route("/reports/<int:report_id>", methods=["GET"])
def get_report(report_id):
    with get_db_session() as session:
        report = session.get(Report, report_id)
        if not report:
            return jsonify({"error": "Report not found"}), 404
        return jsonify(api_row(report))

@reports_bp.route("/reports/<int:report_id>", methods=["PUT"])
def update_report(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        report = session.get(Report, report_id)
        report.report_title = data.get("report_title", report.report_title)
        report.reporting_period = parse_date(data["reporting_period"]) if "reporting_period" in data else report.reporting_period
        report.event_dt = parse_date(data["event_date"]) if "event_date" in data else report.event_dt
        report.committee_id = data.get("committee_id", report.committee_id)
        report.create_by_uid = data.get("created_by_user_id", report.create_by_uid)
        report.upd_dt = datetime.now(timezone.utc)
        session.commit()
        session.refresh(report)
        return jsonify(api_row(report))

# =========================================================
# REPORT SUBMISSION
# =========================================================
@reports_bp.route("/reports/<int:report_id>/submit", methods=["POST"])
def submit_report(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        report = session.scalar(select(Report).where(Report.report_id == report_id).with_for_update())
        if not report:
            return jsonify({"error": "Report not found"}), 404
        if report.locked:
            return jsonify({"error": "Locked reports cannot be submitted"}), 409
        if report.status not in EDITABLE_STATUSES:
            return jsonify({"error": "Only Draft or Returned for Changes reports can be submitted"}), 409
        changed_by_user_id = data.get("changed_by_user_id", report.create_by_uid)
        previous_status = report.status
        report.status = "submitted"
        report.upd_dt = datetime.now(timezone.utc)
        session.add(ReportStatusHistory(
            report_id=report_id, from_status=previous_status, to_status="submitted",
            chgd_by_uid=changed_by_user_id, comments=data.get("comments")
        ))
        session.commit()
        session.refresh(report)
        return jsonify(api_row(report)), 200

# =========================================================
# APPROVAL QUEUE
# =========================================================
@reports_bp.route("/approvals", methods=["GET"])
def get_approvals():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    today = date.today()
    with get_db_session() as session:
        user = session.get(User, user_id)
        if not user or not user.active:
            return jsonify({"error": "Active user not found"}), 404
        approvals = session.execute(
            select(Report, Committee, User)
            .join(Committee, Committee.committee_id == Report.committee_id)
            .join(User, User.user_id == Report.create_by_uid)
            .join(
                UserRole,
                (UserRole.role == Committee.reviewer_role)
                & (UserRole.user_id == user_id)
                & (UserRole.active.is_(True))
                & (UserRole.eff_start_dt <= today)
                & ((UserRole.eff_end_dt.is_(None)) | (UserRole.eff_end_dt >= today))
            )
            .where(Report.status == "submitted", Report.locked.is_(False))
            .distinct()
            .order_by(Report.upd_dt.desc(), Report.report_id.desc())
        ).all()
        approval_rows = []
        for report, committee, creator in approvals:
            row = api_row(report)
            row.update({
                "committee_name": committee.committee_name,
                "reviewer_role": committee.reviewer_role,
                "first_name": creator.f_name,
                "last_name": creator.l_name
            })
            approval_rows.append(row)
        return jsonify({
            "user": {"user_id": user.user_id, "first_name": user.f_name, "last_name": user.l_name},
            "approvals": approval_rows
        }), 200

# =========================================================
# REPORTS AWAITING LOCK
# =========================================================
@reports_bp.route("/reports/awaiting-lock", methods=["GET"])
def get_reports_awaiting_lock():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    today = date.today()
    with get_db_session() as session:
        user = session.get(User, user_id)
        if not user or not user.active:
            return jsonify({"error": "Active user not found"}), 404
        lock_role = session.scalar(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role.in_(PDF_AUTHORIZED_ROLES),
                UserRole.active.is_(True),
                UserRole.eff_start_dt <= today,
                (UserRole.eff_end_dt.is_(None)) | (UserRole.eff_end_dt >= today)
            ).limit(1)
        )
        user_data = {"user_id": user.user_id, "first_name": user.f_name, "last_name": user.l_name}
        if not lock_role:
            return jsonify({"user": user_data, "can_finalize": False, "awaiting_lock": []}), 200
        reports = session.execute(
            select(Report, Committee, User)
            .join(Committee, Committee.committee_id == Report.committee_id)
            .join(User, User.user_id == Report.create_by_uid)
            .where(Report.status == "approved", Report.locked.is_(False))
            .order_by(Report.upd_dt.desc(), Report.report_id.desc())
        ).all()
        awaiting_lock = []
        for report, committee, creator in reports:
            row = api_row(report)
            row.update({
                "committee_name": committee.committee_name,
                "first_name": creator.f_name,
                "last_name": creator.l_name
            })
            awaiting_lock.append(row)
        return jsonify({"user": user_data, "can_finalize": True, "awaiting_lock": awaiting_lock}), 200

# =========================================================
# REPORT STATUS HISTORY
# =========================================================
@reports_bp.route("/reports/<int:report_id>/status-history", methods=["GET"])
def get_report_status_history(report_id):
    with get_db_session() as session:
        if not session.get(Report, report_id):
            return jsonify({"error": "Report not found"}), 404
        history_rows = session.execute(
            select(ReportStatusHistory, User)
            .join(User, User.user_id == ReportStatusHistory.chgd_by_uid)
            .where(ReportStatusHistory.report_id == report_id)
            .order_by(ReportStatusHistory.chgd_at.desc())
        ).all()
        history = []
        for status_history, user in history_rows:
            row = api_row(status_history)
            row.update({"first_name": user.f_name, "last_name": user.l_name})
            history.append(row)
        return jsonify(history), 200

# =========================================================
# REPORT REVIEW / APPROVAL
# =========================================================
def get_reviewer_error(session, report_id, acting_user_id):
    if not acting_user_id:
        return jsonify({"error": "changed_by_user_id is required"}), 400
    report = session.get(Report, report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    if report.locked:
        return jsonify({"error": "Locked reports cannot be reviewed"}), 409
    committee = session.get(Committee, report.committee_id)
    if not committee or not committee.reviewer_role:
        return jsonify({"error": "No reviewer role is configured for this report's committee"}), 409
    today = date.today()
    authorized_role = session.scalar(
        select(UserRole).where(
            UserRole.user_id == acting_user_id,
            UserRole.role == committee.reviewer_role,
            UserRole.active.is_(True),
            UserRole.eff_start_dt <= today,
            (UserRole.eff_end_dt.is_(None)) | (UserRole.eff_end_dt >= today)
        ).limit(1)
    )
    if not authorized_role:
        return jsonify({"error": "User is not authorized to review this report"}), 403
    return None

@reports_bp.route("/reports/<int:report_id>/return", methods=["POST"])
def return_report(report_id):
    data = request.get_json(silent=True) or {}
    changed_by_user_id = data.get("changed_by_user_id")
    comments = str(data.get("comments") or "").strip()
    if not comments:
        return jsonify({"error": "A comment is required when returning a report for changes"}), 400
    with get_db_session() as session:
        reviewer_error = get_reviewer_error(session, report_id, changed_by_user_id)
        if reviewer_error:
            return reviewer_error
        report = session.scalar(select(Report).where(Report.report_id == report_id).with_for_update())
        if report.status != "submitted":
            return jsonify({"error": "Only Submitted reports can be returned for changes"}), 409
        report.status = "returned_for_changes"
        report.upd_dt = datetime.now(timezone.utc)
        session.add(ReportStatusHistory(
            report_id=report_id, from_status="submitted", to_status="returned_for_changes",
            chgd_by_uid=changed_by_user_id, comments=comments
        ))
        session.commit()
        session.refresh(report)
        return jsonify(api_row(report)), 200

@reports_bp.route("/reports/<int:report_id>/approve", methods=["POST"])
def approve_report(report_id):
    data = request.get_json(silent=True) or {}
    changed_by_user_id = data.get("changed_by_user_id")
    with get_db_session() as session:
        reviewer_error = get_reviewer_error(session, report_id, changed_by_user_id)
        if reviewer_error:
            return reviewer_error
        report = session.scalar(select(Report).where(Report.report_id == report_id).with_for_update())
        if report.status != "submitted":
            return jsonify({"error": "Only Submitted reports can be approved"}), 409
        report.status = "approved"
        report.upd_dt = datetime.now(timezone.utc)
        session.add(ReportStatusHistory(
            report_id=report_id, from_status="submitted", to_status="approved",
            chgd_by_uid=changed_by_user_id, comments=data.get("comments")
        ))
        session.commit()
        session.refresh(report)
        return jsonify(api_row(report)), 200

# =========================================================
# REPORT LOCK
# =========================================================
def get_lock_error(session, acting_user_id):
    if not acting_user_id:
        return jsonify({"error": "changed_by_user_id is required"}), 400
    today = date.today()
    authorized_role = session.scalar(
        select(UserRole).where(
            UserRole.user_id == acting_user_id,
            UserRole.role.in_(PDF_AUTHORIZED_ROLES),
            UserRole.active.is_(True),
            UserRole.eff_start_dt <= today,
            (UserRole.eff_end_dt.is_(None)) | (UserRole.eff_end_dt >= today)
        ).limit(1)
    )
    if not authorized_role:
        return jsonify({"error": "User is not authorized to lock reports"}), 403
    return None

@reports_bp.route("/reports/<int:report_id>/lock", methods=["POST"])
def lock_report(report_id):
    data = request.get_json(silent=True) or {}
    changed_by_user_id = data.get("changed_by_user_id")
    with get_db_session() as session:
        lock_error = get_lock_error(session, changed_by_user_id)
        if lock_error:
            return lock_error
        report = session.scalar(select(Report).where(Report.report_id == report_id).with_for_update())
        if not report:
            return jsonify({"error": "Report not found"}), 404
        if report.locked:
            return jsonify({"error": "Report is already locked"}), 409
        if report.status != "approved":
            return jsonify({"error": "Only Approved reports can be locked"}), 409
        now = datetime.now(timezone.utc)
        report.status = "locked"
        report.locked = True
        report.locked_by_user_id = changed_by_user_id
        report.locked_at = now
        report.upd_dt = now
        session.add(ReportStatusHistory(
            report_id=report_id, from_status="approved", to_status="locked",
            chgd_by_uid=changed_by_user_id, comments=data.get("comments")
        ))
        session.commit()
        session.refresh(report)
        return jsonify(api_row(report)), 200

# =========================================================
# ANSWERS
# =========================================================
@reports_bp.route("/reports/<int:report_id>/answers", methods=["POST"])
def save_answer(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        answer = session.scalar(
            select(Answer).where(
                Answer.report_id == report_id,
                Answer.question_id == data["question_id"],
                Answer.question_version == data["question_version"]
            )
        )
        if answer:
            answer.answer_value = data.get("answer_value")
            answer.answered_by = data["answered_by"]
            answer.notes = data.get("notes")
            answer.answer_dt = datetime.now(timezone.utc)
        else:
            answer = Answer(
                report_id=report_id, question_id=data["question_id"],
                question_version=data["question_version"],
                answer_value=data.get("answer_value"),
                answered_by=data["answered_by"], notes=data.get("notes")
            )
            session.add(answer)
        session.commit()
        session.refresh(answer)
        return jsonify(api_row(answer)), 200

@reports_bp.route("/reports/<int:report_id>/answers", methods=["GET"])
def get_report_answers(report_id):
    with get_db_session() as session:
        rows = session.execute(
            select(Answer, QuestionVersion)
            .join(
                QuestionVersion,
                (QuestionVersion.question_id == Answer.question_id)
                & (QuestionVersion.version == Answer.question_version)
            )
            .where(Answer.report_id == report_id)
            .order_by(Answer.question_id)
        ).all()
        answers = []
        for answer, question_version in rows:
            row = api_row(answer)
            row["question_text"] = question_version.question_text
            answers.append(row)
        return jsonify(answers), 200

# =========================================================
# REPORT ACTION ITEMS
# =========================================================
@reports_bp.route("/reports/<int:report_id>/action-items", methods=["POST"])
def create_action_item(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        action_item = ReportActionItem(
            report_id=report_id, action_item=data["action_item"],
            owner=data.get("owner"), due_dt=parse_date(data.get("due_date")),
            status=data.get("status"), notes=data.get("notes"),
            disp_ord=data.get("display_order", 1)
        )
        session.add(action_item)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Display order must be greater than zero."}), 400
        session.refresh(action_item)
        return jsonify(api_row(action_item)), 201

@reports_bp.route("/reports/<int:report_id>/action-items", methods=["GET"])
def get_action_items(report_id):
    with get_db_session() as session:
        items = session.scalars(
            select(ReportActionItem)
            .where(ReportActionItem.report_id == report_id)
            .order_by(ReportActionItem.disp_ord, ReportActionItem.action_item_id)
        ).all()
        return jsonify(api_rows(items)), 200

@reports_bp.route("/reports/<int:report_id>/action-items/<int:action_item_id>", methods=["PUT"])
def update_action_item(report_id, action_item_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        item = session.scalar(
            select(ReportActionItem).where(
                ReportActionItem.action_item_id == action_item_id,
                ReportActionItem.report_id == report_id
            )
        )
        if not item:
            return jsonify({"error": "Action item not found"}), 404
        item.action_item = data["action_item"]
        item.owner = data.get("owner")
        item.due_dt = parse_date(data.get("due_date"))
        item.status = data.get("status")
        item.notes = data.get("notes")
        item.disp_ord = data.get("display_order", 1)
        item.upd_dt = datetime.now(timezone.utc)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Display order must be greater than zero."}), 400
        session.refresh(item)
        return jsonify(api_row(item)), 200

# =========================================================
# REPORT DATES TO REMEMBER
# =========================================================
@reports_bp.route("/reports/<int:report_id>/dates-to-remember", methods=["GET"])
def get_dates_to_remember(report_id):
    with get_db_session() as session:
        dates = session.scalars(
            select(ReportDateToRemember)
            .where(ReportDateToRemember.report_id == report_id)
            .order_by(ReportDateToRemember.display_order, ReportDateToRemember.report_date_id)
        ).all()
        return jsonify(api_rows(dates)), 200

@reports_bp.route("/reports/<int:report_id>/dates-to-remember", methods=["POST"])
def create_date_to_remember(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        report_date = ReportDateToRemember(
            report_id=report_id, reminder_date=parse_date(data.get("reminder_date")),
            item_deadline=data.get("item_deadline"), owner=data.get("owner"),
            display_order=data.get("display_order", 1)
        )
        session.add(report_date)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Display order must be greater than zero."}), 400
        session.refresh(report_date)
        return jsonify(api_row(report_date)), 201

@reports_bp.route("/reports/<int:report_id>/dates-to-remember/<int:report_date_id>", methods=["PUT"])
def update_date_to_remember(report_id, report_date_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        report_date = session.scalar(
            select(ReportDateToRemember).where(
                ReportDateToRemember.report_date_id == report_date_id,
                ReportDateToRemember.report_id == report_id
            )
        )
        if not report_date:
            return jsonify({"error": "Date to remember not found"}), 404
        report_date.reminder_date = parse_date(data.get("reminder_date"))
        report_date.item_deadline = data.get("item_deadline")
        report_date.owner = data.get("owner")
        report_date.display_order = data.get("display_order", 1)
        report_date.upd_dt = datetime.now(timezone.utc)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Display order must be greater than zero."}), 400
        session.refresh(report_date)
        return jsonify(api_row(report_date)), 200

# =========================================================
# REPORT BUDGET ITEMS
# =========================================================
@reports_bp.route("/reports/<int:report_id>/budget-items", methods=["POST"])
def create_budget_item(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        item = ReportBudgetItem(
            report_id=report_id, category=data.get("category"),
            estimated_cost=data.get("estimated_cost"),
            actual_cost=data.get("actual_cost"), notes=data.get("notes"),
            disp_ord=data.get("display_order", 1)
        )
        session.add(item)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Budget amounts must be zero or greater, and display order must be greater than zero."}), 400
        session.refresh(item)
        return jsonify(api_row(item)), 201

@reports_bp.route("/reports/<int:report_id>/budget-items", methods=["GET"])
def get_budget_items(report_id):
    with get_db_session() as session:
        items = session.scalars(
            select(ReportBudgetItem)
            .where(ReportBudgetItem.report_id == report_id)
            .order_by(ReportBudgetItem.disp_ord, ReportBudgetItem.budget_item_id)
        ).all()
        return jsonify(api_rows(items)), 200

@reports_bp.route("/reports/<int:report_id>/budget-items/<int:budget_item_id>", methods=["PUT"])
def update_budget_item(report_id, budget_item_id):
    data = request.get_json(silent=True) or {}
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        item = session.scalar(
            select(ReportBudgetItem).where(
                ReportBudgetItem.budget_item_id == budget_item_id,
                ReportBudgetItem.report_id == report_id
            )
        )
        if not item:
            return jsonify({"error": "Budget item not found"}), 404
        item.category = data.get("category")
        item.estimated_cost = data.get("estimated_cost")
        item.actual_cost = data.get("actual_cost")
        item.notes = data.get("notes")
        item.disp_ord = data.get("display_order", 1)
        item.upd_dt = datetime.now(timezone.utc)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Budget amounts must be zero or greater, and display order must be greater than zero."}), 400
        session.refresh(item)
        return jsonify(api_row(item)), 200

# =========================================================
# REPORT SECTION PROGRESS
# =========================================================
@reports_bp.route("/reports/<int:report_id>/section-progress", methods=["GET"])
def get_report_section_progress(report_id):
    with get_db_session() as session:
        progress = session.scalars(
            select(ReportSectionProgress)
            .where(ReportSectionProgress.report_id == report_id)
            .order_by(ReportSectionProgress.report_section_progress_id)
        ).all()
        return jsonify(api_rows(progress)), 200

@reports_bp.route("/reports/<int:report_id>/section-progress", methods=["POST"])
def save_report_section_progress(report_id):
    data = request.get_json(silent=True) or {}
    section_name = data.get("section_name")
    completed = data.get("completed", True)
    completed_by_user_id = data.get("completed_by_user_id")
    if not section_name:
        return jsonify({"error": "section_name is required"}), 400
    if not completed_by_user_id:
        return jsonify({"error": "completed_by_user_id is required"}), 400
    with get_db_session() as session:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error
        progress = session.scalar(
            select(ReportSectionProgress).where(
                ReportSectionProgress.report_id == report_id,
                ReportSectionProgress.section_name == section_name
            )
        )
        if not progress:
            progress = ReportSectionProgress(report_id=report_id, section_name=section_name)
            session.add(progress)
        progress.completed = completed
        progress.completed_at = datetime.now(timezone.utc) if completed else None
        progress.completed_by_user_id = completed_by_user_id
        session.commit()
        session.refresh(progress)
        return jsonify(api_row(progress)), 200

# =========================================================
# PDF GENERATION
# =========================================================
def get_pdf_authorization_error(session, acting_user_id):
    if not acting_user_id:
        return jsonify({"error": "changed_by_user_id is required"}), 400
    user = session.get(User, acting_user_id)
    if not user or not user.active:
        return jsonify({"error": "Active user not found"}), 404
    today = date.today()
    role = session.scalar(
        select(UserRole).where(
            UserRole.user_id == acting_user_id,
            UserRole.role.in_(PDF_AUTHORIZED_ROLES),
            UserRole.active.is_(True),
            UserRole.eff_start_dt <= today,
            (UserRole.eff_end_dt.is_(None)) | (UserRole.eff_end_dt >= today)
        ).limit(1)
    )
    if not role:
        return jsonify({"error": "User is not authorized to generate report PDFs"}), 403
    return None

@reports_bp.route("/reports/<int:report_id>/pdf", methods=["POST"])
def generate_report_pdf_route(report_id):
    data = request.get_json(silent=True) or {}
    acting_user_id = data.get("changed_by_user_id")
    with get_db_session() as session:
        authorization_error = get_pdf_authorization_error(session, acting_user_id)
        if authorization_error:
            return authorization_error

        report = session.scalar(select(Report).where(Report.report_id == report_id).with_for_update())
        if not report:
            return jsonify({"error": "Report not found"}), 404
        if not report.locked:
            return jsonify({"error": "PDFs can only be generated for locked reports"}), 409

        template = session.get(ReportTemplate, report.rept_temp_id)
        committee = session.get(Committee, report.committee_id)
        creator = session.get(User, report.create_by_uid)

        question_rows = session.execute(
            select(ReportQuestion, QuestionVersion, Answer)
            .join(
                QuestionVersion,
                (QuestionVersion.question_id == ReportQuestion.question_id)
                & (QuestionVersion.version == ReportQuestion.question_version)
            )
            .outerjoin(
                Answer,
                (Answer.report_id == report_id)
                & (Answer.question_id == ReportQuestion.question_id)
                & (Answer.question_version == ReportQuestion.question_version)
            )
            .where(
                ReportQuestion.report_template_id == report.rept_temp_id,
                ReportQuestion.report_version == report.rept_temp_vsn,
                ReportQuestion.active.is_(True)
            )
            .order_by(ReportQuestion.disp_ord)
        ).all()

        questions = []
        for report_question, question_version, answer in question_rows:
            questions.append({
                "section_name": report_question.section_name,
                "display_order": report_question.disp_ord,
                "question_id": report_question.question_id,
                "question_version": report_question.question_version,
                "question_text": question_version.question_text,
                "question_type": question_version.question_type,
                "answer_value": answer.answer_value if answer else None
            })

        action_models = session.scalars(
            select(ReportActionItem)
            .where(ReportActionItem.report_id == report_id)
            .order_by(ReportActionItem.disp_ord, ReportActionItem.action_item_id)
        ).all()
        action_items = [{
            "action_item": item.action_item, "owner": item.owner,
            "due_date": item.due_dt, "status": item.status,
            "notes": item.notes, "display_order": item.disp_ord
        } for item in action_models]

        date_models = session.scalars(
            select(ReportDateToRemember)
            .where(ReportDateToRemember.report_id == report_id)
            .order_by(ReportDateToRemember.display_order, ReportDateToRemember.report_date_id)
        ).all()
        dates_to_remember = [{
            "reminder_date": item.reminder_date,
            "item_deadline": item.item_deadline,
            "owner": item.owner,
            "display_order": item.display_order
        } for item in date_models]

        budget_models = session.scalars(
            select(ReportBudgetItem)
            .where(ReportBudgetItem.report_id == report_id)
            .order_by(ReportBudgetItem.disp_ord, ReportBudgetItem.budget_item_id)
        ).all()
        budget_items = [{
            "category": item.category,
            "estimated_cost": item.estimated_cost,
            "actual_cost": item.actual_cost,
            "notes": item.notes,
            "display_order": item.disp_ord
        } for item in budget_models]

        submitted_by = " ".join(
            part for part in (creator.f_name, creator.l_name) if part
        ).strip()

        report_data = {
            "report": {
                "report_id": report.report_id,
                "report_title": report.report_title,
                "template_name": template.name,
                "committee_name": committee.committee_name,
                "committee_abbr": committee.comm_abbr,
                "submitted_by": submitted_by,
                "reporting_period": report.reporting_period,
                "event_date": report.event_dt,
                "status": report.status,
                "locked": report.locked
            },
            "questions": questions,
            "action_items": action_items,
            "dates_to_remember": dates_to_remember,
            "budget_items": budget_items
        }

        try:
            pdf_path = generate_report_pdf(report_data)
        except Exception as error:
            return jsonify({"error": "PDF generation failed", "details": str(error)}), 500

        relative_pdf_path = str(
            Path(pdf_path).resolve().relative_to(Path(__file__).resolve().parents[1])
        )
        now = datetime.now(timezone.utc)
        report.pdf_path = relative_pdf_path
        report.pdf_create_by_uid = acting_user_id
        report.pdf_create_dt = now
        report.upd_dt = now
        session.commit()

    return send_file(
        pdf_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=Path(pdf_path).name
    )