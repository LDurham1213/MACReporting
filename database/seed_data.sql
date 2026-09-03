BEGIN;

-- =========================================================
-- DEVELOPMENT SYSTEM USER
-- Used only to identify who created initial versioned seed data.
-- =========================================================

INSERT INTO users (first_name, last_name, email, active)
VALUES ('System', 'Seed', 'seed@macreporting.local', FALSE);

-- =========================================================
-- INITIAL COMMITTEE
-- =========================================================

INSERT INTO committees (committee_name)
VALUES ('Social Action Committee');

-- =========================================================
-- REPORT TEMPLATES
-- =========================================================

INSERT INTO report_templates (name, description)
VALUES
  ('Committee Report', 'Monthly committee reporting template'),
  ('Post-Mortem Report', 'Post-event or post-program reporting template');

-- =========================================================
-- TEMPLATE VERSION 1
-- =========================================================

INSERT INTO report_template_versions (
  report_template_id,
  version,
  created_by
)
SELECT report_template_id, 1,
       (SELECT user_id FROM users WHERE email = 'seed@macreporting.local')
FROM report_templates;

-- =========================================================
-- QUESTION MASTER RECORDS
-- =========================================================

INSERT INTO questions (question_code) VALUES
  ('EVENT_PROGRAM_NAME'),
  ('EVENT_DATE'),
  ('EVENT_TIME'),
  ('LOCATION_FORMAT'),
  ('INTERNAL_PARTNERS'),
  ('EXTERNAL_PARTNERS'),
  ('PROGRAM_THRUST'),
  ('POPULATION_SERVED'),
  ('EXPECTED_OUTCOMES'),
  ('PROGRAM_SUMMARY'),
  ('GOALS'),
  ('RECENT_SUCCESSES'),
  ('CHALLENGES'),
  ('RESOURCES_NEEDED'),

  ('REPORT_DATE'),
  ('SUBMITTED_BY'),
  ('POSTMORTEM_ACTIVITY_NAME'),
  ('POSTMORTEM_DATE_TIME'),
  ('POSTMORTEM_LOCATION'),
  ('PARTNERSHIPS'),
  ('OBJECTIVE'),
  ('PROGRAM_RATIONALE'),
  ('COMMUNITY_ATTENDANCE'),
  ('CHAPTER_ATTENDANCE'),
  ('TOTAL_ATTENDANCE'),
  ('GRANTS_EXTERNAL_FUNDING'),
  ('CHAPTER_EXPENSES'),
  ('INTERNAL_COMMITTEE_PARTNERSHIPS'),
  ('KEY_METRICS'),
  ('EVALUATIONS'),
  ('SOCIAL_MEDIA'),
  ('RESULTS_OUTCOMES'),
  ('EXTERNAL_COVERAGE_PR'),
  ('EVENT_STRENGTHS_SUCCESSES'),
  ('LESSONS_LEARNED'),
  ('KEY_RECOMMENDATIONS'),
  ('PARTICIPANT_FEEDBACK'),
  ('COMMITTEE_FEEDBACK');

-- =========================================================
-- QUESTION VERSION 1
-- =========================================================

INSERT INTO question_versions (
  question_id,
  version,
  question_text,
  question_type,
  created_by
)
SELECT
  q.question_id,
  1,
  v.question_text,
  v.question_type,
  u.user_id
