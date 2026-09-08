from db import SessionLocal
from models import Committee, Question, QuestionVersion, ReportQuestion, ReportTemplate, ReportTemplateVersion, User

SYSTEM_EMAIL = "seed@macreporting.local"

QUESTIONS = [
    ("EVENT_PROGRAM_NAME", "Event / Program Name", "text"),
    ("EVENT_DATE", "Date", "date"),
    ("EVENT_TIME", "Time", "text"),
    ("LOCATION_FORMAT", "Location / Format", "text"),
    ("INTERNAL_PARTNERS", "Internal Partners", "text"),
    ("EXTERNAL_PARTNERS", "External Partners", "text"),
    ("PROGRAM_THRUST", "Program Thrust", "dropdown"),
    ("POPULATION_SERVED", "Population Served", "text"),
    ("EXPECTED_OUTCOMES", "Expected Outcomes", "textarea"),
    ("PROGRAM_SUMMARY", "Program Summary", "textarea"),
    ("GOALS", "Goals", "textarea"),
    ("RECENT_SUCCESSES", "Recent Successes", "textarea"),
    ("CHALLENGES", "Challenges", "textarea"),
    ("RESOURCES_NEEDED", "Resources Needed", "textarea"),
    ("FINANCIAL_REQUEST", "Financial Request", "currency"),
    ("FINANCIAL_REQUEST_DESCRIPTION", "Financial Request Description", "textarea"),
    ("REPORT_DATE", "Report Date", "date"),
    ("SUBMITTED_BY", "Submitted By", "text"),
    ("POSTMORTEM_ACTIVITY_NAME", "Activity Name", "text"),
    ("POSTMORTEM_DATE_TIME", "Date / Time", "text"),
    ("POSTMORTEM_LOCATION", "Location", "text"),
    ("PARTNERSHIPS", "Partnerships", "text"),
    ("OBJECTIVE", "Objective", "textarea"),
    ("PROGRAM_RATIONALE", "Program Rationale", "textarea"),
    ("COMMUNITY_ATTENDANCE", "Community Attendance", "number"),
    ("CHAPTER_ATTENDANCE", "Chapter Attendance", "number"),
    ("TOTAL_ATTENDANCE", "Total Attendance", "number"),
    ("GRANTS_EXTERNAL_FUNDING", "Grants / External Funding", "currency"),
    ("CHAPTER_EXPENSES", "Chapter Expenses", "currency"),
    ("INTERNAL_COMMITTEE_PARTNERSHIPS", "Internal Committee Partnerships", "textarea"),
    ("KEY_METRICS", "Key Metrics", "textarea"),
    ("VOLUNTEER_HOURS", "Volunteer Hours of Effort", "number"),
    ("EVALUATIONS", "Evaluations", "textarea"),
    ("SOCIAL_MEDIA", "Social Media", "textarea"),
    ("RESULTS_OUTCOMES", "Results Outcomes", "textarea"),
    ("EXTERNAL_COVERAGE_PR", "PR - External Coverage / Articles / PR", "textarea"),
    ("EVENT_STRENGTHS_SUCCESSES", "Event / Program Strengths or Successes", "textarea"),
    ("LESSONS_LEARNED", "Lessons Learned (Key Takeaways)", "textarea"),
    ("KEY_RECOMMENDATIONS", "Key Recommendations", "textarea"),
    ("PARTICIPANT_FEEDBACK", "Participant Feedback (if Applicable)", "textarea"),
    ("COMMITTEE_FEEDBACK", "Committee Feedback", "textarea")
]

COMMITTEE_QUESTIONS = [
    ("EVENT_PROGRAM_NAME", "Event Logistics / Program Overview", 1, True),
    ("EVENT_DATE", "Event Logistics / Program Overview", 2, True),
    ("EVENT_TIME", "Event Logistics / Program Overview", 3, True),
    ("LOCATION_FORMAT", "Event Logistics / Program Overview", 4, True),
    ("INTERNAL_PARTNERS", "Event Logistics / Program Overview", 5, False),
    ("EXTERNAL_PARTNERS", "Event Logistics / Program Overview", 6, False),
    ("PROGRAM_THRUST", "Event Logistics / Program Overview", 7, True),
    ("POPULATION_SERVED", "Event Logistics / Program Overview", 8, False),
    ("EXPECTED_OUTCOMES", "Event Logistics / Program Overview", 9, False),
    ("PROGRAM_SUMMARY", "Program Summary", 10, True),
    ("GOALS", "Goals", 11, True),
    ("RECENT_SUCCESSES", "Recent Successes", 12, True),
    ("CHALLENGES", "Challenges", 13, False),
    ("RESOURCES_NEEDED", "Resources Needed", 14, False),
    ("FINANCIAL_REQUEST", "Resources Needed", 15, False),
    ("FINANCIAL_REQUEST_DESCRIPTION", "Resources Needed", 16, False)
]

POSTMORTEM_QUESTIONS = [
    ("REPORT_DATE", "Report Information", 1, True),
    ("SUBMITTED_BY", "Report Information", 2, True),
    ("POSTMORTEM_ACTIVITY_NAME", "Event Logistics", 3, True),
    ("POSTMORTEM_DATE_TIME", "Event Logistics", 4, True),
    ("POSTMORTEM_LOCATION", "Event Logistics", 5, True),
    ("PARTNERSHIPS", "Event Logistics", 6, False),
    ("PROGRAM_THRUST", "Goals / Objective", 7, True),
    ("OBJECTIVE", "Goals / Objective", 8, True),
    ("PROGRAM_RATIONALE", "Goals / Objective", 9, True),
    ("COMMUNITY_ATTENDANCE", "Goals / Objective", 10, False),
    ("CHAPTER_ATTENDANCE", "Goals / Objective", 11, False),
    ("TOTAL_ATTENDANCE", "Goals / Objective", 12, False),
    ("GRANTS_EXTERNAL_FUNDING", "Financial Information / Metrics", 13, False),
    ("CHAPTER_EXPENSES", "Financial Information / Metrics", 14, False),
    ("INTERNAL_COMMITTEE_PARTNERSHIPS", "Outcome / Metrics", 15, False),
    ("KEY_METRICS", "Outcome / Metrics", 16, False),
    ("VOLUNTEER_HOURS", "Outcome / Metrics", 17, False),
    ("EVALUATIONS", "Outcome / Metrics", 18, False),
    ("SOCIAL_MEDIA", "Outcome / Metrics", 19, False),
    ("RESULTS_OUTCOMES", "Outcome / Metrics", 20, False),
    ("EXTERNAL_COVERAGE_PR", "Outcome / Metrics", 21, False),
    ("EVENT_STRENGTHS_SUCCESSES", "Outcome / Metrics", 22, False),
    ("LESSONS_LEARNED", "Outcome / Metrics", 23, False),
    ("KEY_RECOMMENDATIONS", "Outcome / Metrics", 24, False),
    ("PARTICIPANT_FEEDBACK", "Outcome / Metrics", 25, False),
    ("COMMITTEE_FEEDBACK", "Committee Feedback", 26, False)
]


def seed_database():
    session = SessionLocal()
    try:
        if session.query(User).filter_by(email=SYSTEM_EMAIL).first():
            print("Database already seeded.")
            return

        system_user = User(f_name="System", l_name="Seed", email=SYSTEM_EMAIL, active=False)
        social_action = Committee(committee_name="Social Action", comm_abbr="SA")
        committee_template = ReportTemplate(name="Committee Report", description="Monthly committee reporting template")
        postmortem_template = ReportTemplate(name="Post-Mortem Report", description="Post-event or post-program reporting template")
        session.add_all([system_user, social_action, committee_template, postmortem_template])
        session.flush()

        session.add_all([
            ReportTemplateVersion(report_template_id=committee_template.report_template_id, version=1, create_by=system_user.user_id),
            ReportTemplateVersion(report_template_id=postmortem_template.report_template_id, version=1, create_by=system_user.user_id)
        ])

        question_lookup = {}
        for code, text, question_type in QUESTIONS:
            question = Question(question_code=code)
            session.add(question)
            session.flush()
            session.add(QuestionVersion(question_id=question.question_id, version=1, question_text=text, question_type=question_type, create_by=system_user.user_id))
            question_lookup[code] = question

        for code, section, order, required in COMMITTEE_QUESTIONS:
            question = question_lookup[code]
            session.add(ReportQuestion(report_template_id=committee_template.report_template_id, report_version=1, question_id=question.question_id, question_version=1, section_name=section, disp_ord=order, required=required, create_by=system_user.user_id))

        for code, section, order, required in POSTMORTEM_QUESTIONS:
            question = question_lookup[code]
            session.add(ReportQuestion(report_template_id=postmortem_template.report_template_id, report_version=1, question_id=question.question_id, question_version=1, section_name=section, disp_ord=order, required=required, create_by=system_user.user_id))

        session.commit()
        print("Application seed data created successfully.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()