from flask import Blueprint, jsonify, request
from sqlalchemy import Integer, func, select

from db import get_db_session
from models import (
    Answer,
    Committee,
    Question,
    Report,
    ReportBudgetItem
)

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/summary", methods=["GET"])
def dashboard_summary():
    try:
        with get_db_session() as session:
            reporting_period = request.args.get("reporting_period")
            committee_id = request.args.get("committee_id")

            report_filters = []

            if reporting_period:
                report_filters.append(
                    Report.reporting_period == reporting_period
                )

            if committee_id:
                report_filters.append(
                    Report.committee_id == int(committee_id)
                )

            valid_statuses = [
                "submitted",
                "reviewed",
                "approved",
                "locked"
            ]

            # Programs Held:
            # Post-Mortem reports (template 2) that have moved beyond draft.
            programs_held = session.scalar(
                select(func.count(Report.report_id))
                .where(
                    Report.rept_temp_id == 2,
                    Report.status.in_(valid_statuses),
                    *report_filters
                )
            ) or 0

            # Total Attendance:
            # Use TOTAL_ATTENDANCE rather than adding community
            # and chapter attendance and double-counting.
            total_attendance = session.scalar(
                select(
                    func.coalesce(
                        func.sum(
                            func.cast(Answer.answer_value, Integer)
                        ),
                        0
                    )
                )
                .join(
                    Question,
                    Question.question_id == Answer.question_id
                )
                .join(
                    Report,
                    Report.report_id == Answer.report_id
                )
                .where(
                    Question.question_code == "TOTAL_ATTENDANCE",
                    Report.status.in_(valid_statuses),
                    *report_filters
                )
            ) or 0

            # Total Expenses:
            # Sum actual budget costs for reports that have progressed
            # beyond draft.
            total_expenses = session.scalar(
                select(
                    func.coalesce(
                        func.sum(ReportBudgetItem.actual_cost),
                        0
                    )
                )
                .join(
                    Report,
                    Report.report_id == ReportBudgetItem.report_id
                )
                .where(
                    Report.status.in_(valid_statuses),
                    *report_filters
                )
            ) or 0

            # Reports Submitted:
            # Includes reports currently submitted and reports that
            # have since progressed to review, approval, or lock.
            reports_submitted = session.scalar(
                select(func.count(Report.report_id))
                .where(
                    Report.status.in_(valid_statuses),
                    *report_filters
                )
            ) or 0

            return jsonify({
                "programs_held": int(programs_held),
                "total_attendance": int(total_attendance),
                "total_expenses": float(total_expenses),
                "reports_submitted": int(reports_submitted)
            })

    except Exception as error:
        return jsonify({
            "error": "Unable to load dashboard summary.",
            "details": str(error)
        }), 500


@dashboard_bp.route("/dashboard/committee-activity", methods=["GET"])
def dashboard_committee_activity():
    try:
        with get_db_session() as session:
            reporting_period = request.args.get("reporting_period")
            committee_id = request.args.get("committee_id")

            report_filters = []

            if reporting_period:
                report_filters.append(
                    Report.reporting_period == reporting_period
                )

            if committee_id:
                report_filters.append(
                    Report.committee_id == int(committee_id)
                )

            valid_statuses = [
                "submitted",
                "reviewed",
                "approved",
                "locked"
            ]

            committee_query = (
                select(Committee)
                .where(Committee.active.is_(True))
                .order_by(Committee.committee_name)
            )

            if committee_id:
                committee_query = committee_query.where(
                    Committee.committee_id == int(committee_id)
                )

            committees = session.scalars(committee_query).all()

            activity = []

            for committee in committees:
                programs_held = session.scalar(
                    select(func.count(Report.report_id))
                    .where(
                        Report.committee_id == committee.committee_id,
                        Report.rept_temp_id == 2,
                        Report.status.in_(valid_statuses),
                        *report_filters
                    )
                ) or 0

                total_attendance = session.scalar(
                    select(
                        func.coalesce(
                            func.sum(
                                func.cast(
                                    Answer.answer_value,
                                    Integer
                                )
                            ),
                            0
                        )
                    )
                    .join(
                        Question,
                        Question.question_id == Answer.question_id
                    )
                    .join(
                        Report,
                        Report.report_id == Answer.report_id
                    )
                    .where(
                        Report.committee_id == committee.committee_id,
                        Report.rept_temp_id == 2,
                        Report.status.in_(valid_statuses),
                        Question.question_code == "TOTAL_ATTENDANCE",
                        *report_filters
                    )
                ) or 0

                total_expenses = session.scalar(
                    select(
                        func.coalesce(
                            func.sum(ReportBudgetItem.actual_cost),
                            0
                        )
                    )
                    .join(
                        Report,
                        Report.report_id == ReportBudgetItem.report_id
                    )
                    .where(
                        Report.committee_id == committee.committee_id,
                        Report.status.in_(valid_statuses),
                        *report_filters
                    )
                ) or 0

                activity.append({
                    "committee_id": committee.committee_id,
                    "committee_name": committee.committee_name,
                    "committee_abbr": committee.comm_abbr,
                    "programs_held": int(programs_held),
                    "total_attendance": int(total_attendance),
                    "total_expenses": float(total_expenses)
                })

            return jsonify(activity)

    except Exception as error:
        return jsonify({
            "error": "Unable to load committee activity.",
            "details": str(error)
        }), 500


@dashboard_bp.route("/dashboard/report-status", methods=["GET"])
def dashboard_report_status():
    try:
        with get_db_session() as session:
            reporting_period = request.args.get("reporting_period")
            committee_id = request.args.get("committee_id")

            report_filters = []

            if reporting_period:
                report_filters.append(
                    Report.reporting_period == reporting_period
                )

            if committee_id:
                report_filters.append(
                    Report.committee_id == int(committee_id)
                )

            rows = session.execute(
                select(
                    Report.status,
                    func.count(Report.report_id)
                )
                .where(*report_filters)
                .group_by(Report.status)
                .order_by(Report.status)
            ).all()

            status_counts = {
                status: count
                for status, count in rows
            }

            display_order = [
                "draft",
                "submitted",
                "reviewed",
                "returned_for_changes",
                "approved",
                "locked",
                "archived",
                "other"
            ]

            statuses = []

            for status in display_order:
                if status in status_counts:
                    statuses.append({
                        "status": status,
                        "count": int(status_counts[status])
                    })

            return jsonify({
                "total_reports": sum(
                    item["count"] for item in statuses
                ),
                "statuses": statuses
            })

    except Exception as error:
        return jsonify({
            "error": "Unable to load report status.",
            "details": str(error)
        }), 500


@dashboard_bp.route("/dashboard/filter-options", methods=["GET"])
def dashboard_filter_options():
    try:
        with get_db_session() as session:
            reporting_periods = session.scalars(
                select(Report.reporting_period)
                .where(Report.reporting_period.is_not(None))
                .distinct()
                .order_by(Report.reporting_period.desc())
            ).all()

            committees = session.scalars(
                select(Committee)
                .where(Committee.active.is_(True))
                .order_by(Committee.committee_name)
            ).all()

            return jsonify({
                "reporting_periods": [
                    str(period)
                    for period in reporting_periods
                ],
                "committees": [
                    {
                        "committee_id": committee.committee_id,
                        "committee_name": committee.committee_name,
                        "committee_abbr": committee.comm_abbr
                    }
                    for committee in committees
                ]
            })

    except Exception as error:
        return jsonify({
            "error": "Unable to load dashboard filter options.",
            "details": str(error)
        }), 500