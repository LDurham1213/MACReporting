from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
import re
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GENERATED_PDF_DIR = Path(__file__).resolve().parent / "generated_pdfs"
DEFAULT_LOGO_PATH = PROJECT_ROOT / "react-frontend" / "src" / "assets" / "MAC_LOGO.png"

MAC_RED = colors.HexColor("#B51E2E")
MAC_RED_DARK = colors.HexColor("#941827")
MAC_LIGHT_RED = colors.HexColor("#F8EDEF")
MAC_LIGHT_GRAY = colors.HexColor("#F3F3F3")
MAC_BORDER = colors.HexColor("#B7B7B7")
MAC_TEXT = colors.HexColor("#222222")
WHITE = colors.white

TABLE_SECTIONS = {
    "Committee Details",
    "Report Information",
    "Event Logistics / Program Overview",
    "Event Logistics",
    "Financial Information / Metrics",
}

def generate_report_pdf(
    report_data: dict[str, Any],
    logo_path: str | Path | None = None,
) -> Path:
    """
    Build a final branded MACReporting PDF.

    This service does not:
      - query the database
      - check roles
      - check whether a report is locked
      - update PDF metadata

    Those responsibilities belong in routes/reports.py.
    """
    report = report_data.get("report") or {}
    report_id = report.get("report_id")

    if not report_id:
        raise ValueError("report_data['report']['report_id'] is required.")

    GENERATED_PDF_DIR.mkdir(parents=True, exist_ok=True)

    report_title = report.get("report_title") or report.get("template_name") or "report"
    filename = _build_pdf_filename(report)
    output_path = GENERATED_PDF_DIR / filename

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.55 * inch,
        title=str(report_title),
        author="MACReporting",
    )

    styles = _build_styles()
    story: list[Any] = []

    actual_logo_path = _resolve_logo_path(logo_path)

    _add_header(
        story=story,
        report=report,
        styles=styles,
        logo_path=actual_logo_path,
    )

    _add_question_sections(
        story=story,
        questions=report_data.get("questions") or [],
        styles=styles,
    )

    _add_action_items(
        story,
        report_data.get("action_items") or [],
        styles,
    )

    _add_dates_to_remember(
        story,
        report_data.get("dates_to_remember") or [],
        styles,
    )

    _add_budget_items(
        story,
        report_data.get("budget_items") or [],
        styles,
    )

    story.append(Spacer(1, 0.18 * inch))
    story.append(
        Paragraph(
            f"Report ID: {_safe_text(report_id)}",
            styles["footer"],
        )
    )

    doc.build(story)
    return output_path

def _build_pdf_filename(report: dict[str, Any]) -> str:
    template_name = str(report.get("template_name") or "").lower()
    if "post" in template_name and "mortem" in template_name:
        event_name = "_".join(word.capitalize() 
            for word in _safe_filename(report.get("report_title") or "Event").split("_"))
        event_date = _filename_date(report.get("event_date"), include_day=True)
        return f"{event_name}_Post_Mortem_{event_date}.pdf"
    abbreviation = _safe_filename(report.get("committee_abbr") or "Committee").upper()
    reporting_period = _filename_date(report.get("reporting_period"), include_day=False)
    return f"{abbreviation}_Committee_Report_{reporting_period}.pdf"

def _filename_date(value: Any, include_day: bool) -> str:
    if value is None or value == "":
        return "Undated"
    parsed = None
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = value
    else:
        text = str(value).strip()
        for date_format in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                parsed = datetime.strptime(text[:19], date_format)
                break
            except ValueError:
                continue
    if parsed is None:
        return "Undated"
    return parsed.strftime("%m%d%Y" if include_day else "%m%Y")

def _resolve_logo_path(logo_path: str | Path | None) -> Path | None:
    if logo_path:
        path = Path(logo_path)
        return path if path.exists() else None
    if DEFAULT_LOGO_PATH.exists():
        return DEFAULT_LOGO_PATH
    assets_dir = PROJECT_ROOT / "react-frontend" / "src" / "assets"
    if assets_dir.exists():
        for path in assets_dir.iterdir():
            if path.is_file() and path.stem.lower() == "mac_logo" and path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
                return path
    return None