FROM (
  VALUES
    ('EVENT_PROGRAM_NAME', 'Event / Program Name', 'text'),
    ('EVENT_DATE', 'Date', 'date'),
    ('EVENT_TIME', 'Time', 'text'),
    ('LOCATION_FORMAT', 'Location / Format', 'text'),
    ('INTERNAL_PARTNERS', 'Internal Partners', 'text'),
    ('EXTERNAL_PARTNERS', 'External Partners', 'text'),
    ('PROGRAM_THRUST', 'Program Thrust', 'dropdown'),
    ('POPULATION_SERVED', 'Population Served', 'text'),
    ('EXPECTED_OUTCOMES', 'Expected Outcomes', 'textarea'),
    ('PROGRAM_SUMMARY', 'Program Summary', 'textarea'),
    ('GOALS', 'Goals', 'textarea'),
    ('RECENT_SUCCESSES', 'Recent Successes', 'textarea'),
    ('CHALLENGES', 'Challenges', 'textarea'),
    ('RESOURCES_NEEDED', 'Resources Needed', 'textarea'),

    ('REPORT_DATE', 'Report Date', 'date'),
    ('SUBMITTED_BY', 'Submitted By', 'text'),
    ('POSTMORTEM_ACTIVITY_NAME', 'Activity Name', 'text'),
    ('POSTMORTEM_DATE_TIME', 'Date / Time', 'text'),
    ('POSTMORTEM_LOCATION', 'Location', 'text'),
    ('PARTNERSHIPS', 'Partnerships', 'text'),
    ('OBJECTIVE', 'Objective', 'textarea'),
    ('PROGRAM_RATIONALE', 'Program Rationale', 'textarea'),
    ('COMMUNITY_ATTENDANCE', 'Community Attendance', 'number'),
    ('CHAPTER_ATTENDANCE', 'Chapter Attendance', 'number'),
    ('TOTAL_ATTENDANCE', 'Total Attendance', 'number'),
    ('GRANTS_EXTERNAL_FUNDING', 'Grants / External Funding', 'currency'),
    ('CHAPTER_EXPENSES', 'Chapter Expenses', 'currency'),
    ('INTERNAL_COMMITTEE_PARTNERSHIPS', 'Internal Committee Partnerships', 'textarea'),
    ('KEY_METRICS', 'Key Metrics', 'textarea'),
    ('EVALUATIONS', 'Evaluations', 'textarea'),
    ('SOCIAL_MEDIA', 'Social Media', 'textarea'),
    ('RESULTS_OUTCOMES', 'Results Outcomes', 'textarea'),
    ('EXTERNAL_COVERAGE_PR', 'PR - External Coverage / Articles / PR', 'textarea'),
    ('EVENT_STRENGTHS_SUCCESSES', 'Event / Program Strengths or Successes', 'textarea'),
    ('LESSONS_LEARNED', 'Lessons Learned (Key Takeaways)', 'textarea'),
    ('KEY_RECOMMENDATIONS', 'Key Recommendations', 'textarea'),
    ('PARTICIPANT_FEEDBACK', 'Participant Feedback (if Applicable)', 'textarea'),
    ('COMMITTEE_FEEDBACK', 'Committee Feedback', 'textarea')
) AS v(question_code, question_text, question_type)
JOIN questions q ON q.question_code = v.question_code
CROSS JOIN users u
WHERE u.email = 'seed@macreporting.local';

-- =========================================================
-- COMMITTEE REPORT VERSION 1
-- =========================================================

INSERT INTO report_questions (
  report_template_id,
  report_version,
  question_id,
  question_version,
  section_name,
  display_order,
  required,
  created_by
)
SELECT
  rt.report_template_id,
  1,
  q.question_id,
  1,
  rq.section_name,
  rq.display_order,
  rq.required,
  u.user_id
