from pathlib import Path
from uuid import uuid4

from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename

from db import get_db_session
from models import Attachment, Report

attachments_bp = Blueprint("attachments", __name__)

UPLOAD_DIR = Path("uploads/attachments")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

EDITABLE_STATUSES = ("draft", "returned_for_changes")

def serialize_attachment(attachment):
    return {
        "attachment_id": attachment.attachment_id,
        "report_id": attachment.report_id,
        "uploaded_by": attachment.uploaded_by,
        "original_filename": attachment.orig_filenm,
        "mime_type": attachment.mime_type,
        "file_size": attachment.file_size,
        "description": attachment.description,
        "include_in_pdf": attachment.inc_in_pdf,
        "uploaded_at": attachment.upload_dt,
        "active": attachment.active,
    }

def get_report_edit_error(session, report_id):
    report = session.get(Report, report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    if report.locked or report.status not in EDITABLE_STATUSES:
        return jsonify({"error": "Attachments can only be changed on Draft or Returned for Changes reports"}), 409
    return None

@attachments_bp.route("/reports/<int:report_id>/attachments", methods=["GET"])
def get_attachments(report_id):
    with get_db_session() as session:
        report = session.get(Report, report_id)
        if not report:
            return jsonify({"error": "Report not found"}), 404

        attachments = (
            session.query(Attachment)
            .filter(Attachment.report_id == report_id, Attachment.active.is_(True))
            .order_by(Attachment.upload_dt.desc())
            .all()
        )
        return jsonify([serialize_attachment(attachment) for attachment in attachments]), 200

@attachments_bp.route("/reports/<int:report_id>/attachments", methods=["POST"])
def upload_attachment(report_id):
    uploaded_by = request.form.get("uploaded_by", type=int)
    description = request.form.get("description")
    include_in_pdf = request.form.get("include_in_pdf", "false").lower() == "true"
    file = request.files.get("file")

    if not file or not file.filename:
        return jsonify({"error": "A file is required"}), 400

    if not uploaded_by:
        return jsonify({"error": "uploaded_by is required"}), 400

    original_filename = secure_filename(file.filename)
    if not original_filename:
        return jsonify({"error": "Invalid filename"}), 400

    suffix = Path(original_filename).suffix
    storage_filename = f"{uuid4().hex}{suffix}"
    storage_path = UPLOAD_DIR / storage_filename

    with get_db_session() as session:
        edit_error = get_report_edit_error(session, report_id)
        if edit_error:
            return edit_error

        file.save(storage_path)

        try:
            attachment = Attachment(
                report_id=report_id,
                uploaded_by=uploaded_by,
                orig_filenm=original_filename,
                storage_key=str(storage_path),
                mime_type=file.mimetype or "application/octet-stream",
                file_size=storage_path.stat().st_size,
                description=description,
                inc_in_pdf=include_in_pdf,
            )
            session.add(attachment)
            session.commit()
            session.refresh(attachment)
            return jsonify(serialize_attachment(attachment)), 201
        except Exception:
            session.rollback()
            if storage_path.exists():
                storage_path.unlink()
            raise

@attachments_bp.route("/attachments/<int:attachment_id>/download", methods=["GET"])
def download_attachment(attachment_id):
    with get_db_session() as session:
        attachment = session.get(Attachment, attachment_id)

        if not attachment or not attachment.active:
            return jsonify({"error": "Attachment not found"}), 404

        file_path = Path(attachment.storage_key)
        if not file_path.exists():
            return jsonify({"error": "Attachment file not found"}), 404

        return send_file(
            file_path,
            mimetype=attachment.mime_type,
            as_attachment=True,
            download_name=attachment.orig_filenm,
        )

@attachments_bp.route("/attachments/<int:attachment_id>", methods=["PATCH"])
def update_attachment(attachment_id):
    data = request.get_json(silent=True) or {}

    with get_db_session() as session:
        attachment = session.get(Attachment, attachment_id)
        if not attachment or not attachment.active:
            return jsonify({"error": "Attachment not found"}), 404

        edit_error = get_report_edit_error(session, attachment.report_id)
        if edit_error:
            return edit_error

        if "description" in data:
            attachment.description = data["description"]

        if "include_in_pdf" in data:
            attachment.inc_in_pdf = bool(data["include_in_pdf"])

        session.commit()
        session.refresh(attachment)
        return jsonify(serialize_attachment(attachment)), 200

@attachments_bp.route("/attachments/<int:attachment_id>", methods=["DELETE"])
def delete_attachment(attachment_id):
    with get_db_session() as session:
        attachment = session.get(Attachment, attachment_id)
        if not attachment or not attachment.active:
            return jsonify({"error": "Attachment not found"}), 404

        edit_error = get_report_edit_error(session, attachment.report_id)
        if edit_error:
            return edit_error

        attachment.active = False
        session.commit()
        return jsonify({"message": "Attachment removed"}), 200