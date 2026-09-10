from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_

from db import SessionLocal
from models import (
    Answer, Attachment, Committee, Question, QuestionVersion, Report,
    ReportActionItem, ReportBudgetItem, ReportDateToRemember, ReportQuestion,
    ReportSectionProgress, ReportStatusHistory, ReportTemplate,
    ReportTemplateVersion, User, UserRole
)

DEMO_PREFIX = "DEMO - "

COMMITTEE_REPORTS = [
    ("draft", "leighjdst@gmail.com", "SA", "Social Action Committee Report", 0),
    ("draft", "bsumpter4@gmail.com", "RM", "Risk Management Committee Report", -1),
    ("draft", "sweetgum6@aol.com", "AAF", "Adopt a Family Committee Report", -2),
    ("draft", "mlindercoates@gmail.com", "AL", "Arts & Letters Committee Report", 0),
    ("submitted", "leighjdst@gmail.com", "SA", "Social Action Monthly Report", -1),
    ("submitted", "sweetgum6@aol.com", "AAF", "Adopt a Family Monthly Report", 0),
    ("submitted", "bsumpter4@gmail.com", "AL", "Arts & Letters Monthly Report", -1),
    ("submitted", "rx2002@aol.com", "AAF", "Adopt a Family Planning Report", -3),
    ("locked", "mlindercoates@gmail.com", "AL", "Arts & Letters Final Report", -2),
    ("locked", "leighjdst@gmail.com", "RM", "Risk Management Final Report", -3),
    ("locked", "bsumpter4@gmail.com", "AL", "Arts & Letters Archived Report", -3)
]

POSTMORTEM_REPORTS = [
    ("draft", "sweetgum6@aol.com", "AAF", "School Supply Drive", 0),
    ("draft", "leighjdst@gmail.com", "TECH", "Technology Training Session", -1),
    ("draft", "mlindercoates@gmail.com", "AL", "Arts & Letters Film Discussion", -2),
    ("draft", "bsumpter4@gmail.com", "RM", "Risk Management Workshop", 0),
    ("submitted", "leighjdst@gmail.com", "SA", "Community Resource Fair", -1),
    ("submitted", "sweetgum6@aol.com", "AAF", "Family Support Workshop", 0),
    ("submitted", "bsumpter4@gmail.com", "AL", "Author Spotlight", -1),
    ("submitted", "mlindercoates@gmail.com", "AL", "Youth Arts Program", -2),
    ("locked", "sweetgum6@aol.com", "AAF", "Back to School Drive", -3),
    ("locked", "leighjdst@gmail.com", "SA", "Community Service Day", -2),
    ("locked", "bsumpter4@gmail.com", "AL", "Chapter Arts Showcase", -3)
]

def month_start(offset):
    today = date.today()
    year = today.year
    month = today.month + offset
    while month < 1:
        month += 12
        year -= 1
    while month > 12:
        month -= 12
        year += 1
    return date(year, month, 1)

def event_date_for(period, index):
    day = 10 + (index % 12)
    return date(period.year, period.month, min(day, 28))

def get_user(session, email):
    user = session.query(User).filter_by(email=email).first()
    if not user:
        raise RuntimeError(f"Demo user not found: {email}. Run database/seed_development.py first.")
    return user

def get_committee(session, abbreviation):
    committee = session.query(Committee).filter_by(comm_abbr=abbreviation).first()
    if not committee:
        raise RuntimeError(f"Committee not found: {abbreviation}. Run database/seed_development.py first.")
    return committee

def get_role_user(session, role):
    return (
        session.query(User)
        .join(UserRole, UserRole.user_id == User.user_id)
        .filter(UserRole.role == role, UserRole.active.is_(True), User.active.is_(True))
        .first()
    )

def get_template(session, name):
    template = session.query(ReportTemplate).filter_by(name=name).first()
    if not template:
        raise RuntimeError(f'Report template "{name}" not found. Run the base seed first.')

    version = (
        session.query(ReportTemplateVersion)
        .filter(ReportTemplateVersion.report_template_id == template.report_template_id, ReportTemplateVersion.active.is_(True))
        .order_by(ReportTemplateVersion.version.desc())
        .first()
    )
    if not version:
        raise RuntimeError(f'No active version found for "{name}".')
    return template, version

def get_template_questions(session, template_id, version):
    return (
        session.query(ReportQuestion, Question, QuestionVersion)
        .join(Question, Question.question_id == ReportQuestion.question_id)
        .join(
            QuestionVersion,
            and_(
                QuestionVersion.question_id == ReportQuestion.question_id,
                QuestionVersion.version == ReportQuestion.question_version
            )
        )
        .filter(
            ReportQuestion.report_template_id == template_id,
            ReportQuestion.report_version == version,
            ReportQuestion.active.is_(True),
            Question.active.is_(True),
            QuestionVersion.active.is_(True)
        )
        .order_by(ReportQuestion.disp_ord)
        .all()
    )

def answer_for_question(question, version, report_type, index, creator, committee, event_dt):
    code = question.question_code.upper()
    text = version.question_text.upper()
    qtype = version.question_type.lower()
    full_name = f"{creator.f_name} {creator.l_name}".strip()

    if code == "FINANCIAL_REQUEST":
        return "500.00"
    if code == "FINANCIAL_REQUEST_DESCRIPTION":
        return "Funding requested for program materials, supplies, and participant resources."
    if code == "VOLUNTEER_HOURS":
        return str(18 + index * 2)
    if "EMAIL" in code:
        return creator.email
    if "NAME" in code and qtype in ("text", "textarea"):
        return full_name
    if "COMMITTEE" in code and qtype in ("text", "textarea"):
        return committee.committee_name
    if "ATTEND" in code or "PARTICIP" in code or "REACH" in code:
        return str(30 + index * 5)
    if "VOLUNTEER" in code and qtype == "number":
        return str(15 + index * 2)
    if "BUDGET" in code or "COST" in code or "AMOUNT" in code:
        return f"{250 + index * 50:.2f}"
    if "GOAL" in code or "OBJECTIVE" in code:
        return "Engage members and the community while meeting the program objectives established by the committee."
    if "ACCOMPLISH" in code or "OUTCOME" in code or "RESULT" in code:
        return "The program met its primary objectives and received positive participation and feedback."
    if "LESSON" in code:
        return "Begin planning earlier, confirm volunteers in advance, and allow additional time for follow-up."
    if "RECOMMEND" in code:
        return "Continue the program with earlier promotion and additional volunteer support."
    if "PUBLIC" in code or "PROMOT" in code or "MEDIA" in code:
        return "The program was promoted through chapter communications, social media, and direct outreach."
    if "LOCATION" in code or "VENUE" in code:
        return "Middletown, Delaware"
    if "DATE" in code or qtype == "date":
        return event_dt.isoformat()
    if qtype == "number":
        return str(10 + index)
    if qtype == "currency":
        return f"{200 + index * 25:.2f}"
    if qtype == "checkbox":
        return "true"
    if qtype == "dropdown":
        if "STATUS" in code or "STATUS" in text:
            return "Completed"
        return "Yes"
    if qtype == "textarea":
        if report_type == "committee":
            return f"Demo committee update for {committee.committee_name}. Activities are progressing as planned and members remain engaged."
        return f"Demo post-mortem response for the event. The activity was well received and overall objectives were achieved."
    return f"Demo response {index + 1}"

def add_answers(session, report, template_id, template_version, report_type, index, creator, committee, event_dt):
    question_rows = get_template_questions(session, template_id, template_version)
    for _, question, question_version in question_rows:
        value = answer_for_question(question, question_version, report_type, index, creator, committee, event_dt)
        session.add(
            Answer(
                report_id=report.report_id,
                question_id=question.question_id,
                question_version=question_version.version,
                answer_value=value,
                answered_by=creator.user_id
            )
        )
    return question_rows

def add_section_progress(session, report, question_rows, creator, complete_all):
    sections = []
    for report_question, _, _ in question_rows:
        if report_question.section_name and report_question.section_name not in sections:
            sections.append(report_question.section_name)

    completed_at = datetime.now(timezone.utc) if complete_all else None
    for index, section in enumerate(sections):
        completed = complete_all or index < 2
        session.add(
            ReportSectionProgress(
                report_id=report.report_id,
                section_name=section,
                completed=completed,
                completed_at=completed_at if completed else None,
                completed_by_user_id=creator.user_id if completed else None
            )
        )

def add_supporting_data(session, report, creator, status, index, event_dt):
    completed = status == "locked"
    session.add(
        ReportActionItem(
            report_id=report.report_id,
            action_item="Complete follow-up communication with members and community partners.",
            owner=f"{creator.f_name} {creator.l_name}".strip(),
            due_dt=event_dt + timedelta(days=14),
            status="Completed" if completed else "In Progress",
            notes="Demo action item for presentation purposes.",
            disp_ord=1
        )
    )
    session.add(
        ReportDateToRemember(
            report_id=report.report_id,
            reminder_date=event_dt + timedelta(days=30),
            item_deadline="Committee follow-up and final review",
            owner=f"{creator.f_name} {creator.l_name}".strip(),
            display_order=1
        )
    )
    session.add(
        ReportBudgetItem(
            report_id=report.report_id,
            category="Program Supplies",
            estimated_cost=Decimal("500.00"),
            actual_cost=Decimal("475.00") if completed else Decimal("450.00"),
            notes="Demo budget item.",
            disp_ord=1
        )
    )

def add_status_history(session, report, creator, reviewer, finalizer, status, base_dt):
    session.add(
        ReportStatusHistory(
            report_id=report.report_id,
            from_status=None,
            to_status="draft",
            chgd_by_uid=creator.user_id,
            chgd_at=base_dt,
            comments="Demo report created."
        )
    )

    if status in ("submitted", "locked"):
        session.add(
            ReportStatusHistory(
                report_id=report.report_id,
                from_status="draft",
                to_status="submitted",
                chgd_by_uid=creator.user_id,
                chgd_at=base_dt + timedelta(hours=2),
                comments="Demo report submitted for review."
            )
        )

    if status == "locked":
        session.add(
            ReportStatusHistory(
                report_id=report.report_id,
                from_status="submitted",
                to_status="approved",
                chgd_by_uid=reviewer.user_id,
                chgd_at=base_dt + timedelta(hours=4),
                comments="Demo report approved."
            )
        )
        session.add(
            ReportStatusHistory(
                report_id=report.report_id,
                from_status="approved",
                to_status="locked",
                chgd_by_uid=finalizer.user_id,
                chgd_at=base_dt + timedelta(hours=6),
                comments="Demo report finalized and locked."
            )
        )

def delete_existing_demo_reports(session):
    demo_reports = session.query(Report).filter(Report.report_title.like(f"{DEMO_PREFIX}%")).all()
    report_ids = [report.report_id for report in demo_reports]

    if not report_ids:
        return 0

    child_models = [
        ReportSectionProgress,
        ReportBudgetItem,
        ReportDateToRemember,
        ReportActionItem,
        Attachment,
        Answer,
        ReportStatusHistory
    ]

    for model in child_models:
        session.query(model).filter(model.report_id.in_(report_ids)).delete(synchronize_session=False)

    session.query(Report).filter(Report.report_id.in_(report_ids)).delete(synchronize_session=False)
    session.flush()
    return len(report_ids)

def create_report_set(session, report_type, specs, template, template_version, finalizer):
    created = []

    for index, (status, email, committee_abbr, title, month_offset) in enumerate(specs):
        creator = get_user(session, email)
        committee = get_committee(session, committee_abbr)
        reviewer = get_role_user(session, committee.reviewer_role)

        if status == "locked" and not reviewer:
            raise RuntimeError(f"No active reviewer found for role {committee.reviewer_role}.")

        reporting_period = month_start(month_offset)
        event_dt = event_date_for(reporting_period, index)
        base_dt = datetime.combine(reporting_period, time(9, 0), tzinfo=timezone.utc)

        report = Report(
            rept_temp_id=template.report_template_id,
            rept_temp_vsn=template_version.version,
            committee_id=committee.committee_id,
            create_by_uid=creator.user_id,
            report_title=f"{DEMO_PREFIX}{title}",
            reporting_period=reporting_period,
            event_dt=event_dt if report_type == "postmortem" else None,
            status=status,
            create_dt=base_dt,
            upd_dt=base_dt + timedelta(hours=6 if status == "locked" else 2),
            locked=status == "locked",
            locked_by_user_id=finalizer.user_id if status == "locked" else None,
            locked_at=base_dt + timedelta(hours=6) if status == "locked" else None
        )

        session.add(report)
        session.flush()

        question_rows = add_answers(
            session,
            report,
            template.report_template_id,
            template_version.version,
            report_type,
            index,
            creator,
            committee,
            event_dt
        )

        add_section_progress(session, report, question_rows, creator, status in ("submitted", "locked"))
        add_supporting_data(session, report, creator, status, index, event_dt)
        add_status_history(session, report, creator, reviewer, finalizer, status, base_dt)
        created.append(report)

    return created

def seed_demo_reports():
    session = SessionLocal()
    try:
        committee_template, committee_version = get_template(session, "Committee Report")
        postmortem_template, postmortem_version = get_template(session, "Post-Mortem Report")
        finalizer = get_role_user(session, "president")

        if not finalizer:
            raise RuntimeError("No active president found. Run database/seed_development.py first.")

        deleted = delete_existing_demo_reports(session)

        committee_reports = create_report_set(
            session,
            "committee",
            COMMITTEE_REPORTS,
            committee_template,
            committee_version,
            finalizer
        )

        postmortem_reports = create_report_set(
            session,
            "postmortem",
            POSTMORTEM_REPORTS,
            postmortem_template,
            postmortem_version,
            finalizer
        )

        session.commit()

        print(f"Removed {deleted} existing demo reports.")
        print("Demo reports created successfully.")
        print("Committee Reports: 4 draft, 4 submitted, 3 locked")
        print("Post-Mortem Reports: 4 draft, 4 submitted, 3 locked")
        print(f"Total demo reports: {len(committee_reports) + len(postmortem_reports)}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_demo_reports()