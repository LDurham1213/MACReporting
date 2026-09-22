import { useEffect, useMemo, useState } from "react";
import {
  FaHome,
  FaFileAlt,
  FaSearch,
  FaChartBar,
  FaEye,
  FaEdit,
  FaQuestionCircle,
  FaSignOutAlt
} from "react-icons/fa";
import macLogo from "../assets/MAC_LOGO.png";

const API_BASE = "http://127.0.0.1:5001";

function ReportsSearch({ onHome, onReports, onDashboard, onOpenReport, onLogout }) {
  const [reports, setReports] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSearchData() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [reportsResponse, committeesResponse] = await Promise.all([
          fetch(`${API_BASE}/reports`),
          fetch(`${API_BASE}/committees`)
        ]);

        const reportsData = await reportsResponse.json();
        const committeesData = await committeesResponse.json();

        if (!reportsResponse.ok) throw new Error(reportsData.error || "Unable to load reports.");
        if (!committeesResponse.ok) throw new Error(committeesData.error || "Unable to load committees.");

        setReports(reportsData);
        setCommittees(committeesData);
      } catch (error) {
        console.error("Error loading report search:", error);
        setErrorMessage(error.message);
        setReports([]);
        setCommittees([]);
      } finally {
        setLoading(false);
      }
    }

    loadSearchData();
  }, []);

  const statuses = useMemo(() => {
    return [...new Set(reports.map(report => report.status).filter(Boolean))].sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return reports.filter(report => {
      const titleMatches = !keyword || String(report.report_title || "").toLowerCase().includes(keyword);
      const typeMatches = !reportTypeFilter || String(report.report_template_id) === reportTypeFilter;
      const committeeMatches = !committeeFilter || String(report.committee_id) === committeeFilter;
      const statusMatches = !statusFilter || report.status === statusFilter;
      return titleMatches && typeMatches && committeeMatches && statusMatches;
    });
  }, [reports, searchText, reportTypeFilter, committeeFilter, statusFilter]);

  function reportTypeName(report) {
    return report.report_template_name || (Number(report.report_template_id) === 1 ? "Committee Report" : "Post-Mortem Report");
  }

  function formatPeriod(report) {
    const value = Number(report.report_template_id) === 2 ? report.event_date : report.reporting_period;
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    if (Number(report.report_template_id) === 2) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    }

    return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function displayStatus(status) {
    return (status || "").replaceAll("_", " ").toUpperCase();
  }

  function isEditable(status) {
    return status === "draft" || status === "returned_for_changes";
  }

  function clearFilters() {
    setSearchText("");
    setReportTypeFilter("");
    setCommitteeFilter("");
    setStatusFilter("");
  }

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src={macLogo} alt="MAC Logo" className="chapter-logo" /><h1>MACReporting</h1></div>

        <nav className="sidebar-nav"><button className="nav-item" onClick={onHome}><span><FaHome /></span>Home</button>
          <button className="nav-item" onClick={onReports}><span><FaFileAlt /></span>Reports</button>
          <button className="nav-item active"><span><FaSearch /></span>Reports Search</button>
          <button className="nav-item" onClick={onDashboard}><span><FaChartBar /></span>Dashboard</button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item"><span><FaQuestionCircle /></span>Help / Support</button>
          <button className="nav-item" onClick={onLogout}><span><FaSignOutAlt /></span>Log Out</button>
        </div>
      </aside>

      <main className="reports-main">
        <div className="reports-page-header">
          <div><h2>Reports Search</h2><p>Search Committee and Post-Mortem reports.</p></div>
        </div>

        {errorMessage && <div className="form-validation-message">{errorMessage}</div>}

        <section className="report-filters">
          <div className="filter-group">
            <label>Report Title</label>
            <input type="search" value={searchText} placeholder="Search by title..." onChange={event => setSearchText(event.target.value)} />
          </div>

          <div className="filter-group">
            <label>Report Type</label>
            <select value={reportTypeFilter} onChange={event => setReportTypeFilter(event.target.value)}>
              <option value="">All Report Types</option>
              <option value="1">Committee Report</option>
              <option value="2">Post-Mortem Report</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Committee</label>
            <select value={committeeFilter} onChange={event => setCommitteeFilter(event.target.value)}>
              <option value="">All Committees</option>
              {committees.map(committee => <option key={committee.committee_id} value={committee.committee_id}>{committee.committee_name}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">All Statuses</option>
              {statuses.map(status => <option key={status} value={status}>{displayStatus(status)}</option>)}
            </select>
          </div>

          <button className="filter-button" onClick={clearFilters}>Clear Filters</button>
        </section>

        <section className="existing-reports">
          <h3>Search Results</h3>

          {loading ? (
            <p>Loading reports...</p>
          ) : (
            <div className="reports-table locked-reports-table">
              <div className="reports-table-header">
                <span>Report Title</span>
                <span>Report Type</span>
                <span>Committee</span>
                <span>Date / Period</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              {filteredReports.length === 0 ? (
                <div className="reports-empty-row">No reports match your search.</div>
              ) : filteredReports.map(report => (
                <div className="reports-table-row" key={report.report_id}>
                  <span>{report.report_title}</span>
                  <span>{reportTypeName(report)}</span>
                  <span>{report.committee_name}</span>
                  <span>{formatPeriod(report)}</span>
                  <span><span className={`status-badge ${report.status}`}>{displayStatus(report.status)}</span></span>
                  <span className="report-actions">
                    <button title={isEditable(report.status) ? "Edit report" : "View report"} onClick={() => onOpenReport(report)}>
                      {isEditable(report.status) ? <FaEdit /> : <FaEye />}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && <div className="reports-table-footer"><p>Showing {filteredReports.length} of {reports.length} reports</p></div>}
        </section>
      </main>
    </div>
  );
}

export default ReportsSearch;