def _build_styles() -> dict[str, ParagraphStyle]:
    stylesheet = getSampleStyleSheet()

    return {
        "chapter": ParagraphStyle(
            "Chapter",
            parent=stylesheet["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=11.5,
            textColor=MAC_RED,
            alignment=TA_LEFT,
            spaceAfter=1,
        ),
        "sorority": ParagraphStyle(
            "Sorority",
            parent=stylesheet["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=12.5,
            textColor=MAC_RED_DARK,
            alignment=TA_LEFT,
            spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=stylesheet["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=MAC_RED_DARK,
            alignment=TA_CENTER,
            spaceAfter=5,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=stylesheet["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=MAC_TEXT,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=stylesheet["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=15,
            textColor=MAC_RED_DARK,
            spaceBefore=10,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "question": ParagraphStyle(
            "Question",
            parent=stylesheet["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=MAC_TEXT,
            spaceAfter=2,
        ),
        "answer": ParagraphStyle(
            "Answer",
            parent=stylesheet["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=MAC_TEXT,
            spaceAfter=7,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=stylesheet["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=WHITE,
            alignment=TA_LEFT,
        ),
        "table_label": ParagraphStyle(
            "TableLabel",
            parent=stylesheet["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10.5,
            textColor=MAC_TEXT,
            alignment=TA_LEFT,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=stylesheet["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=10.5,
            textColor=MAC_TEXT,
            alignment=TA_LEFT,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=stylesheet["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#666666"),
            alignment=TA_CENTER,
        ),
    }

def _add_header(
    story: list[Any],
    report: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    logo_path: str | Path | None,
) -> None:
    logo_flowable: Any = Spacer(1, 0.01 * inch)

    if logo_path:
        path = Path(logo_path)
        if path.exists():
            logo_flowable = Image(str(path))
            logo_flowable._restrictSize(1.35 * inch, 0.95 * inch)

    chapter_text = [
        Paragraph("Middletown (DE) Alumnae Chapter", styles["chapter"]),
        Paragraph("DELTA SIGMA THETA SORORITY, INC.", styles["sorority"]),
    ]

    header_table = Table(
        [[logo_flowable, chapter_text]],
        colWidths=[1.35 * inch, 5.55 * inch],
        hAlign="LEFT",
    )

    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LINEBELOW", (0, 0), (-1, -1), 1.1, MAC_RED_DARK),
            ]
        )
    )

    story.append(header_table)
    story.append(Spacer(1, 0.12 * inch))

    template_name = str(report.get("template_name") or "").strip().lower()

    if "post" in template_name and "mortem" in template_name:
        display_title = "Program Post-Mortem Report"
    elif "committee" in template_name:
        display_title = "Meeting Report"
    else:
        display_title = str(report.get("template_name") or "Report")

    story.append(Paragraph(_safe_text(display_title), styles["title"]))

    subtitle_parts = []
    committee_name = report.get("committee_name")

    if committee_name:
        subtitle_parts.append(_safe_text(committee_name))

    reporting_period = report.get("reporting_period")
    if reporting_period:
        subtitle_parts.append(_format_date(reporting_period, month_only=True))

    if subtitle_parts:
        story.append(
            Paragraph(
                " &bull; ".join(subtitle_parts),
                styles["subtitle"],
            )
        )

    detail_rows = []

    if report.get("report_title"):
        detail_rows.append(("Report Title", report.get("report_title")))

    if report.get("submitted_by"):
        detail_rows.append(("Submitted By", report.get("submitted_by")))

    if report.get("event_date"):
        detail_rows.append(
            ("Event Date", _format_date(report.get("event_date")))
        )

    if report.get("status"):
        detail_rows.append(
            (
                "Status",
                str(report.get("status")).replace("_", " ").title(),
            )
        )

    if detail_rows:
        table_data = [
            [
                Paragraph(_safe_text(label), styles["table_label"]),
                Paragraph(_safe_text(value), styles["table_cell"]),
            ]
            for label, value in detail_rows
        ]

        detail_table = Table(
            table_data,
            colWidths=[1.35 * inch, 5.55 * inch],
            hAlign="LEFT",
        )

        detail_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BACKGROUND", (0, 0), (0, -1), MAC_LIGHT_RED),
                    ("BOX", (0, 0), (-1, -1), 0.6, MAC_BORDER),
                    ("INNERGRID", (0, 0), (-1, -1), 0.35, MAC_BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )

        story.append(detail_table)
        story.append(Spacer(1, 0.12 * inch))

def _add_question_sections(
    story: list[Any],
    questions: list[dict[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> None:
    ordered_questions = sorted(
        questions,
        key=lambda item: int(
            item.get("display_order")
            or item.get("disp_ord")
            or 0
        ),
    )

    sections: dict[str, list[dict[str, Any]]] = {}

    for question in ordered_questions:
        section_name = question.get("section_name") or "Report Details"
        sections.setdefault(section_name, []).append(question)

    for section_name, section_questions in sections.items():
        story.append(
            Paragraph(
                _safe_text(section_name),
                styles["section"],
            )
        )

        if section_name in TABLE_SECTIONS:
            rows: list[list[Any]] = [
                [
                    Paragraph("Item", styles["table_header"]),
                    Paragraph("Response", styles["table_header"]),
                ]
            ]

            for question in section_questions:
                rows.append(
                    [
                        Paragraph(
                            _safe_text(
                                question.get("question_text")
                                or "Question"
                            ),
                            styles["table_label"],
                        ),
                        Paragraph(
                            _safe_text(
                                _format_answer(
                                    question.get("answer_value"),
                                    question.get("question_type"),
                                )
                            ),
                            styles["table_cell"],
                        ),
                    ]
                )

            story.append(
                _styled_table(
                    rows,
                    [2.45 * inch, 4.45 * inch],
                )
            )
            story.append(Spacer(1, 0.05 * inch))

        else:
            for question in section_questions:
                question_text = (
                    question.get("question_text")
                    or "Question"
                )

                answer_value = _format_answer(
                    question.get("answer_value"),
                    question.get("question_type"),
                )

                story.append(
                    KeepTogether(
                        [
                            Paragraph(
                                _safe_text(question_text),
                                styles["question"],
                            ),
                            Paragraph(
                                _safe_text(answer_value),
                                styles["answer"],
                            ),
                        ]
                    )
                )

def _add_action_items(
    story: list[Any],
    action_items: list[dict[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> None:
    rows = [
        [
            Paragraph("Action Item", styles["table_header"]),
            Paragraph("Owner", styles["table_header"]),
            Paragraph("Due Date", styles["table_header"]),
            Paragraph("Status", styles["table_header"]),
            Paragraph("Notes", styles["table_header"]),
        ]
    ]

    if action_items:
        for item in action_items:
            rows.append(
                [
                    Paragraph(_safe_text(item.get("action_item")), styles["table_cell"]),
                    Paragraph(_safe_text(item.get("owner")), styles["table_cell"]),
                    Paragraph(
                        _safe_text(
                            _format_date(
                                item.get("due_date")
                                or item.get("due_dt")
                            )
                        ),
                        styles["table_cell"],
                    ),
                    Paragraph(_safe_text(item.get("status")), styles["table_cell"]),
                    Paragraph(_safe_text(item.get("notes")), styles["table_cell"]),
                ]
            )
    else:
        rows.append(
            [
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
            ]
        )

    story.append(Paragraph("Action Items", styles["section"]))
    story.append(
        _styled_table(
            rows,
            [
                2.0 * inch,
                1.1 * inch,
                1.0 * inch,
                0.9 * inch,
                1.9 * inch,
            ],
        )
    )

def _add_dates_to_remember(
    story: list[Any],
    dates_to_remember: list[dict[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> None:
    rows = [
        [
            Paragraph("Date", styles["table_header"]),
            Paragraph("Item / Deadline", styles["table_header"]),
            Paragraph("Owner", styles["table_header"]),
        ]
    ]

    if dates_to_remember:
        for item in dates_to_remember:
            rows.append(
                [
                    Paragraph(
                        _safe_text(
                            _format_date(
                                item.get("reminder_date")
                            )
                        ),
                        styles["table_cell"],
                    ),
                    Paragraph(
                        _safe_text(item.get("item_deadline")),
                        styles["table_cell"],
                    ),
                    Paragraph(
                        _safe_text(item.get("owner")),
                        styles["table_cell"],
                    ),
                ]
            )
    else:
        rows.append(
            [
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
            ]
        )

    story.append(
        Paragraph(
            "Dates to Remember",
            styles["section"],
        )
    )

    story.append(
        _styled_table(
            rows,
            [
                1.2 * inch,
                4.0 * inch,
                1.7 * inch,
            ],
        )
    )

def _add_budget_items(
    story: list[Any],
    budget_items: list[dict[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> None:
    rows = [
        [
            Paragraph("Category", styles["table_header"]),
            Paragraph("Estimated", styles["table_header"]),
            Paragraph("Actual", styles["table_header"]),
            Paragraph("Notes", styles["table_header"]),
        ]
    ]

    estimated_total = Decimal("0")
    actual_total = Decimal("0")

    if budget_items:
        for item in budget_items:
            estimated = _to_decimal(item.get("estimated_cost"))
            actual = _to_decimal(item.get("actual_cost"))

            if estimated is not None:
                estimated_total += estimated

            if actual is not None:
                actual_total += actual

            rows.append(
                [
                    Paragraph(_safe_text(item.get("category")), styles["table_cell"]),
                    Paragraph(_safe_text(_format_currency(estimated)), styles["table_cell"]),
                    Paragraph(_safe_text(_format_currency(actual)), styles["table_cell"]),
                    Paragraph(_safe_text(item.get("notes")), styles["table_cell"]),
                ]
            )
    else:
        rows.append(
            [
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
                Paragraph("—", styles["table_cell"]),
            ]
        )

    rows.append(
        [
            Paragraph("Total", styles["table_label"]),
            Paragraph(
                _safe_text(_format_currency(estimated_total)),
                styles["table_label"],
            ),
            Paragraph(
                _safe_text(_format_currency(actual_total)),
                styles["table_label"],
            ),
            Paragraph("", styles["table_cell"]),
        ]
    )

    story.append(Paragraph("Budget", styles["section"]))
    story.append(
        _styled_table(
            rows,
            [
                1.65 * inch,
                1.25 * inch,
                1.25 * inch,
                2.75 * inch,
            ],
            total_row=True,
        )
    )

def _styled_table(
    rows: list[list[Any]],
    col_widths: list[float],
    total_row: bool = False,
) -> Table:
    table = Table(
        rows,
        colWidths=col_widths,
        repeatRows=1,
        hAlign="LEFT",
    )

    commands: list[tuple[Any, ...]] = [
        ("BACKGROUND", (0, 0), (-1, 0), MAC_RED_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.8, MAC_RED_DARK),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, MAC_BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]

    if len(rows) > 1:
        for row_index in range(1, len(rows)):
            if row_index % 2 == 0:
                commands.append(
                    (
                        "BACKGROUND",
                        (0, row_index),
                        (-1, row_index),
                        MAC_LIGHT_GRAY,
                    )
                )

    if total_row and len(rows) > 1:
        commands.extend(
            [
                ("BACKGROUND", (0, -1), (-1, -1), MAC_LIGHT_RED),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, MAC_RED_DARK),
            ]
        )

    table.setStyle(TableStyle(commands))
    return table

def _format_answer(
    value: Any,
    question_type: str | None,
) -> str:
    if value is None or str(value).strip() == "":
        return "—"

    value_text = str(value).strip()
    question_type = (question_type or "").strip().lower()

    if question_type == "currency":
        amount = _to_decimal(value_text)
        return _format_currency(amount)

    if question_type == "date":
        return _format_date(value_text)

    if question_type == "checkbox":
        normalized = value_text.lower()

        if normalized in {"true", "1", "yes", "y", "on"}:
            return "Yes"

        if normalized in {"false", "0", "no", "n", "off"}:
            return "No"

    return value_text

def _format_currency(value: Decimal | None) -> str:
    if value is None:
        return "—"

    return f"${value:,.2f}"

def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    text = text.replace("$", "").replace(",", "")

    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        return None

def _format_date(
    value: Any,
    month_only: bool = False,
) -> str:
    if value is None or value == "":
        return "—"

    parsed: date | datetime | None = None

    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = value
    else:
        text = str(value).strip()

        for date_format in (
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
        ):
            try:
                parsed = datetime.strptime(
                    text[:19],
                    date_format,
                )
                break
            except ValueError:
                continue

        if parsed is None:
            return text

    if month_only:
        return parsed.strftime("%B %Y")

    return parsed.strftime("%B %d, %Y").replace(" 0", " ")

def _safe_text(value: Any) -> str:
    if value is None:
        return "—"

    text = str(value).strip()

    if not text:
        return "—"

    return escape(text).replace("\n", "<br/>")

def _safe_filename(value: Any) -> str:
    text = str(value or "report").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = text.strip("_")
    return text or "report"
