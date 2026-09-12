import { useEffect, useMemo, useState } from "react";
import { FaHome, FaFileAlt, FaSearch, FaChartBar, FaQuestionCircle, FaSignOutAlt, FaPlus, FaEdit, FaEye } from "react-icons/fa";
import macLogo from "../assets/MAC_LOGO.png";

const API_BASE = "http://127.0.0.1:5001";

function ReportOptions({ selectedReportType, onCreateNew, onOpenExisting, onBack, onReportsSearch, onLogout }) {
  const isCommittee = selectedReportType === "committee";
  const reportName = isCommittee ? "Committee Report" : "Post-Mortem Report";
  const templateId = isCommittee ? 1 : 2;
  const [reports, setReports] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setErrorMessage("");
        const [reportResponse, committeeResponse] = await Promise.all([
          fetch(`${API_BASE}/reports?report_template_id=${templateId}`),
          fetch(`${API_BASE}/committees`)
        ]);
        if (!reportResponse.ok || !committeeResponse.ok) throw new Error("Unable to load existing reports.");
        setReports(await reportResponse.json());
        setCommittees(await committeeResponse.json());
      } catch (error) {
        console.error("Error loading reports:", error);
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [templateId]);

  const periods = useMemo(() => {
    const values = reports.map(report => report.reporting_period).filter(Boolean);
    return [...new Set(values)].sort((a, b) => new Date(b) - new Date(a));
  }, [reports]);

  const filteredReports = useMemo(() => reports.filter(report => {
    const committeeMatches = !committeeFilter || String(report.committee_id) === committeeFilter;
    const periodMatches = !periodFilter || report.reporting_period === periodFilter;
    return committeeMatches && periodMatches;
  }), [reports, committeeFilter, periodFilter]);

  function formatPeriod(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US");
  }

  function displayStatus(status) {
    return (status || "").replaceAll("_", " ").toUpperCase();
  }

  function isEditable(status) {
    return status === "draft" || status === "returned_for_changes";
  }

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src={macLogo} alt="MAC Logo" className="chapter-logo" /><h1>MACReporting</h1></div>

        <nav className="sidebar-nav">
          <button className="nav-item" onClick={onBack}><span><FaHome /></span>Home</button>
          <button className="nav-item" onClick={onReportsSearch}><span><FaSearch /></span>Reports Search</button>
          <button className="nav-item"><span><FaChartBar /></span>Dashboard (Phase 2)</button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item"><span><FaQuestionCircle /></span>Help / Support</button>
          <button className="nav-item" onClick={onLogout}><span><FaSignOutAlt /></span>Log Out</button>
        </div>
      </aside>

      <main className="reports-main">
        <div className="reports-page-header">
          <div><h2>Reports</h2><p>View and manage chapter reports.</p></div>
          <button className="create-report-button" onClick={onCreateNew}><FaPlus /> Create New Report</button>
        </div>

        <section className="report-filters">
          <div className="filter-group">
            <label>Committee</label>
            <select value={committeeFilter} onChange={event => setCommitteeFilter(event.target.value)}>
              <option value="">All Committees</option>
              {committees.map(committee => <option key={committee.committee_id} value={committee.committee_id}>{committee.committee_name}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>{isCommittee ? "Reporting Period" : "Event Month"}</label>
            <select value={periodFilter} onChange={event => setPeriodFilter(event.target.value)}>
              <option value="">All Periods</option>
              {periods.map(period => <option key={period} value={period}>{formatPeriod(period)}</option>)}
            </select>
          </div>

          <button className="filter-button" onClick={() => { setCommitteeFilter(""); setPeriodFilter(""); }}>Clear Filters</button>
        </section>

        <section className="existing-reports">
          <h3>Existing {reportName}s</h3>
          {errorMessage && <div className="form-validation-message">{errorMessage}</div>}

          {loading ? <p>Loading reports...</p> : (
            <div className="reports-table">
              <div className="reports-table-header"><span>Report Title</span><span>Period</span><span>Status</span><span>Last Updated</span><span>Actions</span></div>

              {filteredReports.length === 0 ? (
                <div className="reports-empty-row">No reports found.</div>
              ) : filteredReports.map(report => (
                <div className="reports-table-row" key={report.report_id}>
                  <span>{report.report_title}</span>
                  <span>{formatPeriod(report.reporting_period)}</span>
                  <span><span className={`status-badge ${report.status}`}>{displayStatus(report.status)}</span></span>
                  <span>{formatDate(report.updated_at)}</span>
                  <span className="report-actions">
                    <button title={isEditable(report.status) ? "Edit" : "View"} onClick={() => onOpenExisting(report.report_id)}>
                      {isEditable(report.status) ? <FaEdit /> : <FaEye />}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="reports-table-footer">
            <p>Showing {filteredReports.length} of {reports.length} reports</p>
            <div className="pagination"><button disabled>‹</button><button className="active">1</button><button disabled>›</button></div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReportOptions;