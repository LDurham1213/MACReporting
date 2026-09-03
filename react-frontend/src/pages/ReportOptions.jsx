import {
  FaHome,
  FaFileAlt,
  FaClipboardList,
  FaSearch,
  FaChartBar,
  FaQuestionCircle,
  FaSignOutAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload
} from "react-icons/fa";

function ReportOptions({ selectedReportType, onCreateNew, onBack }) {
  const isCommittee = selectedReportType === "committee";
  const reportName = isCommittee ? "Committee Report" : "Post-Mortem Report";

  const reports = isCommittee
    ? [
        {
          title: "August 2026 Committee Report",
          period: "Aug 2026",
          status: "DRAFT",
          updated: "8/28/2026"
        },
        {
          title: "July 2026 Committee Report",
          period: "Jul 2026",
          status: "LOCKED",
          updated: "8/05/2026"
        },
        {
          title: "June 2026 Committee Report",
          period: "Jun 2026",
          status: "FINAL",
          updated: "7/03/2026"
        },
        {
          title: "May 2026 Committee Report",
          period: "May 2026",
          status: "FINAL",
          updated: "6/02/2026"
        }
      ]
    : [
        {
          title: "Back-to-School Program Post-Mortem",
          period: "Aug 2026",
          status: "DRAFT",
          updated: "8/30/2026"
        },
        {
          title: "Community Health Fair Post-Mortem",
          period: "Jul 2026",
          status: "FINAL",
          updated: "7/22/2026"
        },
        {
          title: "Scholarship Luncheon Post-Mortem",
          period: "Jun 2026",
          status: "LOCKED",
          updated: "6/18/2026"
        }
      ];

  return (
    <div className="home-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="chapter-logo-placeholder">Organization Logo</div>
          <h1>MACReporting</h1>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item" onClick={onBack}>
            <span><FaHome /></span>Home
          </button>
          <button className="nav-item active">
            <span><FaFileAlt /></span>My Reports
          </button>
          <button className="nav-item">
            <span><FaClipboardList /></span>Templates
          </button>
          <button className="nav-item">
            <span><FaSearch /></span>Reports (Search)
          </button>
          <button className="nav-item">
            <span><FaChartBar /></span>Dashboard (Phase 2)
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item">
            <span><FaQuestionCircle /></span>Help / Support
          </button>
          <button className="nav-item">
            <span><FaSignOutAlt /></span>Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="reports-main">
        <div className="reports-page-header">
          <div>
            <h2>My Reports</h2>
            <p>
              Create a new {reportName} or work on an existing one.
            </p>
          </div>

          <button className="create-report-button" onClick={onCreateNew}>
            <FaPlus /> Create New Report
          </button>
        </div>

        {/* FILTERS */}
        <section className="report-filters">
          <div className="filter-group">
            <label>Committee</label>
            <select defaultValue="">
              <option value="" disabled>Select Committee</option>
              <option>Social Action</option>
              <option>Technology</option>
              <option>Membership</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{isCommittee ? "Reporting Period" : "Event Month"}</label>
            <select defaultValue="">
              <option value="" disabled>{isCommittee ? "Select Period" : "Select Event Month"}</option>
              <option>August 2026</option>
              <option>July 2026</option>
              <option>June 2026</option>
              <option>May 2026</option>
            </select>
          </div>

          <button className="filter-button">Filter</button>
        </section>

        {/* EXISTING REPORTS */}
        <section className="existing-reports">
          <h3>Existing {reportName}s</h3>

          <div className="reports-table">
            <div className="reports-table-header">
              <span>Report Title</span>
              <span>Period</span>
              <span>Status</span>
              <span>Last Updated</span>
              <span>Actions</span>
            </div>

            {reports.map((report, index) => (
              <div className="reports-table-row" key={index}>
                <span>{report.title}</span>
                <span>{report.period}</span>
                <span>
                  <span className={`status-badge ${report.status.toLowerCase()}`}>
                    {report.status}
                  </span>
                </span>
                <span>{report.updated}</span>

                <span className="report-actions">
                  {report.status === "DRAFT" ? (
                    <>
                      <button title="Edit"><FaEdit /></button>
                      <button title="Delete"><FaTrash /></button>
                    </>
                  ) : (
                    <>
                      <button title="View"><FaEye /></button>
                      <button title="Download"><FaDownload /></button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="reports-table-footer">
            <p>Showing 1 to {reports.length} of {reports.length} reports</p>
            <div className="pagination">
              <button>‹</button>
              <button className="active">1</button>
              <button>›</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReportOptions;