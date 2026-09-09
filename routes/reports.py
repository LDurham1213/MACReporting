from datetime import date, datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from db import get_db_session
from models import Committee, Report, ReportStatusHistory, User, UserRole
from pdf_services.pdf_service import generate_report_pdf

reports_bp = Blueprint("reports", __name__)

EDITABLE_STATUSES = ("draft", "returned_for_changes")

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
    if hasattr(row, "__table__"):
        row = model_row(row)
    else:
        row = dict(row)
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
    session = get_db_session()
    try:
        statement = (
            select(
                Report.report_id,
                Report.report_title,
                Report.rept_temp_id.label("report_template_id"),
                Report.rept_temp_vsn.label("report_template_version"),
                Report.committee_id,
                Committee.committee_name,
                Report.create_by_uid.label("created_by_user_id"),
                User.f_name.label("first_name"),
                User.l_name.label("last_name"),
                Report.reporting_period,
                Report.event_dt.label("event_date"),
                Report.status,
                Report.locked,
                Report.create_dt.label("created_at"),
                Report.upd_dt.label("updated_at")
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
    finally:
        session.close()

@reports_bp.route("/reports", methods=["POST"])
def create_report():
    data = request.get_json(silent=True) or {}
    session = get_db_session()
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
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

@reports_bp.route("/reports/<int:report_id>", methods=["GET"])
def get_report(report_id):
    session = get_db_session()
    try:
        report = session.get(Report, report_id)
        if not report:
            return jsonify({"error": "Report not found"}), 404
        return jsonify(api_row(report))
    finally:
        session.close()

@reports_bp.route("/reports/<int:report_id>", methods=["PUT"])
def update_report(report_id):
    data = request.get_json(silent=True) or {}
    session = get_db_session()
    try:
        edit_error = get_edit_error(session, report_id)
        if edit_error:
            return edit_error

        report = session.get(Report, report_id)
        if not report:
            return jsonify({"error": "Report not found"}), 404

        report.report_title = data.get("report_title", report.report_title)
        report.reporting_period = parse_date(data["reporting_period"]) if "reporting_period" in data else report.reporting_period
        report.event_dt = parse_date(data["event_date"]) if "event_date" in data else report.event_dt
        report.committee_id = data.get("committee_id", report.committee_id)
        report.create_by_uid = data.get("created_by_user_id", report.create_by_uid)
        report.upd_dt = datetime.now(timezone.utc)

        session.commit()
        session.refresh(report)
        return jsonify(api_row(report))
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# =========================================================
# REPORT SUBMISSION
# =========================================================

@reports_bp.route("/reports/<int:report_id>/submit", methods=["POST"])
def submit_report(report_id):
    data = request.get_json(silent=True) or {}
    session = get_db_session()
    try:
        report = session.execute(
            select(Report).where(Report.report_id == report_id).with_for_update()
        ).scalar_one_or_none()

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
            report_id=report_id,
            from_status=previous_status,
            to_status="submitted",
            chgd_by_uid=changed_by_user_id,
            comments=data.get("comments")
        ))

        session.commit()
        session.refresh(report)
        return jsonify(api_row(report)), 200
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

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
                "last_name": creator.l_name,
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
    lock_roles = ("president", "technology_chair", "technology_admin")
    with get_db_session() as session:
        user = session.get(User, user_id)
        if not user or not user.active:
            return jsonify({"error": "Active user not found"}), 404
        lock_role = session.scalar(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role.in_(lock_roles),
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
                "last_name": creator.l_name,
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
        if not report:
            return jsonify({"error": "Report not found"}), 404
        if report.status != "submitted":
            return jsonify({"error": "Only Submitted reports can be returned for changes"}), 409
        report.status = "returned_for_changes"
        report.upd_dt = datetime.now(timezone.utc)
        session.add(ReportStatusHistory(
            report_id=report_id,
            from_status="submitted",
            to_status="returned_for_changes",
            chgd_by_uid=changed_by_user_id,
            comments=comments
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
        if not report:
            return jsonify({"error": "Report not found"}), 404
        if report.status != "submitted":
            return jsonify({"error": "Only Submitted reports can be approved"}), 409
        report.status = "approved"
        report.upd_dt = datetime.now(timezone.utc)
        session.add(ReportStatusHistory(
            report_id=report_id,
            from_status="submitted",
            to_status="approved",
            chgd_by_uid=changed_by_user_id,
            comments=data.get("comments")
        ))
        session.commit()
        session.refresh(report)
        return jsonify(api_row(report)), 200

# =========================================================
# REPORT LOCK
# =========================================================
def get_lock_error(connection, acting_user_id):
    if not acting_user_id:
        return jsonify({
            "error": "changed_by_user_id is required"
        }), 400
    authorized_role = connection.execute(
        """
        SELECT role
        FROM user_roles
        WHERE user_id = %s
          AND role IN (
              'president',
              'technology_chair',
              'technology_admin'
          )
          AND active = TRUE
          AND eff_start_dt <= CURRENT_DATE
          AND (
              eff_end_dt IS NULL
              OR eff_end_dt >= CURRENT_DATE
          )
        LIMIT 1
        """,
        (acting_user_id,)
    ).fetchone()
    if not authorized_role:
        return jsonify({
            "error": (
                "User is not authorized "
                "to lock reports"
            )
        }), 403
    return None
@reports_bp.route(
    "/reports/<int:report_id>/lock",
methods=["POST"]
)
def lock_report(report_id):
    data = request.get_json(silent=True) or {}
    changed_by_user_id = data.get("changed_by_user_id")
    with get_db_connection() as connection:
        lock_error = get_lock_error(
            connection,
            changed_by_user_id
        )
        if lock_error:
            return lock_error
        report = connection.execute(
            """
            SELECT
                report_id,
                status,
                locked
            FROM reports
            WHERE report_id = %s
            FOR UPDATE
            """,
            (report_id,)
        ).fetchone()
        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404
        if report["locked"]:
            return jsonify({
                "error": "Report is already locked"
            }), 409
        if report["status"] != "approved":
            return jsonify({
                "error": (
                    "Only Approved reports "
                    "can be locked"
                )
            }), 409
        updated_report = connection.execute(
            """
            UPDATE reports
            SET status = 'locked',
                locked = TRUE,
                locked_by_user_id = %s,
                locked_at = CURRENT_TIMESTAMP,
                upd_dt = CURRENT_TIMESTAMP
            WHERE report_id = %s
            RETURNING *
            """,
            (
                changed_by_user_id,
report_id
            )
        ).fetchone()
        connection.execute(
            """
            INSERT INTO report_status_history (
                report_id,
                from_status,
                to_status,
                chgd_by_uid,
                comments
            )
            VALUES (
                %s,
                'approved',
                'locked',
                %s,
                %s
            )
            """,
            (
report_id,
                changed_by_user_id,
                data.get("comments")
            )
        )
    return jsonify(api_row(updated_report)), 200

# =========================================================
# ANSWERS
# =========================================================
@reports_bp.route(
    "/reports/<int:report_id>/answers",
methods=["POST"]
)
def save_answer(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
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
                answer_value = EXCLUDED.answer_value,
                answered_by = EXCLUDED.answered_by,
                notes = EXCLUDED.notes,
                answer_dt = CURRENT_TIMESTAMP
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
    return jsonify(api_row(answer)), 200
@reports_bp.route(
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
                a.answer_dt AS answer_date,
                a.answered_by,
                a.notes
            FROM answers a
            JOIN question_versions qv
              ON qv.question_id = a.question_id
             AND qv.version = a.question_version
            WHERE a.report_id = %s
            ORDER BY a.question_id
            """,
            (report_id,)
        ).fetchall()
    return jsonify(answers)

# =========================================================
# REPORT ACTION ITEMS
# =========================================================
@reports_bp.route(
    "/reports/<int:report_id>/action-items",
methods=["POST"]
)
def create_action_item(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
        action_item = connection.execute(
            """
            INSERT INTO report_action_items (
                report_id,
                action_item,
                owner,
                due_dt,
                status,
                notes,
                disp_ord
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
    return jsonify(api_row(action_item)), 201
@reports_bp.route(
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
                disp_ord,
                action_item_id
            """,
            (report_id,)
        ).fetchall()
    return jsonify(api_rows(action_items))
@reports_bp.route(
    "/reports/<int:report_id>/action-items/"
    "<int:action_item_id>",
methods=["PUT"]
)
def update_action_item(
report_id,
action_item_id
):
    data = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
        action_item = connection.execute(
            """
            UPDATE report_action_items
            SET action_item = %s,
                owner = %s,
                due_dt = %s,
                status = %s,
                notes = %s,
                disp_ord = %s,
                upd_dt = CURRENT_TIMESTAMP
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
    return jsonify(api_row(action_item))

# =========================================================
# REPORT DATES TO REMEMBER
# =========================================================
@reports_bp.route(
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
    return jsonify(api_rows(dates))
@reports_bp.route(
    "/reports/<int:report_id>/dates-to-remember",
methods=["POST"]
)
def create_date_to_remember(report_id):
    data = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
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
    return jsonify(api_row(report_date)), 201
@reports_bp.route(
    "/reports/<int:report_id>/dates-to-remember/"
    "<int:report_date_id>",
methods=["PUT"]
)
def update_date_to_remember(
report_id,
report_date_id
):
    data = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
        report_date = connection.execute(
            """
            UPDATE report_dates_to_remember
            SET reminder_date = %s,
                item_deadline = %s,
                owner = %s,
                display_order = %s,
                upd_dt = CURRENT_TIMESTAMP
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
    return jsonify(api_row(report_date))

# =========================================================
# REPORT BUDGET ITEMS
# =========================================================
@reports_bp.route(
    "/reports/<int:report_id>/budget-items",
methods=["POST"]
)
def create_budget_item(report_id):
    data = request.get_json(silent=True) or {}
    try:
        with get_db_connection() as connection:
            edit_error = get_edit_error(
                connection,
report_id
            )
            if edit_error:
                return edit_error
            budget_item = connection.execute(
                """
                INSERT INTO report_budget_items (
                    report_id,
                    category,
                    estimated_cost,
                    actual_cost,
                    notes,
                    disp_ord
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
        return jsonify(api_row(budget_item)), 201
    except CheckViolation:
        return jsonify({
            "error": (
                "Budget amounts must be zero "
                "or greater, and display order "
                "must be greater than zero."
            )
        }), 400
@reports_bp.route(
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
                disp_ord,
                budget_item_id
            """,
            (report_id,)
        ).fetchall()
    return jsonify(api_rows(budget_items))
@reports_bp.route(
    "/reports/<int:report_id>/budget-items/"
    "<int:budget_item_id>",
methods=["PUT"]
)
def update_budget_item(
report_id,
budget_item_id
):
    data = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
        budget_item = connection.execute(
            """
            UPDATE report_budget_items
            SET category = %s,
                estimated_cost = %s,
                actual_cost = %s,
                notes = %s,
                disp_ord = %s,
                upd_dt = CURRENT_TIMESTAMP
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
    return jsonify(api_row(budget_item))

# =========================================================
# REPORT SECTION PROGRESS
# =========================================================
@reports_bp.route(
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
@reports_bp.route(
    "/reports/<int:report_id>/section-progress",
methods=["POST"]
)
def save_report_section_progress(report_id):
    data = request.get_json(silent=True) or {}
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
        edit_error = get_edit_error(
            connection,
report_id
        )
        if edit_error:
            return edit_error
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
                completed = EXCLUDED.completed,
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

# =========================================================
# PDF GENERATION
# =========================================================
PDF_AUTHORIZED_ROLES = (
    "president",
    "technology_chair",
    "technology_admin",
)
def get_pdf_authorization_error(connection, acting_user_id):
    if not acting_user_id:
        return jsonify({
            "error": "changed_by_user_id is required"
        }), 400
    user = connection.execute(
        """
        SELECT user_id
        FROM users
        WHERE user_id = %s
          AND active = TRUE
        """,
        (acting_user_id,)
    ).fetchone()
    if not user:
        return jsonify({
            "error": "Active user not found"
        }), 404
    authorized_role = connection.execute(
        """
        SELECT role
        FROM user_roles
        WHERE user_id = %s
          AND role IN (
              'president',
              'technology_chair',
              'technology_admin'
          )
          AND active = TRUE
          AND eff_start_dt <= CURRENT_DATE
          AND (
              eff_end_dt IS NULL
              OR eff_end_dt >= CURRENT_DATE
          )
        LIMIT 1
        """,
        (acting_user_id,)
    ).fetchone()
    if not authorized_role:
        return jsonify({
            "error": (
                "User is not authorized "
                "to generate report PDFs"
            )
        }), 403
    return None
@reports_bp.route(
    "/reports/<int:report_id>/pdf",
    methods=["POST"]
)
def generate_report_pdf_route(report_id):
    data = request.get_json(silent=True) or {}
    acting_user_id = data.get("changed_by_user_id")
    with get_db_connection() as connection:
        authorization_error = get_pdf_authorization_error(
            connection,
            acting_user_id
        )
        if authorization_error:
            return authorization_error
        report = connection.execute(
            """
            SELECT
                r.report_id,
                r.report_title,
                r.rept_temp_id,
                r.rept_temp_vsn,
                r.committee_id,
                r.create_by_uid,
                r.reporting_period,
                r.event_dt AS event_date,
                r.status,
                r.locked,
                rt.name AS template_name,
                c.committee_name,
                c.comm_abbr,
                creator.f_name,
                creator.l_name
            FROM reports r
            JOIN report_templates rt
              ON rt.report_template_id = r.rept_temp_id
            JOIN committees c
              ON c.committee_id = r.committee_id
            JOIN users creator
              ON creator.user_id = r.create_by_uid
            WHERE r.report_id = %s
            FOR UPDATE OF r
            """,
            (report_id,)
        ).fetchone()
        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404
        if not report["locked"]:
            return jsonify({
                "error": (
                    "PDFs can only be generated "
                    "for locked reports"
                )
            }), 409
        questions = connection.execute(
            """
            SELECT
                rq.section_name,
                rq.disp_ord AS display_order,
                rq.question_id,
                rq.question_version,
                qv.question_text,
                qv.question_type,
                a.answer_value
            FROM report_questions rq
            JOIN question_versions qv
              ON qv.question_id = rq.question_id
             AND qv.version = rq.question_version
            LEFT JOIN answers a
              ON a.report_id = %s
             AND a.question_id = rq.question_id
             AND a.question_version = rq.question_version
            WHERE rq.report_template_id = %s
              AND rq.report_version = %s
              AND rq.active = TRUE
            ORDER BY rq.disp_ord
            """,
            (
                report_id,
                report["rept_temp_id"],
                report["rept_temp_vsn"]
            )
        ).fetchall()
        action_items = connection.execute(
            """
            SELECT
                action_item,
                owner,
                due_dt AS due_date,
                status,
                notes,
                disp_ord AS display_order
            FROM report_action_items
            WHERE report_id = %s
            ORDER BY disp_ord, action_item_id
            """,
            (report_id,)
        ).fetchall()
        dates_to_remember = connection.execute(
            """
            SELECT
                reminder_date,
                item_deadline,
                owner,
                display_order
            FROM report_dates_to_remember
            WHERE report_id = %s
            ORDER BY display_order, report_date_id
            """,
            (report_id,)
        ).fetchall()
        budget_items = connection.execute(
            """
            SELECT
                category,
                estimated_cost,
                actual_cost,
                notes,
                disp_ord AS display_order
            FROM report_budget_items
            WHERE report_id = %s
            ORDER BY disp_ord, budget_item_id
            """,
            (report_id,)
        ).fetchall()
        submitted_by = " ".join(
            part
            for part in (
                report["f_name"],
                report["l_name"],
            )
            if part
        ).strip()
        report_data = {
            "report": {
                "report_id": report["report_id"],
                "report_title": report["report_title"],
                "template_name": report["template_name"],
                "committee_name": report["committee_name"],
                "committee_abbr": report["comm_abbr"],
                "submitted_by": submitted_by,
                "reporting_period": report["reporting_period"],
                "event_date": report["event_date"],
                "status": report["status"],
                "locked": report["locked"],
            },
            "questions": [dict(row) for row in questions],
            "action_items": [dict(row) for row in action_items],
            "dates_to_remember": [
                dict(row)
                for row in dates_to_remember
            ],
            "budget_items": [dict(row) for row in budget_items],
        }
        try:
            pdf_path = generate_report_pdf(report_data)
        except Exception as error:
            return jsonify({
                "error": "PDF generation failed",
                "details": str(error),
            }), 500
        relative_pdf_path = str(
            Path(pdf_path).resolve().relative_to(
                Path(__file__).resolve().parents[1]
            )
        )
        connection.execute(
            """
            UPDATE reports
            SET pdf_path = %s,
                pdf_create_by_uid = %s,
                pdf_create_dt = CURRENT_TIMESTAMP,
                upd_dt = CURRENT_TIMESTAMP
            WHERE report_id = %s
            """,
            (
                relative_pdf_path,
                acting_user_id,
                report_id,
            )
        )
    return send_file(
        pdf_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=Path(pdf_path).name,
    )
