import { useEffect, useState } from "react";
import macLogo from "../assets/MAC_LOGO.png";
import {
  FaArrowLeft,
  FaBars,
  FaCheckCircle,
  FaChevronDown,
  FaCircle,
  FaHome
} from "react-icons/fa";

const API_BASE = "http://127.0.0.1:5001";
const REPORT_STORAGE_KEY = "macreporting_postmortem_report_id";
const REVIEWER_USER_STORAGE_KEY = "macreporting_reviewer_user_id";
const LOCK_USER_STORAGE_KEY = "macreporting_lock_user_id";

const baseSections = [
  "Report Information",
  "Event Logistics",
  "Goals / Objective",
  "Financial Information / Metrics",
  "Outcome / Metrics",
  "Committee Feedback",
  "Review"
];

const questionMap = {
  reportDate: { questionId: 15, version: 1 },
  submittedBy: { questionId: 16, version: 1 },
  activityName: { questionId: 17, version: 1 },
  dateTime: { questionId: 18, version: 1 },
  location: { questionId: 19, version: 1 },
  partnerships: { questionId: 20, version: 1 },
  programThrust: { questionId: 7, version: 1 },
  objective: { questionId: 21, version: 1 },
  programRationale: { questionId: 22, version: 1 },
  communityAttendance: { questionId: 23, version: 1 },
  chapterAttendance: { questionId: 24, version: 1 },
  totalAttendance: { questionId: 25, version: 1 },
  grantsExternalFunding: { questionId: 26, version: 1 },
  chapterExpenses: { questionId: 27, version: 1 },
  internalCommitteePartnerships: { questionId: 28, version: 1 },
  keyMetrics: { questionId: 29, version: 1 },
  volunteerHours: { questionId: 40, version: 1 },
  evaluations: { questionId: 30, version: 1 },
  socialMedia: { questionId: 31, version: 1 },
  resultsOutcomes: { questionId: 32, version: 1 },
  externalCoveragePr: { questionId: 33, version: 1 },
  eventStrengthsSuccesses: { questionId: 34, version: 1 },
  lessonsLearned: { questionId: 35, version: 1 },
  keyRecommendations: { questionId: 36, version: 1 },
  participantFeedback: { questionId: 37, version: 1 },
  committeeFeedback: { questionId: 38, version: 1 }
};

const initialReportData = {
  reportInformation: {
    reportDate: "",
    submittedByUserId: "",
    committeeId: ""
  },
  eventLogistics: {
    activityName: "",
    dateTime: "",
    location: "",
    partnerships: ""
  },
  goalsObjective: {
    programThrust: "",
    objective: "",
    programRationale: "",
    communityAttendance: "",
    chapterAttendance: ""
  },
  financialInformation: {
    grantsExternalFunding: "",
    chapterExpenses: ""
  },
  outcomeMetrics: {
    internalCommitteePartnerships: "",
    keyMetrics: "",
    volunteerHours: "",
    evaluations: "",
    socialMedia: "",
    resultsOutcomes: "",
    externalCoveragePr: "",
    eventStrengthsSuccesses: "",
    lessonsLearned: "",
    keyRecommendations: "",
    participantFeedback: ""
  },
  committeeFeedback: ""
};

