from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    f_name: Mapped[str] = mapped_column(String(100), nullable=False)
    l_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    upd_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())


class Committee(Base):
    __tablename__ = "committees"

    committee_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    committee_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    comm_abbr: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    reviewer_role: Mapped[str | None] = mapped_column(String(50))
    notif_email: Mapped[str | None] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (
        CheckConstraint("eff_end_dt IS NULL OR eff_end_dt >= eff_start_dt", name="chk_user_roles_dates"),
        Index("idx_user_roles_user", "user_id"),
    )

    user_role_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    eff_start_dt: Mapped[date] = mapped_column(Date, nullable=False)
    eff_end_dt: Mapped[date | None] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class UserCommittee(Base):
    __tablename__ = "user_committees"
    __table_args__ = (
        CheckConstraint("eff_end_dt IS NULL OR eff_end_dt >= eff_start_dt", name="chk_user_committees_dates"),
        Index("idx_user_committees_user", "user_id"),
        Index("idx_user_committees_committee", "committee_id"),
    )

    user_committee_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    committee_id: Mapped[int] = mapped_column(ForeignKey("committees.committee_id"), nullable=False)
    committee_role: Mapped[str] = mapped_column(String(50), nullable=False)
    eff_start_dt: Mapped[date] = mapped_column(Date, nullable=False)
    eff_end_dt: Mapped[date | None] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    report_template_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class ReportTemplateVersion(Base):
    __tablename__ = "report_template_versions"
    __table_args__ = (
        CheckConstraint("version > 0", name="chk_template_version_positive"),
    )

    report_template_id: Mapped[int] = mapped_column(ForeignKey("report_templates.report_template_id"), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    create_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class Question(Base):
    __tablename__ = "questions"

    question_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    question_code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class QuestionVersion(Base):
    __tablename__ = "question_versions"
    __table_args__ = (
        CheckConstraint("version > 0", name="chk_question_version_positive"),
        CheckConstraint("question_type IN ('text', 'textarea', 'number', 'date', 'currency', 'dropdown', 'checkbox')", name="chk_question_type"),
    )

    question_id: Mapped[int] = mapped_column(ForeignKey("questions.question_id"), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)
    create_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class ReportQuestion(Base):
    __tablename__ = "report_questions"
    __table_args__ = (
        ForeignKeyConstraint(["report_template_id", "report_version"], ["report_template_versions.report_template_id", "report_template_versions.version"]),
        ForeignKeyConstraint(["question_id", "question_version"], ["question_versions.question_id", "question_versions.version"]),
        CheckConstraint("disp_ord > 0", name="chk_report_question_order"),
    )

    report_template_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    report_version: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    question_version: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_name: Mapped[str | None] = mapped_column(String(255))
    disp_ord: Mapped[int] = mapped_column(Integer, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    create_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        ForeignKeyConstraint(["rept_temp_id", "rept_temp_vsn"], ["report_template_versions.report_template_id", "report_template_versions.version"]),
        CheckConstraint("status IN ('draft', 'submitted', 'reviewed', 'approved', 'returned_for_changes', 'locked', 'archived', 'other')", name="chk_report_status"),
        CheckConstraint("(locked = FALSE AND locked_by_user_id IS NULL AND locked_at IS NULL) OR (locked = TRUE AND locked_by_user_id IS NOT NULL AND locked_at IS NOT NULL)", name="chk_report_lock_metadata"),
        CheckConstraint("pdf_path IS NULL OR locked = TRUE", name="chk_report_pdf_requires_lock"),
        Index("idx_reports_committee", "committee_id"),
        Index("idx_reports_status", "status"),
        Index("idx_reports_reporting_period", "reporting_period"),
        Index("idx_reports_created_by", "create_by_uid"),
    )

    report_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    rept_temp_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    rept_temp_vsn: Mapped[int] = mapped_column(Integer, nullable=False)
    committee_id: Mapped[int] = mapped_column(ForeignKey("committees.committee_id"), nullable=False)
    create_by_uid: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    report_title: Mapped[str] = mapped_column(String(255), nullable=False)
    reporting_period: Mapped[date | None] = mapped_column(Date)
    event_dt: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft", server_default="draft")
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    upd_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    locked_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pdf_path: Mapped[str | None] = mapped_column(Text)
    pdf_create_by_uid: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"))
    pdf_create_dt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"
    __table_args__ = (
        CheckConstraint("from_status IS NULL OR from_status IN ('draft', 'submitted', 'reviewed', 'approved', 'returned_for_changes', 'locked', 'archived', 'other')", name="chk_status_history_from"),
        CheckConstraint("to_status IN ('draft', 'submitted', 'reviewed', 'approved', 'returned_for_changes', 'locked', 'archived', 'other')", name="chk_status_history_to"),
        Index("idx_report_status_history_report", "report_id"),
        Index("idx_report_status_history_changed_at", "chgd_at"),
    )

    rept_stat_hist_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.report_id"), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    chgd_by_uid: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    chgd_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    comments: Mapped[str | None] = mapped_column(Text)


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        ForeignKeyConstraint(["question_id", "question_version"], ["question_versions.question_id", "question_versions.version"]),
        UniqueConstraint("report_id", "question_id", "question_version", name="uq_report_question_answer"),
        Index("idx_answers_report", "report_id"),
        Index("idx_answers_question", "question_id", "question_version"),
    )

    answer_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.report_id"), nullable=False)
    question_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    question_version: Mapped[int] = mapped_column(Integer, nullable=False)
    answer_value: Mapped[str | None] = mapped_column(Text)
    answer_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    answered_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class Attachment(Base):
    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint("file_size >= 0", name="chk_attachment_file_size"),
        Index("idx_attachments_report", "report_id"),
    )

    attachment_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.report_id"), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    orig_filenm: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    inc_in_pdf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    upload_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class ReportActionItem(Base):
    __tablename__ = "report_action_items"
    __table_args__ = (
        CheckConstraint("disp_ord > 0", name="chk_action_item_order"),
        Index("idx_action_items_report", "report_id"),
    )

    action_item_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.report_id"), nullable=False)
    action_item: Mapped[str] = mapped_column(Text, nullable=False)
    owner: Mapped[str | None] = mapped_column(String(255))
    due_dt: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    disp_ord: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    upd_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())


class ReportDateToRemember(Base):
    __tablename__ = "report_dates_to_remember"
    __table_args__ = (
        CheckConstraint("display_order > 0", name="chk_report_date_order"),
        Index("idx_dates_to_remember_report", "report_id"),
    )

    report_date_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.report_id"), nullable=False)
    reminder_date: Mapped[date | None] = mapped_column(Date)
    item_deadline: Mapped[str | None] = mapped_column(Text)
    owner: Mapped[str | None] = mapped_column(String(255))
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    upd_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())


class ReportBudgetItem(Base):
    __tablename__ = "report_budget_items"
    __table_args__ = (
        CheckConstraint("estimated_cost IS NULL OR estimated_cost >= 0", name="chk_budget_estimated_cost"),
        CheckConstraint("actual_cost IS NULL OR actual_cost >= 0", name="chk_budget_actual_cost"),
        CheckConstraint("disp_ord > 0", name="chk_budget_item_order"),
        Index("idx_budget_items_report", "report_id"),
    )

    budget_item_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.report_id"), nullable=False)
    category: Mapped[str | None] = mapped_column(String(255))
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    actual_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    disp_ord: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    create_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())
    upd_dt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp())