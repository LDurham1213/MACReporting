BEGIN;

ALTER TABLE users RENAME COLUMN last_name TO l_name;
ALTER TABLE users RENAME COLUMN first_name TO f_name;
ALTER TABLE users RENAME COLUMN created_at TO create_dt;
ALTER TABLE users RENAME COLUMN updated_at TO upd_dt;

ALTER TABLE committees RENAME COLUMN notification_email TO notif_email;

ALTER TABLE user_roles RENAME COLUMN effective_start_date TO eff_start_dt;
ALTER TABLE user_roles RENAME COLUMN effective_end_date TO eff_end_dt;

ALTER TABLE user_committees RENAME COLUMN effective_start_date TO eff_start_dt;
ALTER TABLE user_committees RENAME COLUMN effective_end_date TO eff_end_dt;

ALTER TABLE report_template_versions RENAME COLUMN created_at TO create_dt;
ALTER TABLE report_template_versions RENAME COLUMN created_by TO create_by;

ALTER TABLE question_versions RENAME COLUMN created_at TO create_dt;
ALTER TABLE question_versions RENAME COLUMN created_by TO create_by;

ALTER TABLE report_questions RENAME COLUMN display_order TO disp_ord;
ALTER TABLE report_questions RENAME COLUMN created_at TO create_dt;
ALTER TABLE report_questions RENAME COLUMN created_by TO create_by;

ALTER TABLE reports RENAME COLUMN report_template_id TO rept_temp_id;
ALTER TABLE reports RENAME COLUMN report_template_version TO rept_temp_vsn;
ALTER TABLE reports RENAME COLUMN created_by_user_id TO create_by_uid;
ALTER TABLE reports RENAME COLUMN event_date TO event_dt;
ALTER TABLE reports RENAME COLUMN created_at TO create_dt;
ALTER TABLE reports RENAME COLUMN updated_at TO upd_dt;
ALTER TABLE reports RENAME COLUMN pdf_created_by_user_id TO pdf_create_by_uid;
ALTER TABLE reports RENAME COLUMN pdf_created_at TO pdf_create_dt;

ALTER TABLE report_status_history
    RENAME COLUMN report_status_history_id TO rept_stat_hist_id;
ALTER TABLE report_status_history
    RENAME COLUMN changed_by_user_id TO chgd_by_uid;
ALTER TABLE report_status_history
    RENAME COLUMN changed_at TO chgd_at;

ALTER TABLE answers RENAME COLUMN answer_date TO answer_dt;

ALTER TABLE attachments RENAME COLUMN original_filename TO orig_filenm;
ALTER TABLE attachments RENAME COLUMN include_in_pdf TO inc_in_pdf;
ALTER TABLE attachments RENAME COLUMN uploaded_at TO upload_dt;

ALTER TABLE report_action_items RENAME COLUMN due_date TO due_dt;
ALTER TABLE report_action_items RENAME COLUMN display_order TO disp_ord;
ALTER TABLE report_action_items RENAME COLUMN created_at TO create_dt;
ALTER TABLE report_action_items RENAME COLUMN updated_at TO upd_dt;

ALTER TABLE report_dates_to_remember RENAME COLUMN created_at TO create_dt;
ALTER TABLE report_dates_to_remember RENAME COLUMN updated_at TO upd_dt;

ALTER TABLE report_budget_items RENAME COLUMN display_order TO disp_ord;
ALTER TABLE report_budget_items RENAME COLUMN created_at TO create_dt;
ALTER TABLE report_budget_items RENAME COLUMN updated_at TO upd_dt;

COMMIT;
