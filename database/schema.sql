CREATE TABLE report_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_template_id INTEGER NOT NULL,
    section_name TEXT,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    required INTEGER DEFAULT 0,
    display_order INTEGER,

    FOREIGN KEY (report_template_id)
        REFERENCES report_templates(id)
        ON DELETE CASCADE
);