FROM (
  VALUES
    ('EVENT_PROGRAM_NAME', 'Event Logistics / Program Overview', 1, TRUE),
    ('EVENT_DATE', 'Event Logistics / Program Overview', 2, TRUE),
    ('EVENT_TIME', 'Event Logistics / Program Overview', 3, TRUE),
    ('LOCATION_FORMAT', 'Event Logistics / Program Overview', 4, TRUE),
    ('INTERNAL_PARTNERS', 'Event Logistics / Program Overview', 5, FALSE),
    ('EXTERNAL_PARTNERS', 'Event Logistics / Program Overview', 6, FALSE),
    ('PROGRAM_THRUST', 'Event Logistics / Program Overview', 7, TRUE),
    ('POPULATION_SERVED', 'Event Logistics / Program Overview', 8, FALSE),
    ('EXPECTED_OUTCOMES', 'Event Logistics / Program Overview', 9, FALSE),
    ('PROGRAM_SUMMARY', 'Program Summary', 10, TRUE),
    ('GOALS', 'Goals', 11, TRUE),
    ('RECENT_SUCCESSES', 'Recent Successes', 12, TRUE),
    ('CHALLENGES', 'Challenges', 13, FALSE),
    ('RESOURCES_NEEDED', 'Resources Needed', 14, FALSE)
) AS rq(question_code, section_name, display_order, required)
JOIN questions q ON q.question_code = rq.question_code
CROSS JOIN report_templates rt
CROSS JOIN users u
WHERE rt.name = 'Committee Report'
  AND u.email = 'seed@macreporting.local';

-- =========================================================
-- POST-MORTEM REPORT VERSION 1
-- =========================================================

INSERT INTO report_questions (
  report_template_id,
  report_version,
  question_id,
  question_version,
  section_name,
  display_order,
  required,
  created_by
)
SELECT
  rt.report_template_id,
  1,
  q.question_id,
  1,
  rq.section_name,
  rq.display_order,
  rq.required,
  u.user_id
FROM (
  VALUES
    ('REPORT_DATE', 'Report Information', 1, TRUE),
    ('SUBMITTED_BY', 'Report Information', 2, TRUE),
    ('POSTMORTEM_ACTIVITY_NAME', 'Event Logistics', 3, TRUE),
    ('POSTMORTEM_DATE_TIME', 'Event Logistics', 4, TRUE),
    ('POSTMORTEM_LOCATION', 'Event Logistics', 5, TRUE),
    ('PARTNERSHIPS', 'Event Logistics', 6, FALSE),
    ('PROGRAM_THRUST', 'Goals / Objective', 7, TRUE),
    ('OBJECTIVE', 'Goals / Objective', 8, TRUE),
    ('PROGRAM_RATIONALE', 'Goals / Objective', 9, TRUE),
    ('COMMUNITY_ATTENDANCE', 'Goals / Objective', 10, FALSE),
    ('CHAPTER_ATTENDANCE', 'Goals / Objective', 11, FALSE),
    ('TOTAL_ATTENDANCE', 'Goals / Objective', 12, FALSE),
    ('GRANTS_EXTERNAL_FUNDING', 'Financial Information / Metrics', 13, FALSE),
    ('CHAPTER_EXPENSES', 'Financial Information / Metrics', 14, FALSE),
    ('INTERNAL_COMMITTEE_PARTNERSHIPS', 'Outcome / Metrics', 15, FALSE),
    ('KEY_METRICS', 'Outcome / Metrics', 16, FALSE),
    ('EVALUATIONS', 'Outcome / Metrics', 17, FALSE),
    ('SOCIAL_MEDIA', 'Outcome / Metrics', 18, FALSE),
    ('RESULTS_OUTCOMES', 'Outcome / Metrics', 19, FALSE),
    ('EXTERNAL_COVERAGE_PR', 'Outcome / Metrics', 20, FALSE),
    ('EVENT_STRENGTHS_SUCCESSES', 'Outcome / Metrics', 21, FALSE),
    ('LESSONS_LEARNED', 'Outcome / Metrics', 22, FALSE),
    ('KEY_RECOMMENDATIONS', 'Outcome / Metrics', 23, FALSE),
    ('PARTICIPANT_FEEDBACK', 'Outcome / Metrics', 24, FALSE),
    ('COMMITTEE_FEEDBACK', 'Committee Feedback', 25, FALSE)
) AS rq(question_code, section_name, display_order, required)
JOIN questions q ON q.question_code = rq.question_code
CROSS JOIN report_templates rt
CROSS JOIN users u
WHERE rt.name = 'Post-Mortem Report'
  AND u.email = 'seed@macreporting.local';

COMMIT;