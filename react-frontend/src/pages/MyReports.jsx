import { useEffect, useState } from "react";
import { FaHome, FaFileAlt, FaClipboardCheck, FaSearch, FaChartBar, FaQuestionCircle, FaSignOutAlt, FaEye } from "react-icons/fa";
import macLogo from "../assets/MAC_LOGO.png";

function MyReports({ currentUserId, onHome, onOpenReport, onApprovals, onLogout }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5001/reports")
      .then(response => response.json())
      .then(data => {
        setReports(data.filter(report => String(report.created_by_user_id) === String(currentUserId)));
        setLoading(false);
      })
      .catch(error => {
        console.error("Unable to load reports:", error);
        setLoading(false);
      });
  }, [currentUserId]);

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function formatStatus(status) {
    return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  }

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={macLogo} alt="MAC Logo" className="chapter-logo" />
          <h1>MACReporting</h1>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item" onClick={onHome}><span><FaHome /></span>Home</button>
          <button className="nav-item active"><span><FaFileAlt /></span>My Reports</button>
          <button className="nav-item" onClick={onApprovals}><span><FaClipboardCheck /></span>Approvals</button>
          <button className="nav-item"><span><FaSearch /></span>Reports (Search)</button>
          <button className="nav-item"><span><FaChartBar /></span>Dashboard (Phase 2)</button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item"><span><FaQuestionCircle /></span>Help / Support</button>
          <button className="nav-item" onClick={onLogout}><span><FaSignOutAlt /></span>Log Out</button>
        </div>
      </aside>

      <main className="home-main">
        <section className="home-welcome">
          <h2>My Reports</h2>
          <p>View and continue reports you have created.</p>
        </section>

        <section className="reports-table my-reports-table">
          <div className="reports-table-header">
            <span>Report</span>
            <span>Type</span>
            <span>Committee</span>
            <span>Date / Period</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {loading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p>You have not created any reports yet.</p>
          ) : (
            reports.map(report => (
              <div className="reports-table-row" key={report.report_id}>
                <span>{report.report_title}</span>
                <span>{report.report_template_name}</span>
                <span>{report.committee_name}</span>
                <span>{formatDate(report.event_date || report.reporting_period)}</span>
                <span>{formatStatus(report.status)}</span>
                <span>
                  <button className="icon-button" title="Open Report" onClick={() => onOpenReport(report)}>
                    <FaEye />
                  </button>
                </span>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default MyReports;