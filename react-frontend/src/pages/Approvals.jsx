import { useEffect, useState } from "react";
import { FaHome, FaFileAlt, FaClipboardCheck, FaEye, FaQuestionCircle, FaSignOutAlt } from "react-icons/fa";

const API_BASE = "http://127.0.0.1:5001";

function Approvals({ onHome, onOpenReport, onOpenLockReport }) {
  const [users, setUsers] = useState([]);
  const [viewingAsUserId, setViewingAsUserId] = useState("");
  const [approvals, setApprovals] = useState([]);
  const [awaitingLock, setAwaitingLock] = useState([]);
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
      setApprovals([]);
      setAwaitingLock([]);
      return;
    }

    async function loadQueues() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [approvalsResponse, lockResponse] = await Promise.all([
          fetch(`${API_BASE}/approvals?user_id=${viewingAsUserId}`),
          fetch(`${API_BASE}/reports/awaiting-lock?user_id=${viewingAsUserId}`)
        ]);

        const approvalsData = await approvalsResponse.json();
        const lockData = await lockResponse.json();

        if (!approvalsResponse.ok) {
          throw new Error(approvalsData.error || "Unable to load approvals.");
        }

        if (!lockResponse.ok) {
          throw new Error(lockData.error || "Unable to load reports awaiting lock.");
        }

        setApprovals(approvalsData.approvals || []);
        setAwaitingLock(lockData.awaiting_lock || []);
      } catch (error) {
        console.error("Error loading approval queues:", error);
        setErrorMessage(error.message);
        setApprovals([]);
        setAwaitingLock([]);
      } finally {
        setLoading(false);
      }
    }

    loadQueues();
  }, [viewingAsUserId]);

  function formatPeriod(value) {
    if (!value) return "—";
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC"
        });
  }

  function displayStatus(status) {
    return (status || "").replaceAll("_", " ").toUpperCase();
  }

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="chapter-logo-placeholder">Organization Logo</div>
          <h1>MACReporting</h1>
        </div>

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
          <div>
            <h2>Approvals</h2>
            <p>Review and finalize chapter reports.</p>
          </div>
        </div>

        <section className="report-filters">
          <div className="filter-group">
            <label>Viewing As</label>
            <select
              value={viewingAsUserId}
              onChange={event => setViewingAsUserId(event.target.value)}
            >
              <option value="">Select demo user</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                </option>
              ))}
            </select>
          </div>

          <p className="approval-demo-note">
            Demo user only — this will be replaced by the logged-in user in production.
          </p>
        </section>

        {errorMessage && (
          <div className="form-validation-message">{errorMessage}</div>
        )}

        <section className="existing-reports">
          <h3>Awaiting My Review</h3>

          {!viewingAsUserId ? (
            <div className="reports-empty-row">
              Select a demo user to view their approval queue.
            </div>
          ) : loading ? (
            <p>Loading approvals...</p>
          ) : (
            <div className="reports-table">
              <div className="reports-table-header">
                <span>Report Title</span>
                <span>Committee</span>
                <span>Period</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              {approvals.length === 0 ? (
                <div className="reports-empty-row">
                  No reports are currently awaiting this user's review.
                </div>
              ) : (
                approvals.map(report => (
                  <div className="reports-table-row" key={report.report_id}>
                    <span>{report.report_title}</span>
                    <span>{report.committee_name}</span>
                    <span>{formatPeriod(report.reporting_period)}</span>
                    <span>
                      <span className={`status-badge ${report.status}`}>
                        {displayStatus(report.status)}
                      </span>
                    </span>
                    <span className="report-actions">
                      <button
                        title="Review report"
                        onClick={() => onOpenReport(report, Number(viewingAsUserId))}
                      >
                        <FaEye />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {viewingAsUserId && !loading && (
            <div className="reports-table-footer">
              <p>{approvals.length} report{approvals.length === 1 ? "" : "s"} awaiting review</p>
            </div>
          )}
        </section>

        {viewingAsUserId && !loading && awaitingLock.length > 0 && (
          <section className="existing-reports">
            <h3>Approved Reports Awaiting Lock</h3>

            <div className="reports-table">
              <div className="reports-table-header">
                <span>Report Title</span>
                <span>Committee</span>
                <span>Period</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              {awaitingLock.map(report => (
                <div className="reports-table-row" key={report.report_id}>
                  <span>{report.report_title}</span>
                  <span>{report.committee_name}</span>
                  <span>{formatPeriod(report.reporting_period)}</span>
                  <span>
                    <span className={`status-badge ${report.status}`}>
                      {displayStatus(report.status)}
                    </span>
                  </span>
                  <span className="report-actions">
                    <button
                      title="View report for finalization"
                      onClick={() => onOpenLockReport(report, Number(viewingAsUserId))}
                    >
                      <FaEye />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div className="reports-table-footer">
              <p>{awaitingLock.length} report{awaitingLock.length === 1 ? "" : "s"} awaiting lock</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Approvals;