import { useEffect, useState } from "react";
import macLogo from "../assets/MAC_LOGO.png";
import { FaHome, FaFileAlt, FaClipboardCheck, FaEye, FaFilePdf, FaQuestionCircle, FaSignOutAlt } from "react-icons/fa";

const API_BASE = "http://127.0.0.1:5001";

function Approvals({ onHome, onOpenReport, onOpenLockReport }) {
  const [users, setUsers] = useState([]);
  const [viewingAsUserId, setViewingAsUserId] = useState("");
  const [awaitingAction, setAwaitingAction] = useState([]);
  const [lockedReports, setLockedReports] = useState([]);
  const [canGeneratePdf, setCanGeneratePdf] = useState(false);
  const [generatingReportId, setGeneratingReportId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/users`)
      .then(response => response.json())
      .then(data => setUsers(data))
      .catch(error => {
        console.error("Error loading users:", error);
        setErrorMessage("Unable to load demo users.");
      });
  }, []);

  useEffect(() => {
    if (!viewingAsUserId) {
      setAwaitingAction([]);
      setLockedReports([]);
      setCanGeneratePdf(false);
      return;
    }

    async function loadQueues() {
      try {
        setLoading(true);
        setErrorMessage("");
        const [approvalsResponse, lockResponse, reportsResponse] = await Promise.all([
          fetch(`${API_BASE}/approvals?user_id=${viewingAsUserId}`),
          fetch(`${API_BASE}/reports/awaiting-lock?user_id=${viewingAsUserId}`),
          fetch(`${API_BASE}/reports`)
        ]);
        const approvalsData = await approvalsResponse.json();
        const lockData = await lockResponse.json();
        const reportsData = await reportsResponse.json();

        if (!approvalsResponse.ok) throw new Error(approvalsData.error || "Unable to load approvals.");
        if (!lockResponse.ok) throw new Error(lockData.error || "Unable to load reports awaiting lock.");
        if (!reportsResponse.ok) throw new Error(reportsData.error || "Unable to load reports.");

        const userId = Number(viewingAsUserId);
        const returnedReports = reportsData.filter(report =>
          report.status === "returned_for_changes" && Number(report.created_by_user_id) === userId
        );
        const submittedReports = approvalsData.approvals || [];
        const approvedReports = lockData.awaiting_lock || [];
        const combined = [...returnedReports, ...submittedReports, ...approvedReports];
        const uniqueReports = Array.from(new Map(combined.map(report => [report.report_id, report])).values());

        setAwaitingAction(uniqueReports);
        setLockedReports(reportsData.filter(report => report.locked === true || report.status === "locked"));
        setCanGeneratePdf(Boolean(lockData.can_finalize));
      } catch (error) {
        console.error("Error loading approval queues:", error);
        setErrorMessage(error.message);
        setAwaitingAction([]);
        setLockedReports([]);
        setCanGeneratePdf(false);
      } finally {
        setLoading(false);
      }
    }

    loadQueues();
  }, [viewingAsUserId]);

  function formatPeriod(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    });
  }

  function displayStatus(status) {
    return (status || "").replaceAll("_", " ").toUpperCase();
  }

  function openReport(report) {
    const userId = Number(viewingAsUserId);
    if (report.status === "approved" || report.status === "locked" || report.locked) {
      onOpenLockReport(report, userId);
      return;
    }
    onOpenReport(report, userId);
  }

  function safeFilenamePart(value) {
    return String(value || "").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function filenameDate(value, includeDay = false) {
    const datePart = String(value || "").slice(0, 10);
    const [year, month, day] = datePart.split("-");
    if (!year || !month) return "Undated";
    return includeDay && day ? `${month}${day}${year}` : `${month}${year}`;
  }

  function getPdfFilename(report) {
    const templateName = String(report.report_template_name || report.template_name || "").toLowerCase();
    const isPostMortem = templateName.includes("post") && templateName.includes("mortem");

    if (isPostMortem) {
      const eventName = safeFilenamePart(report.report_title) || "Event";
      const formattedEventName = eventName.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("_");
      return `${formattedEventName}_Post_Mortem_${filenameDate(report.event_date, true)}.pdf`;
    }

    const abbreviation = safeFilenamePart(report.comm_abbr || report.committee_abbr).toUpperCase() || "Committee";
    return `${abbreviation}_Committee_Report_${filenameDate(report.reporting_period)}.pdf`;
  }

  async function generatePdf(report) {
    try {
      setGeneratingReportId(report.report_id);
      setErrorMessage("");
      const response = await fetch(`${API_BASE}/reports/${report.report_id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changed_by_user_id: Number(viewingAsUserId) })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getPdfFilename(report);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setErrorMessage(error.message);
    } finally {
      setGeneratingReportId(null);
    }
  }

  function ReportTable({ reports, emptyMessage, showGeneratePdf = false }) {
    return (
      <div className="reports-table">
        <div className="reports-table-header">
          <span>Report Title</span>
          <span>Committee</span>
          <span>Period</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {reports.length === 0 ? (
          <div className="reports-empty-row">{emptyMessage}</div>
        ) : (
          reports.map(report => (
            <div className="reports-table-row" key={report.report_id}>
              <span>{report.report_title}</span>
              <span>{report.committee_name}</span>
              <span>{formatPeriod(report.reporting_period)}</span>
              <span><span className={`status-badge ${report.status}`}>{displayStatus(report.status)}</span></span>
              <span className="report-actions">
                <button title="View report" onClick={() => openReport(report)}><FaEye /></button>
                {showGeneratePdf && canGeneratePdf && (
                  <button
                    title="Generate PDF"
                    onClick={() => generatePdf(report)}
                    disabled={generatingReportId === report.report_id}
                  >
                    <FaFilePdf />
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src={macLogo} alt="MAC Logo" className="chapter-logo" /><h1>MACReporting</h1></div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={onHome}><span><FaHome /></span>Home</button>
          <button className="nav-item"><span><FaFileAlt /></span>Reports</button>
          <button className="nav-item active"><span><FaClipboardCheck /></span>Approvals</button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item"><span><FaQuestionCircle /></span>Help / Support</button>
          <button className="nav-item"><span><FaSignOutAlt /></span>Log Out</button>
        </div>
      </aside>

      <main className="reports-main">
        <div className="reports-page-header">
          <div><h2>Approvals</h2><p>Review and finalize chapter reports.</p></div>
        </div>

        <section className="report-filters">
          <div className="filter-group">
            <label>Viewing As</label>
            <select value={viewingAsUserId} onChange={event => setViewingAsUserId(event.target.value)}>
              <option value="">Select demo user</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>{`${user.first_name || ""} ${user.last_name || ""}`.trim()}</option>
              ))}
            </select>
          </div>
          <p className="approval-demo-note">Demo user only — this will be replaced by the logged-in user in production.</p>
        </section>

        {errorMessage && <div className="form-validation-message">{errorMessage}</div>}

        <section className="existing-reports">
          <h3>Awaiting My Action</h3>
          {!viewingAsUserId ? (
            <div className="reports-empty-row">Select a demo user to view their action queue.</div>
          ) : loading ? (
            <p>Loading reports...</p>
          ) : (
            <>
              <ReportTable reports={awaitingAction} emptyMessage="No reports are currently awaiting this user's action." />
              <div className="reports-table-footer"><p>{awaitingAction.length} report{awaitingAction.length === 1 ? "" : "s"} awaiting action</p></div>
            </>
          )}
        </section>

        {viewingAsUserId && !loading && (
          <section className="existing-reports">
            <h3>Locked Reports</h3>
            <ReportTable reports={lockedReports} emptyMessage="No locked reports are currently available." showGeneratePdf />
            <div className="reports-table-footer"><p>{lockedReports.length} locked report{lockedReports.length === 1 ? "" : "s"}</p></div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Approvals;