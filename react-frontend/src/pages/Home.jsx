import { useEffect, useState } from "react";
import { FaHome, FaFileAlt, FaClipboardList, FaSearch, FaChartBar, FaQuestionCircle, FaSignOutAlt, FaCalendarAlt, FaClipboardCheck } from "react-icons/fa";
import macLogo from "../assets/MAC_LOGO.png";

function Home({ currentUserId, onSelectReportType, onApprovals, onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5001/users")
      .then(response => response.json())
      .then(users => setCurrentUser(users.find(user => String(user.user_id) === String(currentUserId)) || null))
      .catch(error => console.error("Unable to load current user:", error));
  }, [currentUserId]);

  const firstName = currentUser?.first_name || "";

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={macLogo} alt="MAC Logo" className="chapter-logo" />
          <h1>MACReporting</h1>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active"><span><FaHome /></span>Home</button>
          <button className="nav-item"><span><FaFileAlt /></span>My Reports</button>
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
          <h2>Welcome to MACReporting!</h2>
          <p>What would you like to do today{firstName ? `, ${firstName}` : ""}?</p>
        </section>

        <section className="report-card-grid">
          <article className="report-selection-card">
            <div className="report-icon"><FaClipboardList /></div>
            <h3>COMMITTEE REPORT</h3>
            <p>Monthly committee<br />reporting</p>
            <button className="select-report-button" onClick={() => onSelectReportType("committee")}>Select This Report</button>
          </article>

          <article className="report-selection-card">
            <div className="report-icon"><FaCalendarAlt /></div>
            <h3>POST-MORTEM REPORT</h3>
            <p>Program / event<br />reporting</p>
            <button className="select-report-button" onClick={() => onSelectReportType("post-mortem")}>Select This Report</button>
          </article>
        </section>

        <section className="draft-notice">
          <span className="info-icon">ⓘ</span>
          <p>Reports are saved as drafts as you work.<br />You can return and complete them later.</p>
        </section>
      </main>
    </div>
  );
}

export default Home;