-- report_templates
INSERT INTO report_templates (name, description) VALUES
    ('Committee Report', 'Description for Committee Report'),
    ('Post-Mortem Report', 'Description for Post-Mortem Report');


-- questions
INSERT INTO questions (
    report_template_id,
    section_name,
    question_text,
    question_type,
    required,
    display_order
) VALUES
    -- report_template_id 1 questions
    (1, 'Event Logistics/Program Overview', 'Activity Name', 'text', 1, 1),
    (1, 'Event Logistics/Program Overview', 'Location', 'text', 1, 2),
    (1, 'Event Logistics/Program Overview', 'Date', 'date', 1, 3),
    (1, 'Event Logistics/Program Overview', 'Time', 'text', 1, 4),
    (1, 'Event Logistics/Program Overview', 'Partnerships', 'text', 1, 5),
    (1, 'Goals/Objective', 'Program Thrust', 'text', 1, 6),
    (1, 'Goals/Objective', 'Population Served', 'text', 1, 7),
    (1, 'Overview', 'Expected Outcomes', 'textarea', 1, 8),
    (1, 'Overview', 'Program Overview', 'textarea', 1, 9),
    (1, 'Overview', 'Committee/Program Updates', 'textarea', 1, 10),
    (1, 'Overview', 'Next Steps', 'textarea', 1, 11),
    --report_template_id 2 questions
    (2, 'Report Information', 'Report Date', 'date', 1, 1),
    (2, 'Report Information', 'Submitted By', 'text', 1, 2),
    (2, 'Event Logistics', 'Activity Name', 'text', 1, 3),
    (2, 'Event Logistics', 'Date/Time', 'text', 1, 4),
    (2, 'Event Logistics', 'Location', 'text', 1, 5),
    (2, 'Event Logistics', 'Partnerships', 'text', 0, 6),
    (2, 'Goals/Objective', 'Program Thrust', 'text', 1, 7),
    (2, 'Goals/Objective', 'Objective', 'textarea', 1, 8),
    (2, 'Goals/Objective', 'Program Rationale', 'textarea', 1, 9),
    (2, 'Goals/Objective', 'Community Attendance', 'number', 0, 10),
    (2, 'Goals/Objective', 'Chapter Attendance', 'number', 0, 11),
    (2, 'Goals/Objective', 'Total Attendance', 'number', 0, 12),
    (2, 'Financial Information/Metrics', 'Grants/External Funding', 'currency', 0, 13),
    (2, 'Financial Information/Metrics', 'Chapter Expenses', 'currency', 0, 14),
    (2, 'Outcome/Metrics', 'Internal Committee Partnerships', 'textarea', 0, 15),
    (2, 'Outcome/Metrics', 'Key Metrics', 'textarea', 0, 16),
    (2, 'Outcome/Metrics', 'Evaluations', 'textarea', 0, 17),
    (2, 'Outcome/Metrics', 'Social Media', 'textarea', 0, 18),
    (2, 'Outcome/Metrics', 'Results Outcomes', 'textarea', 0, 19),
    (2, 'Outcome/Metrics', 'PR - External Coverage/Articles/PR', 'textarea', 0, 20),
    (2, 'Outcome/Metrics', 'Event/Program Strengths or Successes', 'textarea', 0, 21),
    (2, 'Outcome/Metrics', 'Lessons Learned (Key Takeaways)', 'textarea', 0, 22),
    (2, 'Outcome/Metrics', 'Key Recommendations', 'textarea', 0, 23),
    (2, 'Outcome/Metrics', 'Participant Feedback (if Applicable)', 'textarea', 0, 24),
    (2, 'Committee Feedback', 'Committee Feedback', 'textarea', 0, 25);