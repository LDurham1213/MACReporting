import { useEffect, useState } from "react";

function AttachmentSection({ reportId, currentUserId, isReadOnly }) {
  const [attachments, setAttachments] = useState([]);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [includeInPdf, setIncludeInPdf] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (reportId) loadAttachments();
  }, [reportId]);

  async function loadAttachments() {
    try {
      const response = await fetch(`http://localhost:5001/reports/${reportId}/attachments`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load attachments.");
      setAttachments(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadAttachment(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!reportId) {
      setError("Save the report before adding attachments.");
      return;
    }

    if (!file) {
      setError("Select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploaded_by", currentUserId);
    formData.append("description", description);
    formData.append("include_in_pdf", String(includeInPdf));

    try {
      setUploading(true);
      const response = await fetch(`http://localhost:5001/reports/${reportId}/attachments`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to upload attachment.");

      setAttachments(current => [data, ...current]);
      setFile(null);
      setDescription("");
      setIncludeInPdf(false);
      setMessage("Attachment uploaded successfully.");

      const input = document.getElementById("report-attachment-file");
      if (input) input.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function updateIncludeInPdf(attachment, checked) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(`http://localhost:5001/attachments/${attachment.attachment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include_in_pdf: checked })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update attachment.");

      setAttachments(current =>
        current.map(item => item.attachment_id === data.attachment_id ? data : item)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAttachment(attachmentId) {
    setMessage("");
    setError("");

    if (!window.confirm("Remove this attachment from the report?")) return;

    try {
      const response = await fetch(`http://localhost:5001/attachments/${attachmentId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to remove attachment.");

      setAttachments(current => current.filter(item => item.attachment_id !== attachmentId));
      setMessage("Attachment removed.");
    } catch (err) {
      setError(err.message);
    }
  }

  function downloadAttachment(attachmentId) {
    window.open(`http://localhost:5001/attachments/${attachmentId}/download`, "_blank");
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="attachment-section">
      <h2>ATTACHMENTS</h2>
      <p>Add supporting documents, images, receipts, flyers, or other files related to this report.</p>

      {!reportId && !isReadOnly && (
        <div className="attachment-notice">Save the report before adding attachments.</div>
      )}

      {error && <div className="validation-message">{error}</div>}
      {message && <div className="save-message">{message}</div>}

      {!isReadOnly && reportId && (
        <form className="entry-form" onSubmit={uploadAttachment}>
          <div className="entry-form-group full-width">
            <label>File</label>
            <input id="report-attachment-file" type="file" onChange={event => setFile(event.target.files?.[0] || null)} />
          </div>

          <div className="entry-form-group full-width">
            <label>Description</label>
            <input type="text" value={description} onChange={event => setDescription(event.target.value)} placeholder="Optional description" />
          </div>

          <div className="attachment-pdf-option">
            <label>
              <input type="checkbox" checked={includeInPdf} onChange={event => setIncludeInPdf(event.target.checked)} />
              Include in PDF
            </label>
          </div>

          <button type="submit" className="primary-button" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Attachment"}
          </button>
        </form>
      )}

      <div className="attachment-list">
        <h3>Uploaded Files</h3>

        {!reportId || attachments.length === 0 ? (
          <p>No attachments have been added.</p>
        ) : (
          attachments.map(attachment => (
            <div className="attachment-item" key={attachment.attachment_id}>
              <div className="attachment-info">
                <strong>{attachment.original_filename}</strong>
                <span>{formatFileSize(attachment.file_size)}</span>
                {attachment.description && <span>{attachment.description}</span>}
              </div>

              <div className="attachment-actions">
                {!isReadOnly && (
                  <label className="attachment-include-option">
                    <input
                      type="checkbox"
                      checked={attachment.include_in_pdf}
                      onChange={event => updateIncludeInPdf(attachment, event.target.checked)}
                    />
                    Include in PDF
                  </label>
                )}

                {isReadOnly && attachment.include_in_pdf && <span>Include in PDF</span>}

                <button type="button" onClick={() => downloadAttachment(attachment.attachment_id)}>Download</button>

                {!isReadOnly && (
                  <button type="button" onClick={() => removeAttachment(attachment.attachment_id)}>Remove</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AttachmentSection;