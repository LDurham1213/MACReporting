import { useEffect, useState } from "react";
import {
  FaChartBar,
  FaFileAlt,
  FaHome,
  FaSearch,
  FaQuestionCircle,
  FaSignOutAlt,
  FaClipboardCheck
} from "react-icons/fa";
import macLogo from "../assets/MAC_LOGO.png";

function Dashboard({
  onHome,
  onMyReports,
  onApprovals,
  onReportsSearch,
  onLogout
}) {
  const [summary, setSummary] = useState({
    programs_held: 0,
    total_attendance: 0,
    total_expenses: 0,
    reports_submitted: 0
  });

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [committeeActivity, setCommitteeActivity] = useState([]);

  const [reportStatus, setReportStatus] = useState({
    total_reports: 0,
    statuses: []
  });

  const [filterOptions, setFilterOptions] = useState({
    reporting_periods: [],
    committees: []
  });

  const [
    selectedReportingPeriod,
    setSelectedReportingPeriod
  ] = useState("");

  const [
    selectedCommittee,
    setSelectedCommittee
  ] = useState("");

  function buildDashboardQuery() {
    const params = new URLSearchParams();

    if (selectedReportingPeriod) {
      params.append(
        "reporting_period",
        selectedReportingPeriod
      );
    }

    if (selectedCommittee) {
      params.append(
        "committee_id",
        selectedCommittee
      );
    }

    const queryString = params.toString();

    return queryString ? `?${queryString}` : "";
  }

  useEffect(() => {
    async function loadDashboardSummary() {
      try {
        setSummaryLoading(true);
        setSummaryError("");

        const url =
          `http://localhost:5001/dashboard/summary${buildDashboardQuery()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            "Unable to load dashboard summary."
          );
        }

        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error(
          "Dashboard summary error:",
          error
        );

        setSummaryError(
          "Unable to load dashboard summary."
        );
      } finally {
        setSummaryLoading(false);
      }
    }

    async function loadCommitteeActivity() {
      try {
        const url =
          `http://localhost:5001/dashboard/committee-activity${buildDashboardQuery()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            "Unable to load committee activity."
          );
        }

        const data = await response.json();
        setCommitteeActivity(data);
      } catch (error) {
        console.error(
          "Committee activity error:",
          error
        );
      }
    }

    async function loadReportStatus() {
      try {
        const url =
          `http://localhost:5001/dashboard/report-status${buildDashboardQuery()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            "Unable to load report status."
          );
        }

        const data = await response.json();
        setReportStatus(data);
      } catch (error) {
        console.error(
          "Report status error:",
          error
        );
      }
    }

    loadDashboardSummary();
    loadCommitteeActivity();
    loadReportStatus();
  }, [selectedReportingPeriod, selectedCommittee]);

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const response = await fetch(
          "http://localhost:5001/dashboard/filter-options"
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load dashboard filter options."
          );
        }

        const data = await response.json();
        setFilterOptions(data);
      } catch (error) {
        console.error(
          "Dashboard filter options error:",
          error
        );
      }
    }

    loadFilterOptions();
  }, []);

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src={macLogo}
            alt="MAC Logo"
            className="chapter-logo"
          />

          <h1>MACReporting</h1>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={onHome}
          >
            <span><FaHome /></span>
            Home
          </button>

          <button
            className="nav-item"
            onClick={onMyReports}
          >
            <span><FaFileAlt /></span>
            My Reports
          </button>

          <button
            className="nav-item"
            onClick={onApprovals}
          >
            <span><FaClipboardCheck /></span>
            Approvals
          </button>

          <button
            className="nav-item"
            onClick={onReportsSearch}
          >
            <span><FaSearch /></span>
            Reports Search
          </button>

          <button className="nav-item active">
            <span><FaChartBar /></span>
            Dashboard (Phase 2)
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item">
            <span><FaQuestionCircle /></span>
            Help / Support
          </button>

          <button
            className="nav-item"
            onClick={onLogout}
          >
            <span><FaSignOutAlt /></span>
            Log Out
          </button>
        </div>
      </aside>

      <main className="home-main">
        <section className="dashboard-page">
          <div className="dashboard-header">
            <div>
              <h1>Analytics Dashboard</h1>

              <p>
                View chapter reporting trends, spending,
                activity, and workflow status.
              </p>
            </div>
          </div>

          <div className="dashboard-filters">
            <div className="dashboard-filter">
              <label>Reporting Period</label>

              <select
                value={selectedReportingPeriod}
                onChange={(event) =>
                  setSelectedReportingPeriod(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Reporting Periods
                </option>

                {filterOptions.reporting_periods.map(
                  (period) => (
                    <option
                      key={period}
                      value={period}
                    >
                      {new Date(
                        `${period}T00:00:00`
                      ).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          year: "numeric"
                        }
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="dashboard-filter">
              <label>Committee</label>

              <select
                value={selectedCommittee}
                onChange={(event) =>
                  setSelectedCommittee(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Committees
                </option>

                {filterOptions.committees.map(
                  (committee) => (
                    <option
                      key={committee.committee_id}
                      value={committee.committee_id}
                    >
                      {committee.committee_name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="dashboard-filter">
              <label>Report Type</label>

              <select>
                <option>
                  All Report Types
                </option>
              </select>
            </div>

            <div className="dashboard-filter">
              <label>Program / Event</label>

              <select>
                <option>
                  All Programs / Events
                </option>
              </select>
            </div>
          </div>

          <div className="dashboard-metrics">
            <div className="dashboard-metric-card">
              <span>Programs Held</span>

              <strong>
                {summaryLoading
                  ? "—"
                  : summary.programs_held.toLocaleString()}
              </strong>
            </div>

            <div className="dashboard-metric-card">
              <span>Total Attendance</span>

              <strong>
                {summaryLoading
                  ? "—"
                  : summary.total_attendance.toLocaleString()}
              </strong>
            </div>

            <div className="dashboard-metric-card">
              <span>Total Expenses</span>

              <strong>
                {summaryLoading
                  ? "—"
                  : summary.total_expenses.toLocaleString(
                      "en-US",
                      {
                        style: "currency",
                        currency: "USD"
                      }
                    )}
              </strong>
            </div>

            <div className="dashboard-metric-card">
              <span>Reports Submitted</span>

              <strong>
                {summaryLoading
                  ? "—"
                  : summary.reports_submitted.toLocaleString()}
              </strong>
            </div>
          </div>

          {summaryError && (
            <p className="form-error">
              {summaryError}
            </p>
          )}

          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <h2>Committee Activity</h2>

              <div className="dashboard-table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Committee</th>
                      <th>Programs</th>
                      <th>Attendance</th>
                      <th>Expenses</th>
                    </tr>
                  </thead>

                  <tbody>
                    {committeeActivity.map(
                      (committee) => (
                        <tr
                          key={
                            committee.committee_id
                          }
                        >
                          <td>
                            {committee.committee_name}
                          </td>

                          <td>
                            {committee.programs_held.toLocaleString()}
                          </td>

                          <td>
                            {committee.total_attendance.toLocaleString()}
                          </td>

                          <td>
                            {committee.total_expenses.toLocaleString(
                              "en-US",
                              {
                                style: "currency",
                                currency: "USD"
                              }
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="dashboard-panel">
              <h2>Report Status Overview</h2>

              <div className="status-summary">
                <div className="status-total">
                  <strong>
                    {reportStatus.total_reports}
                  </strong>

                  <span>Total Reports</span>
                </div>

                <div className="status-list">
                  {reportStatus.statuses.map(
                    (item) => (
                      <div
                        className="status-row"
                        key={item.status}
                      >
                        <span className="status-label">
                          {item.status
                            .replaceAll("_", " ")
                            .replace(
                              /\b\w/g,
                              (letter) =>
                                letter.toUpperCase()
                            )}
                        </span>

                        <strong>
                          {item.count}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="dashboard-panel">
            <h2>Needs My Attention</h2>

            <p>
              Reports requiring action will appear here.
            </p>
          </section>

          <section className="dashboard-panel">
            <h2>Recent Reports</h2>

            <p>
              Recently updated reports will appear here.
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;