function PostMortemReportEntry({ onBack, onHome, currentUserId }) {
  const [reportId, setReportId] = useState(null);
  const [reportStatus, setReportStatus] = useState("draft");
  const [reportData, setReportData] = useState(initialReportData);
  const [currentSection, setCurrentSection] = useState("Report Information");
  const [completedSections, setCompletedSections] = useState([]);
  const [validationMessage, setValidationMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);

  const [reviewerUserId] = useState(
    () => localStorage.getItem(REVIEWER_USER_STORAGE_KEY) || ""
  );
  const [reviewComments, setReviewComments] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [lockUserId] = useState(
    () => localStorage.getItem(LOCK_USER_STORAGE_KEY) || ""
  );
  const [lockComments, setLockComments] = useState("");
  const [lockMessage, setLockMessage] = useState("");
  const [lockError, setLockError] = useState("");

  const [canGeneratePdf, setCanGeneratePdf] = useState(false);

  useEffect(() => {
    if (!currentUserId || reportId) return;

    setReportData(current => {
      if (current.reportInformation.submittedByUserId) return current;

      return {
        ...current,
        reportInformation: {
          ...current.reportInformation,
          submittedByUserId: String(currentUserId)
        }
      };
    });
  }, [currentUserId, reportId]);

  const isReadOnly = !["draft", "returned_for_changes"].includes(reportStatus);
  const isReviewerView =
    reportStatus === "submitted" && Boolean(reviewerUserId);
  const isLockView =
    reportStatus === "approved" && Boolean(lockUserId);

  const sections = isReviewerView
    ? [...baseSections, "Reviewer Action"]
    : isLockView
      ? [...baseSections, "Finalization Action"]
      : baseSections;

  const currentUser = users.find(user => String(user.user_id) === String(currentUserId));
  const currentUserName = currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : "";
  const currentUserInitials = currentUser ? `${currentUser.first_name?.[0] || ""}${currentUser.last_name?.[0] || ""}`.toUpperCase() : "";

  const reviewer = users.find(
    user => String(user.user_id) === String(reviewerUserId)
  );

  const reviewerName = reviewer
    ? `${reviewer.first_name || ""} ${reviewer.last_name || ""}`.trim()
    : "Authorized Reviewer";

  const finalizer = users.find(
    user => String(user.user_id) === String(lockUserId)
  );

  const finalizerName = finalizer
    ? `${finalizer.first_name || ""} ${finalizer.last_name || ""}`.trim()
    : "Authorized Finalizer";

  const [openOutcomeGroups, setOpenOutcomeGroups] = useState({
    metrics: true,
    reach: false,
    publicity: false,
    lessons: false
  });

  const {
    reportInformation,
    eventLogistics,
    goalsObjective,
    financialInformation,
    outcomeMetrics,
    committeeFeedback
  } = reportData;

  const totalAttendance =
    (Number(goalsObjective.communityAttendance) || 0) +
    (Number(goalsObjective.chapterAttendance) || 0);

  useEffect(() => {
    async function initializeReport() {
      try {
        const [userData, committeeData] = await Promise.all([
          apiRequest("/users"),
          apiRequest("/committees")
        ]);

        setUsers(userData);
        setCommittees(committeeData);

        const storedReportId = localStorage.getItem(REPORT_STORAGE_KEY);

        if (storedReportId) {
          await loadDraft(Number(storedReportId));
        } else {
          setLoadingDraft(false);
        }
      } catch (error) {
        console.error("Error initializing post-mortem report:", error);
        setValidationMessage("Unable to load report setup data.");
        setLoadingDraft(false);
      }
    }

    initializeReport();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setCanGeneratePdf(false);
      return;
    }

    apiRequest(`/reports/awaiting-lock?user_id=${currentUserId}`)
      .then(data => setCanGeneratePdf(Boolean(data.can_finalize)))
      .catch(() => setCanGeneratePdf(false));
  }, [currentUserId]);

  async function apiRequest(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to complete request.");
    }

    return data;
  }

  async function handleGeneratePdf() {
    if (!reportId) {
      setLockError("Please save the report before generating a PDF.");
      return;
    }

    if (!currentUserId) {
      setLockError("An authorized user is required to generate the PDF.");
      return;
    }

    try {
      setLockError("");
      setLockMessage("Generating PDF...");

      const response = await fetch(`${API_BASE}/reports/${reportId}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          changed_by_user_id: Number(currentUserId)
        })
      });

      if (!response.ok) {
        let errorMessage = "Unable to generate PDF.";

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response was not JSON.
        }

        throw new Error(errorMessage);
      }

      const pdfBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = getPdfFilename();

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setLockMessage("PDF generated successfully.");
    } catch (error) {
      setLockMessage("");
      setLockError(error.message);
    }
  }

  function safeFilenamePart(value) {
    return String(value || "").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function filenameDate(value) {
    const datePart = String(value || "").slice(0, 10);
    const [year, month, day] = datePart.split("-");
    return year && month && day ? `${month}${day}${year}` : "Undated";
  }

  function getPdfFilename() {
    const eventName = safeFilenamePart(eventLogistics.activityName) || "Event";
    return `${eventName}_Post_Mortem_${filenameDate(eventLogistics.dateTime)}.pdf`;
  }

  function toggleOutcomeGroup(group) {
    setOpenOutcomeGroups(current => ({
      ...current,
      [group]: !current[group]
    }));
  }

  function updateGroup(group, field, value) {
    setReportData(current => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value
      }
    }));

    if (validationMessage) {
      setValidationMessage("");
    }
  }

  function selectedCommitteeName() {
    const committee = committees.find(
      item =>
        String(item.committee_id) ===
        String(reportInformation.committeeId)
    );

    return committee?.committee_name || "";
  }

  function selectedSubmitterName() {
    const user = users.find(
      item =>
        String(item.user_id) ===
        String(reportInformation.submittedByUserId)
    );

    return user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : "";
  }

  function getReportingPeriod() {
    if (!reportInformation.reportDate) {
      return null;
    }

    return `${reportInformation.reportDate.slice(0, 7)}-01`;
  }

  function getEventDate() {
    return eventLogistics.dateTime
      ? eventLogistics.dateTime.slice(0, 10)
      : null;
  }

  function validateReportInformation() {
    return (
      reportInformation.reportDate &&
      reportInformation.submittedByUserId &&
      reportInformation.committeeId
    );
  }

  function validateCurrentSection() {
    if (currentSection === "Report Information") {
      return validateReportInformation();
    }

    if (currentSection === "Event Logistics") {
      return (
        eventLogistics.activityName.trim() &&
        eventLogistics.dateTime &&
        eventLogistics.location.trim()
      );
    }

    if (currentSection === "Goals / Objective") {
      return (
        goalsObjective.programThrust &&
        goalsObjective.objective.trim() &&
        goalsObjective.programRationale.trim()
      );
    }

    return true;
  }

  async function ensureDraft() {
    if (reportId) {
      return reportId;
    }

    if (!validateReportInformation()) {
      throw new Error(
        "Please complete all required Report Information fields before saving."
      );
    }

    const report = await apiRequest("/reports", {
      method: "POST",
      body: JSON.stringify({
        report_template_id: 2,
        report_template_version: 1,
        committee_id: Number(reportInformation.committeeId),
        created_by_user_id: Number(reportInformation.submittedByUserId),
        report_title:
          eventLogistics.activityName.trim() || "Post-Mortem Report Draft",
        reporting_period: getReportingPeriod(),
        event_date: getEventDate()
      })
    });

    setReportId(report.report_id);
    localStorage.setItem(REPORT_STORAGE_KEY, report.report_id);

    return report.report_id;
  }

  async function saveReportMetadata(draftId) {
    await apiRequest(`/reports/${draftId}`, {
      method: "PUT",
      body: JSON.stringify({
        report_title:
          eventLogistics.activityName.trim() || "Post-Mortem Report Draft",
        reporting_period: getReportingPeriod(),
        event_date: getEventDate(),
        committee_id: Number(reportInformation.committeeId),
        created_by_user_id: Number(reportInformation.submittedByUserId)
      })
    });
  }

  async function saveAnswer(draftId, fieldName, value) {
    const question = questionMap[fieldName];

    if (!question) {
      return;
    }

    await apiRequest(`/reports/${draftId}/answers`, {
      method: "POST",
      body: JSON.stringify({
        question_id: question.questionId,
        question_version: question.version,
        answer_value: value ?? "",
        answered_by: Number(reportInformation.submittedByUserId),
        notes: null
      })
    });
  }

  async function saveFields(draftId, fields) {
    await Promise.all(
      fields.map(([name, value]) =>
        saveAnswer(draftId, name, value)
      )
    );
  }

  async function saveCurrentSection() {
    const draftId = await ensureDraft();

    if (currentSection === "Report Information") {
      await saveFields(draftId, [
        ["reportDate", reportInformation.reportDate],
        ["submittedBy", selectedSubmitterName()]
      ]);

      await saveReportMetadata(draftId);
    }

    if (currentSection === "Event Logistics") {
      await saveFields(draftId, [
        ["activityName", eventLogistics.activityName],
        ["dateTime", eventLogistics.dateTime],
        ["location", eventLogistics.location],
        ["partnerships", eventLogistics.partnerships]
      ]);

      await saveReportMetadata(draftId);
    }

    if (currentSection === "Goals / Objective") {
      await saveFields(draftId, [
        ["programThrust", goalsObjective.programThrust],
        ["objective", goalsObjective.objective],
        ["programRationale", goalsObjective.programRationale],
        ["communityAttendance", goalsObjective.communityAttendance],
        ["chapterAttendance", goalsObjective.chapterAttendance],
        ["totalAttendance", String(totalAttendance)]
      ]);
    }

    if (currentSection === "Financial Information / Metrics") {
      await saveFields(draftId, [
        ["grantsExternalFunding", financialInformation.grantsExternalFunding],
        ["chapterExpenses", financialInformation.chapterExpenses]
      ]);
    }

    if (currentSection === "Outcome / Metrics") {
      await saveFields(draftId, [
        [
          "internalCommitteePartnerships",
          outcomeMetrics.internalCommitteePartnerships
        ],
        ["keyMetrics", outcomeMetrics.keyMetrics],
        ["volunteerHours", outcomeMetrics.volunteerHours],
        ["evaluations", outcomeMetrics.evaluations],
        ["socialMedia", outcomeMetrics.socialMedia],
        ["resultsOutcomes", outcomeMetrics.resultsOutcomes],
        ["externalCoveragePr", outcomeMetrics.externalCoveragePr],
        [
          "eventStrengthsSuccesses",
          outcomeMetrics.eventStrengthsSuccesses
        ],
        ["lessonsLearned", outcomeMetrics.lessonsLearned],
        ["keyRecommendations", outcomeMetrics.keyRecommendations],
        ["participantFeedback", outcomeMetrics.participantFeedback]
      ]);
    }

    if (currentSection === "Committee Feedback") {
      await saveAnswer(
        draftId,
        "committeeFeedback",
        committeeFeedback
      );
    }

    setSaveMessage("Draft saved.");

    setTimeout(() => {
      setSaveMessage("");
    }, 2500);

    return draftId;
  }

  async function markSectionComplete(section, draftId) {
    await apiRequest(`/reports/${draftId}/section-progress`, {
      method: "POST",
      body: JSON.stringify({
        section_name: section,
        completed: true,
        completed_by_user_id: Number(
          reportInformation.submittedByUserId
        )
      })
    });

    setCompletedSections(current =>
      current.includes(section)
        ? current
        : [...current, section]
    );
  }

  async function loadDraft(id) {
    setLoadingDraft(true);

    try {
      const [report, answers, sectionProgress, history] =
        await Promise.all([
          apiRequest(`/reports/${id}`),
          apiRequest(`/reports/${id}/answers`),
          apiRequest(`/reports/${id}/section-progress`),
          apiRequest(`/reports/${id}/status-history`)
        ]);

      setStatusHistory(history);

      const answerValues = {};

      answers.forEach(answer => {
        answerValues[answer.question_id] =
          answer.answer_value ?? "";
      });

      setReportId(id);
      setReportStatus(report.status || "draft");

      localStorage.setItem(
        REPORT_STORAGE_KEY,
        id
      );

      setReportData({
        reportInformation: {
          reportDate:
            answerValues[15] ||
            report.reporting_period ||
            "",
          submittedByUserId:
            String(
              report.created_by_user_id ||
              ""
            ),
          committeeId:
            String(
              report.committee_id ||
              ""
            )
        },
        eventLogistics: {
          activityName:
            answerValues[17] ||
            report.report_title ||
            "",
          dateTime:
            answerValues[18] ||
            "",
          location:
            answerValues[19] ||
            "",
          partnerships:
            answerValues[20] ||
            ""
        },
        goalsObjective: {
          programThrust:
            answerValues[7] ||
            "",
          objective:
            answerValues[21] ||
            "",
          programRationale:
            answerValues[22] ||
            "",
          communityAttendance:
            answerValues[23] ||
            "",
          chapterAttendance:
            answerValues[24] ||
            ""
        },
        financialInformation: {
          grantsExternalFunding:
            answerValues[26] ||
            "",
          chapterExpenses:
            answerValues[27] ||
            ""
        },
        outcomeMetrics: {
          internalCommitteePartnerships:
            answerValues[28] ||
            "",
          keyMetrics:
            answerValues[29] ||
            "",
          volunteerHours:
            answerValues[40] ||
            "",
          evaluations:
            answerValues[30] ||
            "",
          socialMedia:
            answerValues[31] ||
            "",
          resultsOutcomes:
            answerValues[32] ||
            "",
          externalCoveragePr:
            answerValues[33] ||
            "",
          eventStrengthsSuccesses:
            answerValues[34] ||
            "",
          lessonsLearned:
            answerValues[35] ||
            "",
          keyRecommendations:
            answerValues[36] ||
            "",
          participantFeedback:
            answerValues[37] ||
            ""
        },
        committeeFeedback:
          answerValues[38] ||
          ""
      });

      setCompletedSections(
        sectionProgress
          .filter(item => item.completed)
          .map(item => item.section_name)
      );
    } catch (error) {
      console.error(
        "Error loading post-mortem draft:",
        error
      );

      setValidationMessage(
        "Unable to reload the saved draft."
      );
    } finally {
      setLoadingDraft(false);
    }
  }

  async function handleSaveDraft() {
    if (
      currentSection === "Report Information" &&
      !validateReportInformation()
    ) {
      setValidationMessage(
        "Please complete all required Report Information fields before saving."
      );

      return;
    }

    try {
      setValidationMessage("");
      await saveCurrentSection();
    } catch (error) {
      setValidationMessage(
        error.message
      );
    }
  }

  async function handleSaveAndContinue() {
    if (!validateCurrentSection()) {
      setValidationMessage(
        "Please complete all required fields before continuing."
      );

      return;
    }

    try {
      setValidationMessage("");

      const draftId =
        await saveCurrentSection();

      await markSectionComplete(
        currentSection,
        draftId
      );

      const nextSection = {
        "Report Information":
          "Event Logistics",
        "Event Logistics":
          "Goals / Objective",
        "Goals / Objective":
          "Financial Information / Metrics",
        "Financial Information / Metrics":
          "Outcome / Metrics",
        "Outcome / Metrics":
          "Committee Feedback",
        "Committee Feedback":
          "Review"
      };

      if (
        nextSection[currentSection]
      ) {
        setCurrentSection(
          nextSection[currentSection]
        );
      }
    } catch (error) {
      setValidationMessage(
        error.message
      );
    }
  }

  async function handleSubmitReport() {
    if (!reportId) {
      setValidationMessage(
        "Please save the report before submitting."
      );

      return;
    }

    try {
      setValidationMessage("");

      const submittedReport =
        await apiRequest(
          `/reports/${reportId}/submit`,
          {
            method: "POST",
            body: JSON.stringify({
              changed_by_user_id:
                Number(
                  reportInformation.submittedByUserId
                )
            })
          }
        );

      setReportStatus(
        submittedReport.status
      );

      setSaveMessage(
        "Report submitted successfully."
      );

      setTimeout(() => {
        setSaveMessage("");
      }, 2500);
    } catch (error) {
      setValidationMessage(
        error.message
      );
    }
  }

  async function handleReturnForChanges() {
    if (!reviewComments.trim()) {
      setReviewError(
        "Reviewer comments are required when returning a report for changes."
      );

      return;
    }

    try {
      setReviewError("");
      setReviewMessage("");

      const returnedReport =
        await apiRequest(
          `/reports/${reportId}/return`,
          {
            method: "POST",
            body: JSON.stringify({
              changed_by_user_id:
                Number(
                  reviewerUserId
                ),
              comments:
                reviewComments.trim()
            })
          }
        );

      setReportStatus(
        returnedReport.status
      );

      setStatusHistory(
        await apiRequest(
          `/reports/${reportId}/status-history`
        )
      );

      setReviewMessage(
        "Report returned for changes."
      );

      setReviewComments("");
      setCurrentSection("Review");
    } catch (error) {
      setReviewError(
        error.message
      );
    }
  }

  async function handleApproveReport() {
    try {
      setReviewError("");
      setReviewMessage("");

      const approvedReport =
        await apiRequest(
          `/reports/${reportId}/approve`,
          {
            method: "POST",
            body: JSON.stringify({
              changed_by_user_id:
                Number(
                  reviewerUserId
                ),
              comments:
                reviewComments.trim() ||
                null
            })
          }
        );

      setReportStatus(
        approvedReport.status
      );

      setStatusHistory(
        await apiRequest(
          `/reports/${reportId}/status-history`
        )
      );

      setReviewMessage(
        "Report approved."
      );

      setReviewComments("");
      setCurrentSection("Review");
    } catch (error) {
      setReviewError(
        error.message
      );
    }
  }

  async function handleLockReport() {
    if (!reportId) {
      setLockError(
        "Report ID is missing."
      );

      return;
    }

    try {
      setLockError("");
      setLockMessage("");

      const lockedReport =
        await apiRequest(
          `/reports/${reportId}/lock`,
          {
            method: "POST",
            body: JSON.stringify({
              changed_by_user_id:
                Number(
                  lockUserId
                ),
              comments:
                lockComments.trim() ||
                null
            })
          }
        );

      setReportStatus(
        lockedReport.status
      );

      setStatusHistory(
        await apiRequest(
          `/reports/${reportId}/status-history`
        )
      );

      setLockComments("");

      setLockMessage(
        "Report locked successfully."
      );

      setCurrentSection("Review");
    } catch (error) {
      setLockError(
        error.message
      );
    }
  }

  function formatHistoryDate(value) {
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    ).format(
      new Date(value)
    );
  }

  function handleSectionChange(section) {
    setValidationMessage("");
    setCurrentSection(section);
  }

  function handleHome() {
    setMenuOpen(false);

    if (onHome) {
      onHome();
    }
  }

  function handleBack() {
    setMenuOpen(false);

    if (onBack) {
      onBack();
    }
  }

  function displayValue(value) {
    return value &&
      String(value).trim()
      ? value
      : "—";
  }

  function displayCurrency(value) {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return `$${(
      Number(value) || 0
    ).toFixed(2)}`;
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? value
      : date.toLocaleString();
  }

  function formActions() {
    return (
      <div className="entry-form-actions">
        <button
          type="button"
          className="secondary-action-button"
          onClick={handleSaveDraft}
          disabled={isReadOnly}
        >
          Save Draft
        </button>

        <button
          type="button"
          className="primary-action-button"
          onClick={handleSaveAndContinue}
          disabled={isReadOnly}
        >
          Save & Continue →
        </button>
      </div>
    );
  }

  function validationBlock() {
    return validationMessage ? (
      <div className="form-validation-message">
        {validationMessage}
      </div>
    ) : null;
  }

  function previewHeading(title, section) {
    return (
      <div className="preview-section-heading">
        <h2>{title}</h2>

        <button
          type="button"
          className="preview-edit-button"
          onClick={() =>
            setCurrentSection(section)
          }
          disabled={isReadOnly}
        >
          Edit
        </button>
      </div>
    );
  }

  const latestReturn =
    statusHistory.find(
      item =>
        item.to_status ===
        "returned_for_changes"
    );

  if (loadingDraft) {
    return (
      <div className="entry-page">
        <div className="entry-loading">
          <p>
            Loading saved draft...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="entry-page">
      <header className="entry-header">
        <div className="entry-header-left">
          <div className="entry-menu-wrapper">
            <button
              type="button"
              className="menu-button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() =>
                setMenuOpen(
                  open => !open
                )
              }
            >
              <FaBars />
            </button>

            {menuOpen && (
              <div className="entry-menu">
                <button
                  type="button"
                  onClick={handleHome}
                >
                  <FaHome />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                >
                  <FaArrowLeft />
                  <span>Reports</span>
                </button>
              </div>
            )}
          </div>

          <img src={macLogo} alt="MAC Logo" className="entry-logo" />

          <div className="entry-report-title">
            <h1>Post-Mortem Report</h1>

            <p>
              {[
                eventLogistics.activityName,
                selectedCommitteeName()
              ]
                .filter(Boolean)
                .join(" • ") ||
                "New Post-Mortem Report"}
            </p>
          </div>
        </div>

        <div className="entry-header-right">
          <button
            type="button"
            className="entry-home-button"
            onClick={handleHome}
          >
            <FaHome />
            <span>Home</span>
          </button>

          <div className="user-summary">
            <span className="user-avatar">{currentUserInitials || "—"}</span>
            <span>{currentUserName || "Current User"}</span>
            <FaChevronDown />
          </div>      

          <div className="report-status">
            <span>
              Status:
            </span>

            <span
              className={`status-badge ${reportStatus}`}
            >
              {reportStatus
                .replaceAll("_", " ")
                .toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="entry-layout">
        <aside className="entry-sections">
          <p className="entry-sections-label">
            REPORT SECTIONS
          </p>

          {sections.map(section => {
            const isCompleted =
              completedSections.includes(
                section
              );

            const isCurrent =
              currentSection === section;

            return (
              <button
                key={section}
                type="button"
                className={`section-nav-item ${
                  isCurrent
                    ? "current"
                    : isCompleted
                      ? "completed"
                      : ""
                }`}
                onClick={() =>
                  handleSectionChange(
                    section
                  )
                }
              >
                {isCompleted ? (
                  <FaCheckCircle />
                ) : (
                  <FaCircle />
                )}

                <span>
                  {section}
                </span>
              </button>
            );
          })}

          <div className="entry-legend">
            <p>LEGEND</p>

            <div>
              <FaCheckCircle className="legend-completed" />
              <span>Completed</span>
            </div>

            <div>
              <FaCircle className="legend-current" />
              <span>
                Current Section
              </span>
            </div>

            <div>
              <FaCircle className="legend-not-completed" />
              <span>
                Not Completed
              </span>
            </div>
          </div>
        </aside>

        <main className="entry-content">
          {reportStatus === "returned_for_changes" &&
            latestReturn && (
              <div className="returned-report-banner">
                <h3>
                  Returned for Changes
                </h3>

                <p>
                  {`${latestReturn.first_name || ""} ${
                    latestReturn.last_name || ""
                  }`.trim() ||
                    "The reviewer"}{" "}
                  returned this report
                  {latestReturn.changed_at
                    ? ` on ${formatHistoryDate(
                        latestReturn.changed_at
                      )}.`
                    : "."}
                </p>

                <p>
                  <strong>
                    Reviewer Comments:
                  </strong>{" "}
                  {latestReturn.comments ||
                    "No comments provided."}
                </p>
              </div>
            )}

          {isReadOnly && (
            <div className="form-save-message">
              This report is{" "}
              {reportStatus.replaceAll(
                "_",
                " "
              )}{" "}
              and is read-only.
            </div>
          )}

          {saveMessage && (
            <div className="form-save-message">
              {saveMessage}
            </div>
          )}

          {currentSection === "Report Information" && (
            <>
              <h2>
                REPORT INFORMATION
              </h2>

              <form className="entry-form">
                {validationBlock()}

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Report Date{" "}
                      <span>*</span>
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="date"
                      value={
                        reportInformation.reportDate
                      }
                      onChange={event =>
                        updateGroup(
                          "reportInformation",
                          "reportDate",
                          event.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Submitted By{" "}
                      <span>*</span>
                    </label>

                    <select
                      disabled
                      value={
                        reportInformation.submittedByUserId
                      }
                      onChange={event =>
                        updateGroup(
                          "reportInformation",
                          "submittedByUserId",
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select Member
                      </option>

                      {users.map(user => (
                        <option
                          key={user.user_id}
                          value={user.user_id}
                        >
                          {user.first_name}{" "}
                          {user.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Committee{" "}
                      <span>*</span>
                    </label>

                    <select
                      disabled={isReadOnly}
                      value={
                        reportInformation.committeeId
                      }
                      onChange={event =>
                        updateGroup(
                          "reportInformation",
                          "committeeId",
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select Committee
                      </option>

                      {committees.map(
                        committee => (
                          <option
                            key={
                              committee.committee_id
                            }
                            value={
                              committee.committee_id
                            }
                          >
                            {
                              committee.committee_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {formActions()}
              </form>
            </>
          )}

          {currentSection === "Event Logistics" && (
            <>
              <h2>
                EVENT LOGISTICS
              </h2>

              <form className="entry-form">
                {validationBlock()}

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Activity Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="text"
                      value={
                        eventLogistics.activityName
                      }
                      onChange={event =>
                        updateGroup(
                          "eventLogistics",
                          "activityName",
                          event.target.value
                        )
                      }
                      placeholder="Enter activity name"
                      required
                    />
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Date / Time{" "}
                      <span>*</span>
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="datetime-local"
                      value={
                        eventLogistics.dateTime
                      }
                      onChange={event =>
                        updateGroup(
                          "eventLogistics",
                          "dateTime",
                          event.target.value
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Location{" "}
                      <span>*</span>
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="text"
                      value={
                        eventLogistics.location
                      }
                      onChange={event =>
                        updateGroup(
                          "eventLogistics",
                          "location",
                          event.target.value
                        )
                      }
                      placeholder="Enter location"
                      required
                    />
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Partnerships
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="text"
                      value={
                        eventLogistics.partnerships
                      }
                      onChange={event =>
                        updateGroup(
                          "eventLogistics",
                          "partnerships",
                          event.target.value
                        )
                      }
                      placeholder="Enter partnerships, if applicable"
                    />
                  </div>
                </div>

                {formActions()}
              </form>
            </>
          )}

          {currentSection === "Goals / Objective" && (
            <>
              <h2>
                GOALS / OBJECTIVE
              </h2>

              <form className="entry-form">
                {validationBlock()}

                <div className="entry-form-group full-width">
                  <label>
                    Program Thrust{" "}
                    <span>*</span>
                  </label>

                  <select
                    disabled={isReadOnly}
                    value={
                      goalsObjective.programThrust
                    }
                    onChange={event =>
                      updateGroup(
                        "goalsObjective",
                        "programThrust",
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select Program Thrust
                    </option>

                    <option>
                      Physical and Mental Health
                    </option>

                    <option>
                      Educational Development
                    </option>

                    <option>
                      Economic Development
                    </option>

                    <option>
                      International Awareness and Involvement
                    </option>

                    <option>
                      Political Awareness and Involvement
                    </option>
                  </select>
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Objective{" "}
                    <span>*</span>
                  </label>

                  <textarea
                    disabled={isReadOnly}
                    value={
                      goalsObjective.objective
                    }
                    onChange={event =>
                      updateGroup(
                        "goalsObjective",
                        "objective",
                        event.target.value
                      )
                    }
                    placeholder="Enter objective"
                    rows="5"
                    required
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Program Rationale{" "}
                    <span>*</span>
                  </label>

                  <textarea
                    disabled={isReadOnly}
                    value={
                      goalsObjective.programRationale
                    }
                    onChange={event =>
                      updateGroup(
                        "goalsObjective",
                        "programRationale",
                        event.target.value
                      )
                    }
                    placeholder="Enter program rationale"
                    rows="5"
                    required
                  />
                </div>

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Community Attendance
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="number"
                      min="0"
                      value={
                        goalsObjective.communityAttendance
                      }
                      onChange={event =>
                        updateGroup(
                          "goalsObjective",
                          "communityAttendance",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Chapter Attendance
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="number"
                      min="0"
                      value={
                        goalsObjective.chapterAttendance
                      }
                      onChange={event =>
                        updateGroup(
                          "goalsObjective",
                          "chapterAttendance",
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Total Attendance
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="number"
                      value={
                        totalAttendance
                      }
                      readOnly
                    />
                  </div>
                </div>

                {formActions()}
              </form>
            </>
          )}

          {currentSection === "Financial Information / Metrics" && (
            <>
              <h2>
                FINANCIAL INFORMATION / METRICS
              </h2>

              <form className="entry-form">
                {validationBlock()}

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Grants / External Funding
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        financialInformation.grantsExternalFunding
                      }
                      onChange={event =>
                        updateGroup(
                          "financialInformation",
                          "grantsExternalFunding",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Chapter Expenses
                    </label>

                    <input
                      disabled={isReadOnly}
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        financialInformation.chapterExpenses
                      }
                      onChange={event =>
                        updateGroup(
                          "financialInformation",
                          "chapterExpenses",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {formActions()}
              </form>
            </>
          )}

          {currentSection === "Outcome / Metrics" && (
            <>
              <h2>
                OUTCOME / METRICS
              </h2>

              <form className="entry-form">
                {validationBlock()}

                <div className="outcome-accordion">
                  <button
                    type="button"
                    className="outcome-accordion-header"
                    onClick={() =>
                      toggleOutcomeGroup(
                        "metrics"
                      )
                    }
                  >
                    <span>
                      Metrics
                    </span>

                    <FaChevronDown
                      className={
                        openOutcomeGroups.metrics
                          ? "accordion-icon open"
                          : "accordion-icon"
                      }
                    />
                  </button>

                  {openOutcomeGroups.metrics && (
                    <div className="outcome-accordion-content">
                      <div className="entry-form-group full-width">
                        <label>
                          Key Metrics
                        </label>

                        <textarea
                          disabled={isReadOnly}
                          value={
                            outcomeMetrics.keyMetrics
                          }
                          onChange={event =>
                            updateGroup(
                              "outcomeMetrics",
                              "keyMetrics",
                              event.target.value
                            )
                          }
                          rows="4"
                        />
                      </div>

                      <div className="entry-form-group full-width">
                        <label>
                          Volunteer Hours of Effort
                        </label>

                        <input
                          disabled={isReadOnly}
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            outcomeMetrics.volunteerHours
                          }
                          onChange={event =>
                            updateGroup(
                              "outcomeMetrics",
                              "volunteerHours",
                              event.target.value
                            )
                          }
                          placeholder="0"
                        />
                      </div>

                      {[
                        [
                          "evaluations",
                          "Evaluations"
                        ],
                        [
                          "resultsOutcomes",
                          "Results Outcomes"
                        ]
                      ].map(
                        ([field, label]) => (
                          <div
                            key={field}
                            className="entry-form-group full-width"
                          >
                            <label>
                              {label}
                            </label>

                            <textarea
                              disabled={
                                isReadOnly
                              }
                              value={
                                outcomeMetrics[
                                  field
                                ]
                              }
                              onChange={event =>
                                updateGroup(
                                  "outcomeMetrics",
                                  field,
                                  event.target
                                    .value
                                )
                              }
                              rows="4"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="outcome-accordion-header"
                    onClick={() =>
                      toggleOutcomeGroup(
                        "reach"
                      )
                    }
                  >
                    <span>
                      Reach
                    </span>

                    <FaChevronDown
                      className={
                        openOutcomeGroups.reach
                          ? "accordion-icon open"
                          : "accordion-icon"
                      }
                    />
                  </button>

                  {openOutcomeGroups.reach && (
                    <div className="outcome-accordion-content">
                      {[
                        [
                          "internalCommitteePartnerships",
                          "Internal Committee Partnerships"
                        ],
                        [
                          "socialMedia",
                          "Social Media"
                        ],
                        [
                          "participantFeedback",
                          "Participant Feedback (if Applicable)"
                        ]
                      ].map(
                        ([field, label]) => (
                          <div
                            key={field}
                            className="entry-form-group full-width"
                          >
                            <label>
                              {label}
                            </label>

                            <textarea
                              disabled={
                                isReadOnly
                              }
                              value={
                                outcomeMetrics[
                                  field
                                ]
                              }
                              onChange={event =>
                                updateGroup(
                                  "outcomeMetrics",
                                  field,
                                  event.target
                                    .value
                                )
                              }
                              rows="4"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="outcome-accordion-header"
                    onClick={() =>
                      toggleOutcomeGroup(
                        "publicity"
                      )
                    }
                  >
                    <span>
                      Publicity &amp; Coverage
                    </span>

                    <FaChevronDown
                      className={
                        openOutcomeGroups.publicity
                          ? "accordion-icon open"
                          : "accordion-icon"
                      }
                    />
                  </button>

                  {openOutcomeGroups.publicity && (
                    <div className="outcome-accordion-content">
                      <div className="entry-form-group full-width">
                        <label>
                          PR - External Coverage / Articles / PR
                        </label>

                        <textarea
                          disabled={
                            isReadOnly
                          }
                          value={
                            outcomeMetrics.externalCoveragePr
                          }
                          onChange={event =>
                            updateGroup(
                              "outcomeMetrics",
                              "externalCoveragePr",
                              event.target
                                .value
                            )
                          }
                          rows="4"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="outcome-accordion-header"
                    onClick={() =>
                      toggleOutcomeGroup(
                        "lessons"
                      )
                    }
                  >
                    <span>
                      Lessons &amp; Feedback
                    </span>

                    <FaChevronDown
                      className={
                        openOutcomeGroups.lessons
                          ? "accordion-icon open"
                          : "accordion-icon"
                      }
                    />
                  </button>

                  {openOutcomeGroups.lessons && (
                    <div className="outcome-accordion-content">
                      {[
                        [
                          "eventStrengthsSuccesses",
                          "Event / Program Strengths or Successes"
                        ],
                        [
                          "lessonsLearned",
                          "Lessons Learned (Key Takeaways)"
                        ],
                        [
                          "keyRecommendations",
                          "Key Recommendations"
                        ]
                      ].map(
                        ([field, label]) => (
                          <div
                            key={field}
                            className="entry-form-group full-width"
                          >
                            <label>
                              {label}
                            </label>

                            <textarea
                              disabled={
                                isReadOnly
                              }
                              value={
                                outcomeMetrics[
                                  field
                                ]
                              }
                              onChange={event =>
                                updateGroup(
                                  "outcomeMetrics",
                                  field,
                                  event.target
                                    .value
                                )
                              }
                              rows="4"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {formActions()}
              </form>
            </>
          )}

          {currentSection === "Committee Feedback" && (
            <>
              <h2>
                COMMITTEE FEEDBACK
              </h2>

              <form className="entry-form">
                {validationBlock()}

                <div className="entry-form-group full-width">
                  <label>
                    Committee Feedback
                  </label>

                  <textarea
                    disabled={isReadOnly}
                    value={
                      committeeFeedback
                    }
                    onChange={event => {
                      setReportData(
                        current => ({
                          ...current,
                          committeeFeedback:
                            event.target
                              .value
                        })
                      );

                      if (
                        validationMessage
                      ) {
                        setValidationMessage(
                          ""
                        );
                      }
                    }}
                    rows="8"
                    placeholder="Enter committee feedback"
                  />
                </div>

                {formActions()}
              </form>
            </>
          )}

          {currentSection === "Review" && (
            <div className="report-preview">
              <div className="report-preview-header">
                <p className="report-preview-eyebrow">
                  MACReporting
                </p>

                <h1>
                  Post-Mortem Report
                </h1>

                <p className="report-preview-subtitle">
                  {[
                    selectedCommitteeName(),
                    eventLogistics.activityName
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>

              <div className="report-preview-divider"></div>

              <section className="preview-section">
                {previewHeading(
                  "Report Information",
                  "Report Information"
                )}

                <div className="preview-detail-grid">
                  <div>
                    <span className="preview-label">
                      Report Date
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        reportInformation.reportDate
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Submitted By
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        selectedSubmitterName()
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Committee
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        selectedCommitteeName()
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="preview-section">
                {previewHeading(
                  "Event Logistics",
                  "Event Logistics"
                )}

                <div className="preview-detail-grid">
                  <div>
                    <span className="preview-label">
                      Activity Name
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        eventLogistics.activityName
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Date / Time
                    </span>

                    <span className="preview-value">
                      {formatDateTime(
                        eventLogistics.dateTime
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Location
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        eventLogistics.location
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Partnerships
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        eventLogistics.partnerships
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="preview-section">
                {previewHeading(
                  "Goals / Objective",
                  "Goals / Objective"
                )}

                <div className="preview-detail-grid">
                  <div>
                    <span className="preview-label">
                      Program Thrust
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        goalsObjective.programThrust
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Community Attendance
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        goalsObjective.communityAttendance
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Chapter Attendance
                    </span>

                    <span className="preview-value">
                      {displayValue(
                        goalsObjective.chapterAttendance
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Total Attendance
                    </span>

                    <span className="preview-value">
                      {totalAttendance}
                    </span>
                  </div>
                </div>

                <div className="preview-narrative-block">
                  <h3>
                    Objective
                  </h3>

                  <p>
                    {displayValue(
                      goalsObjective.objective
                    )}
                  </p>
                </div>

                <div className="preview-narrative-block">
                  <h3>
                    Program Rationale
                  </h3>

                  <p>
                    {displayValue(
                      goalsObjective.programRationale
                    )}
                  </p>
                </div>
              </section>

              <section className="preview-section">
                {previewHeading(
                  "Financial Information / Metrics",
                  "Financial Information / Metrics"
                )}

                <div className="preview-detail-grid">
                  <div>
                    <span className="preview-label">
                      Grants / External Funding
                    </span>

                    <span className="preview-value">
                      {displayCurrency(
                        financialInformation.grantsExternalFunding
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Chapter Expenses
                    </span>

                    <span className="preview-value">
                      {displayCurrency(
                        financialInformation.chapterExpenses
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="preview-section">
                {previewHeading(
                  "Outcome / Metrics",
                  "Outcome / Metrics"
                )}

                {[
                  [
                    "Internal Committee Partnerships",
                    outcomeMetrics.internalCommitteePartnerships
                  ],
                  [
                    "Key Metrics",
                    outcomeMetrics.keyMetrics
                  ],
                  [
                    "Volunteer Hours of Effort",
                    outcomeMetrics.volunteerHours
                  ],
                  [
                    "Evaluations",
                    outcomeMetrics.evaluations
                  ],
                  [
                    "Social Media",
                    outcomeMetrics.socialMedia
                  ],
                  [
                    "Results Outcomes",
                    outcomeMetrics.resultsOutcomes
                  ],
                  [
                    "PR - External Coverage / Articles / PR",
                    outcomeMetrics.externalCoveragePr
                  ],
                  [
                    "Event / Program Strengths or Successes",
                    outcomeMetrics.eventStrengthsSuccesses
                  ],
                  [
                    "Lessons Learned (Key Takeaways)",
                    outcomeMetrics.lessonsLearned
                  ],
                  [
                    "Key Recommendations",
                    outcomeMetrics.keyRecommendations
                  ],
                  [
                    "Participant Feedback (if Applicable)",
                    outcomeMetrics.participantFeedback
                  ]
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="preview-narrative-block"
                    >
                      <h3>
                        {label}
                      </h3>

                      <p>
                        {displayValue(
                          value
                        )}
                      </p>
                    </div>
                  )
                )}
              </section>

              <section className="preview-section">
                {previewHeading(
                  "Committee Feedback",
                  "Committee Feedback"
                )}

                <div className="preview-narrative-block">
                  <p>
                    {displayValue(
                      committeeFeedback
                    )}
                  </p>
                </div>
              </section>

              <div className="report-preview-footer">
                <div>
                  <span className="preview-label">
                    Committee
                  </span>

                  <span className="preview-value">
                    {displayValue(
                      selectedCommitteeName()
                    )}
                  </span>
                </div>

                <div>
                  <span className="preview-label">
                    Submitted By
                  </span>

                  <span className="preview-value">
                    {displayValue(
                      selectedSubmitterName()
                    )}
                  </span>
                </div>

                <div>
                  <span className="preview-label">
                    Report Date
                  </span>

                  <span className="preview-value">
                    {displayValue(
                      reportInformation.reportDate
                    )}
                  </span>
                </div>

                <div>
                  <span className="preview-label">
                    Status
                  </span>

                  <span className="preview-value">
                    {reportStatus
                      .replaceAll(
                        "_",
                        " "
                      )
                      .toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="report-preview-actions">
                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={() =>
                    setCurrentSection(
                      "Committee Feedback"
                    )
                  }
                >
                  ← Back
                </button>

                {isReviewerView ? (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      setCurrentSection(
                        "Reviewer Action"
                      )
                    }
                  >
                    Continue to Reviewer Action →
                  </button>
                ) : isLockView ? (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() => setCurrentSection("Finalization Action")}
                  >
                    Continue to Finalization →
                  </button>
                ) : reportStatus === "locked" ? null : (
                      <button type="button" className="primary-action-button" onClick={handleSubmitReport} disabled={!reportId || isReadOnly}>
                        {isReadOnly ? "Report Submitted" : reportStatus === "returned_for_changes" ? "Resubmit Report" : "Submit Report"}
                      </button>
                    )}
              </div>
            </div>
          )}

          {currentSection === "Reviewer Action" && (
            <section>
              <div className="reviewer-action-header">
                <h2>
                  Reviewer Action
                </h2>

                <p>
                  Review this submitted report and choose an action below.
                </p>
              </div>

              <div className="entry-form">
                {reviewError && (
                  <div className="form-validation-message">
                    {reviewError}
                  </div>
                )}

                {reviewMessage && (
                  <div className="form-save-message">
                    {reviewMessage}
                  </div>
                )}

                <div className="reviewer-summary-card">
                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">
                      Reviewer
                    </span>

                    <span className="reviewer-summary-value">
                      {reviewerName}
                    </span>
                  </div>

                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">
                      Committee
                    </span>

                    <span className="reviewer-summary-value">
                      {selectedCommitteeName()}
                    </span>
                  </div>

                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">
                      Status
                    </span>

                    <span className="reviewer-summary-value">
                      {reportStatus
                        .replaceAll(
                          "_",
                          " "
                        )
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Reviewer Comments
                  </label>

                  <p>
                    Comments are required when returning a report for changes and optional when approving.
                  </p>

                  <textarea
                    value={
                      reviewComments
                    }
                    onChange={event =>
                      setReviewComments(
                        event.target.value
                      )
                    }
                    rows="6"
                    placeholder="Enter comments for the committee chair..."
                    disabled={
                      reportStatus !==
                      "submitted"
                    }
                  />
                </div>

                <div className="entry-form-actions">
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={
                      handleReturnForChanges
                    }
                    disabled={
                      reportStatus !==
                      "submitted"
                    }
                  >
                    ← Return for Changes
                  </button>

                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={
                      handleApproveReport
                    }
                    disabled={
                      reportStatus !==
                      "submitted"
                    }
                  >
                    Approve Report ✓
                  </button>
                </div>
              </div>
            </section>
          )}

          {currentSection === "Finalization Action" && (
            <section>
              <div className="reviewer-action-header">
                <h2>
                  Finalization Action
                </h2>

                <p>
                  Lock this approved report to complete the reporting workflow. Once locked, the report is read-only and ready for final PDF generation.
                </p>
              </div>

              <div className="entry-form">
                {lockError && (
                  <div className="form-validation-message">
                    {lockError}
                  </div>
                )}

                {lockMessage && (
                  <div className="form-save-message">
                    {lockMessage}
                  </div>
                )}

                <div className="reviewer-summary-card">
                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">
                      Finalized By
                    </span>

                    <span className="reviewer-summary-value">
                      {finalizerName}
                    </span>
                  </div>

                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">
                      Committee
                    </span>

                    <span className="reviewer-summary-value">
                      {selectedCommitteeName() ||
                        "—"}
                    </span>
                  </div>

                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">
                      Status
                    </span>

                    <span className="reviewer-summary-value">
                      {reportStatus
                        .replaceAll(
                          "_",
                          " "
                        )
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Finalization Comments
                  </label>

                  <p>
                    Comments are optional and will be saved with the report's status history.
                  </p>

                  <textarea
                    value={
                      lockComments
                    }
                    onChange={event => {
                      setLockComments(
                        event.target.value
                      );

                      if (lockError) {
                        setLockError("");
                      }
                    }}
                    rows="6"
                    placeholder="Enter optional finalization comments..."
                  />
                </div>

                <div className="entry-form-actions">
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      setCurrentSection(
                        "Review"
                      )
                    }
                  >
                    ← Back to Review
                  </button>

                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={
                      handleLockReport
                    }
                  >
                    Lock Report
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default PostMortemReportEntry;
