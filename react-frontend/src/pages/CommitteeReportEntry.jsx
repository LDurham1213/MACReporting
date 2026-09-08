import { useEffect, useState } from "react";
import macLogo from "../assets/MAC_LOGO.png";
import {
  FaBars,
  FaCheckCircle,
  FaCircle,
  FaChevronDown,
  FaPlus,
  FaTrash,
  FaHome,
  FaArrowLeft
} from "react-icons/fa";

const API_BASE = "http://127.0.0.1:5001";
const REPORT_STORAGE_KEY = "macreporting_committee_report_id";
const REVIEWER_USER_STORAGE_KEY = "macreporting_reviewer_user_id";
const LOCK_USER_STORAGE_KEY = "macreporting_lock_user_id";

const baseSections = [
  "Report Details",
  "Program Overview",
  "Program Summary",
  "Goals",
  "Recent Successes",
  "Challenges",
  "Resources Needed",
  "Action Items",
  "Dates to Remember",
  "Budget",
  "Review"
];

const questionMap = {
  eventName: { questionId: 1, version: 1 },
  date: { questionId: 2, version: 1 },
  time: { questionId: 3, version: 1 },
  location: { questionId: 4, version: 1 },
  internalPartners: { questionId: 5, version: 1 },
  externalPartners: { questionId: 6, version: 1 },
  programThrust: { questionId: 7, version: 1 },
  populationServed: { questionId: 8, version: 1 },
  expectedOutcomes: { questionId: 9, version: 1 },
  programSummary: { questionId: 10, version: 1 },
  goals: { questionId: 11, version: 1 },
  recentSuccesses: { questionId: 12, version: 1 },
  challenges: { questionId: 13, version: 1 },
  resourcesNeeded: { questionId: 14, version: 1 },
  financialRequest: { questionId: 39, version: 1 },
  financialRequestDescription: { questionId: 41, version: 1 }
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const currentYear = new Date().getFullYear();
const reportingYears = Array.from(
  { length: 11 },
  (_, index) => currentYear - 5 + index
);

const initialReportData = {
  reportDetails: {
    reportingMonth: "",
    reportingYear: String(currentYear),
    submittedByUserId: "",
    committeeId: ""
  },
  programOverview: {
    eventName: "",
    date: "",
    time: "",
    location: "",
    internalPartners: "",
    externalPartners: "",
    programThrust: "",
    populationServed: "",
    expectedOutcomes: ""
  },
  programSummary: "",
  goals: "",
  recentSuccesses: "",
  challenges: "",
  resourcesNeeded: "",
  financialRequest: "",
  financialRequestDescription: "",
  actionItems: [
    {
      id: null,
      actionItem: "",
      owner: "",
      dueDate: "",
      status: "",
      notes: ""
    }
  ],
  datesToRemember: [
    {
      id: null,
      date: "",
      item: "",
      owner: ""
    }
  ],
  budgetItems: [
    {
      id: null,
      category: "",
      estimatedCost: "",
      actualCost: "",
      notes: ""
    }
  ]
};

function CommitteeReportEntry({ onBack, onHome, currentUserId }) {
  const [reportId, setReportId] = useState(null);
  const [reportStatus, setReportStatus] = useState("draft");
  const [statusHistory, setStatusHistory] = useState([]);
  const [reportData, setReportData] = useState(initialReportData);
  const [currentSection, setCurrentSection] = useState("Report Details");
  const [completedSections, setCompletedSections] = useState([]);
  const [validationMessage, setValidationMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [committees, setCommittees] = useState([]);
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
  const isReadOnly = !["draft", "returned_for_changes"].includes(reportStatus);
  const isReviewerView = reportStatus === "submitted" && Boolean(reviewerUserId);
  const isLockView = reportStatus === "approved" && Boolean(lockUserId);
  const sections = isReviewerView
    ? [...baseSections, "Reviewer Action"]
    : isLockView
      ? [...baseSections, "Finalization Action"]
      : baseSections;
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

  const {
  reportDetails,
  programOverview,
  programSummary,
  goals,
  recentSuccesses,
  challenges,
  resourcesNeeded,
  financialRequest,
  financialRequestDescription,
  actionItems,
  datesToRemember,
  budgetItems
} = reportData;

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
        console.error("Error initializing report:", error);
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

    const pdfUserId = currentUserId;

    if (!pdfUserId) {
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
          changed_by_user_id: Number(pdfUserId)
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

  function updateReportDetails(field, value) {
    setReportData(current => ({
      ...current,
      reportDetails: {
        ...current.reportDetails,
        [field]: value
      }
    }));

    if (validationMessage) {
      setValidationMessage("");
    }
  }

  function updateReportField(field, value) {
    setReportData(current => ({
      ...current,
      [field]: value
    }));

    if (validationMessage) {
      setValidationMessage("");
    }
  }

  function updateProgramOverview(field, value) {
    setReportData(current => ({
      ...current,
      programOverview: {
        ...current.programOverview,
        [field]: value
      }
    }));

    if (validationMessage) {
      setValidationMessage("");
    }
  }

  function updateActionItem(index, field, value) {
    setReportData(current => ({
      ...current,
      actionItems: current.actionItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addActionItem() {
    setReportData(current => ({
      ...current,
      actionItems: [
        ...current.actionItems,
        {
          id: null,
          actionItem: "",
          owner: "",
          dueDate: "",
          status: "",
          notes: ""
        }
      ]
    }));
  }

  function removeActionItem(index) {
    setReportData(current => ({
      ...current,
      actionItems:
        current.actionItems.length === 1
          ? [
              {
                id: null,
                actionItem: "",
                owner: "",
                dueDate: "",
                status: "",
                notes: ""
              }
            ]
          : current.actionItems.filter((_, i) => i !== index)
    }));
  }

  function updateDateToRemember(index, field, value) {
    setReportData(current => ({
      ...current,
      datesToRemember: current.datesToRemember.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addDateToRemember() {
    setReportData(current => ({
      ...current,
      datesToRemember: [
        ...current.datesToRemember,
        {
          id: null,
          date: "",
          item: "",
          owner: ""
        }
      ]
    }));
  }

  function removeDateToRemember(index) {
    setReportData(current => ({
      ...current,
      datesToRemember:
        current.datesToRemember.length === 1
          ? [
              {
                id: null,
                date: "",
                item: "",
                owner: ""
              }
            ]
          : current.datesToRemember.filter((_, i) => i !== index)
    }));
  }

  function updateBudgetItem(index, field, value) {
    setReportData(current => ({
      ...current,
      budgetItems: current.budgetItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addBudgetItem() {
    setReportData(current => ({
      ...current,
      budgetItems: [
        ...current.budgetItems,
        {
          id: null,
          category: "",
          estimatedCost: "",
          actualCost: "",
          notes: ""
        }
      ]
    }));
  }

  function removeBudgetItem(index) {
    setReportData(current => ({
      ...current,
      budgetItems:
        current.budgetItems.length === 1
          ? [
              {
                id: null,
                category: "",
                estimatedCost: "",
                actualCost: "",
                notes: ""
              }
            ]
          : current.budgetItems.filter((_, i) => i !== index)
    }));
  }

  async function markSectionComplete(section, draftId) {
    await apiRequest(`/reports/${draftId}/section-progress`, {
      method: "POST",
      body: JSON.stringify({
        section_name: section,
        completed: true,
        completed_by_user_id: Number(reportDetails.submittedByUserId)
      })
    });

    setCompletedSections(current =>
      current.includes(section)
        ? current
        : [...current, section]
    );
  }

  function getReportingPeriod() {
    if (!reportDetails.reportingMonth || !reportDetails.reportingYear) {
      return null;
    }

    const monthNumber = months.indexOf(reportDetails.reportingMonth) + 1;
    return `${reportDetails.reportingYear}-${String(monthNumber).padStart(2, "0")}-01`;
  }

  function selectedCommitteeAbbreviation() {
    const committee = committees.find(item => String(item.committee_id) === String(reportDetails.committeeId));
    return committee?.comm_abbr || "";
  }

  function safeFilenamePart(value) {
    return String(value || "").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function getPdfFilename() {
    const abbreviation = safeFilenamePart(selectedCommitteeAbbreviation()).toUpperCase() || "Committee";
    const monthNumber = String(months.indexOf(reportDetails.reportingMonth) + 1).padStart(2, "0");
    const year = reportDetails.reportingYear || String(currentYear);
    return `${abbreviation}_Committee_Report_${monthNumber}${year}.pdf`;
  }

  function selectedCommitteeName() {
    const committee = committees.find(
      item => String(item.committee_id) === String(reportDetails.committeeId)
    );

    return committee?.committee_name || "";
  }

  function selectedSubmitterName() {
    const user = users.find(
      item => String(item.user_id) === String(reportDetails.submittedByUserId)
    );

    if (!user) {
      return "";
    }

    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }

  function validateReportDetails() {
    return (
      reportDetails.reportingMonth &&
      reportDetails.reportingYear &&
      reportDetails.submittedByUserId &&
      reportDetails.committeeId
    );
  }

  async function ensureDraft() {
    if (reportId) {
      return reportId;
    }

    if (!validateReportDetails()) {
      throw new Error("Please complete all required Report Details fields.");
    }

    const report = await apiRequest("/reports", {
      method: "POST",
      body: JSON.stringify({
        report_template_id: 1,
        report_template_version: 1,
        committee_id: Number(reportDetails.committeeId),
        created_by_user_id: Number(reportDetails.submittedByUserId),
        report_title:
          programOverview.eventName.trim() ||
          "Committee Report Draft",
        reporting_period: getReportingPeriod(),
        event_date: programOverview.date || null
      })
    });

    setReportId(report.report_id);
    localStorage.setItem(REPORT_STORAGE_KEY, report.report_id);

    return report.report_id;
  }

  async function saveReportDetails(draftId) {
    await apiRequest(`/reports/${draftId}`, {
      method: "PUT",
      body: JSON.stringify({
        report_title:
          programOverview.eventName.trim() ||
          "Committee Report Draft",
        reporting_period: getReportingPeriod(),
        event_date: programOverview.date || null,
        committee_id: Number(reportDetails.committeeId),
        created_by_user_id: Number(reportDetails.submittedByUserId)
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
        answered_by: Number(reportDetails.submittedByUserId),
        notes: null
      })
    });
  }

  async function saveProgramOverview(draftId) {
    await Promise.all([
      saveAnswer(
        draftId,
        "eventName",
        programOverview.eventName
      ),
      saveAnswer(
        draftId,
        "date",
        programOverview.date
      ),
      saveAnswer(
        draftId,
        "time",
        programOverview.time
      ),
      saveAnswer(
        draftId,
        "location",
        programOverview.location
      ),
      saveAnswer(
        draftId,
        "internalPartners",
        programOverview.internalPartners
      ),
      saveAnswer(
        draftId,
        "externalPartners",
        programOverview.externalPartners
      ),
      saveAnswer(
        draftId,
        "programThrust",
        programOverview.programThrust
      ),
      saveAnswer(
        draftId,
        "populationServed",
        programOverview.populationServed
      ),
      saveAnswer(
        draftId,
        "expectedOutcomes",
        programOverview.expectedOutcomes
      )
    ]);

    await apiRequest(`/reports/${draftId}`, {
      method: "PUT",
      body: JSON.stringify({
        report_title:
          programOverview.eventName.trim() ||
          "Committee Report Draft",
        reporting_period: getReportingPeriod(),
        event_date: programOverview.date || null,
        committee_id: Number(reportDetails.committeeId),
        created_by_user_id: Number(reportDetails.submittedByUserId)
      })
    });
  }

  async function saveActionItems(draftId) {
    for (
      let index = 0;
      index < actionItems.length;
      index += 1
    ) {
      const item = actionItems[index];

      if (
        !item.actionItem.trim() &&
        !item.owner.trim() &&
        !item.dueDate &&
        !item.status.trim() &&
        !item.notes.trim()
      ) {
        continue;
      }

      const payload = {
        action_item: item.actionItem,
        owner: item.owner || null,
        due_date: item.dueDate || null,
        status: item.status || null,
        notes: item.notes || null,
        display_order: index + 1
      };

      if (item.id) {
        await apiRequest(
          `/reports/${draftId}/action-items/${item.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload)
          }
        );
      } else {
        const created = await apiRequest(
          `/reports/${draftId}/action-items`,
          {
            method: "POST",
            body: JSON.stringify(payload)
          }
        );

        setReportData(current => ({
          ...current,
          actionItems: current.actionItems.map(
            (currentItem, currentIndex) =>
              currentIndex === index
                ? {
                    ...currentItem,
                    id: created.action_item_id
                  }
                : currentItem
          )
        }));
      }
    }
  }

  async function saveDatesToRemember(draftId) {
    for (
      let index = 0;
      index < datesToRemember.length;
      index += 1
    ) {
      const item = datesToRemember[index];

      if (
        !item.date &&
        !item.item.trim() &&
        !item.owner.trim()
      ) {
        continue;
      }

      const payload = {
        reminder_date: item.date || null,
        item_deadline: item.item || null,
        owner: item.owner || null,
        display_order: index + 1
      };

      if (item.id) {
        await apiRequest(
          `/reports/${draftId}/dates-to-remember/${item.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload)
          }
        );
      } else {
        const created = await apiRequest(
          `/reports/${draftId}/dates-to-remember`,
          {
            method: "POST",
            body: JSON.stringify(payload)
          }
        );

        setReportData(current => ({
          ...current,
          datesToRemember:
            current.datesToRemember.map(
              (currentItem, currentIndex) =>
                currentIndex === index
                  ? {
                      ...currentItem,
                      id: created.report_date_id
                    }
                  : currentItem
            )
        }));
      }
    }
  }

  async function saveBudgetItems(draftId) {
    for (
      let index = 0;
      index < budgetItems.length;
      index += 1
    ) {
      const item = budgetItems[index];

      if (
        !item.category.trim() &&
        !item.estimatedCost &&
        !item.actualCost &&
        !item.notes.trim()
      ) {
        continue;
      }

      const payload = {
        category: item.category || null,
        estimated_cost:
          item.estimatedCost === ""
            ? null
            : Number(item.estimatedCost),
        actual_cost:
          item.actualCost === ""
            ? null
            : Number(item.actualCost),
        notes: item.notes || null,
        display_order: index + 1
      };

      if (item.id) {
        await apiRequest(
          `/reports/${draftId}/budget-items/${item.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload)
          }
        );
      } else {
        const created = await apiRequest(
          `/reports/${draftId}/budget-items`,
          {
            method: "POST",
            body: JSON.stringify(payload)
          }
        );

        setReportData(current => ({
          ...current,
          budgetItems: current.budgetItems.map(
            (currentItem, currentIndex) =>
              currentIndex === index
                ? {
                    ...currentItem,
                    id: created.budget_item_id
                  }
                : currentItem
          )
        }));
      }
    }
  }

  async function saveCurrentSection() {
    const draftId = await ensureDraft();

    if (currentSection === "Report Details") {
      await saveReportDetails(draftId);
    }

    if (currentSection === "Program Overview") {
      await saveProgramOverview(draftId);
    }

    if (currentSection === "Program Summary") {
      await saveAnswer(
        draftId,
        "programSummary",
        programSummary
      );
    }

    if (currentSection === "Goals") {
      await saveAnswer(
        draftId,
        "goals",
        goals
      );
    }

    if (currentSection === "Recent Successes") {
      await saveAnswer(
        draftId,
        "recentSuccesses",
        recentSuccesses
      );
    }

    if (currentSection === "Challenges") {
      await saveAnswer(
        draftId,
        "challenges",
        challenges
      );
    }

    if (currentSection === "Resources Needed") {
      await Promise.all([
        saveAnswer(
          draftId,
          "resourcesNeeded",
          resourcesNeeded
        ),
        saveAnswer(
          draftId,
          "financialRequest",
          financialRequest
        ),
        saveAnswer(
          draftId,
          "financialRequestDescription",
          financialRequestDescription
        )
      ]);
    }

    if (currentSection === "Action Items") {
      await saveActionItems(draftId);
    }

    if (currentSection === "Dates to Remember") {
      await saveDatesToRemember(draftId);
    }

    if (currentSection === "Budget") {
      await saveBudgetItems(draftId);
    }

    setSaveMessage("Draft saved.");

    setTimeout(() => {
      setSaveMessage("");
    }, 2500);

    return draftId;
  }

  async function loadDraft(id) {
    setLoadingDraft(true);

    try {
      const report = await apiRequest(
        `/reports/${id}`
      );

      const answers = await apiRequest(
        `/reports/${id}/answers`
      );

      const sectionProgress = await apiRequest(
        `/reports/${id}/section-progress`
      );

      const history = await apiRequest(
        `/reports/${id}/status-history`
      );

      setStatusHistory(history);
      setReportId(id);
      setReportStatus(report.status || "draft");

      localStorage.setItem(
        REPORT_STORAGE_KEY,
        id
      );

      const answerValues = {};

      answers.forEach(answer => {
        answerValues[answer.question_id] =
          answer.answer_value ?? "";
      });

      const loadedData = {
        ...initialReportData,

        reportDetails: {
          reportingMonth: report.reporting_period
            ? months[new Date(report.reporting_period).getUTCMonth()]
            : "",
          reportingYear: report.reporting_period
            ? String(new Date(report.reporting_period).getUTCFullYear())
            : String(currentYear),
          submittedByUserId: String(report.created_by_user_id || ""),
          committeeId: String(report.committee_id || "")
        },

        programOverview: {
          eventName:
            answerValues[1] ||
            report.report_title ||
            "",

          date:
            answerValues[2] || "",

          time:
            answerValues[3] || "",

          location:
            answerValues[4] || "",

          internalPartners:
            answerValues[5] || "",

          externalPartners:
            answerValues[6] || "",

          programThrust:
            answerValues[7] || "",

          populationServed:
            answerValues[8] || "",

          expectedOutcomes:
            answerValues[9] || ""
        },

        programSummary:
          answerValues[10] || "",

        goals:
          answerValues[11] || "",

        recentSuccesses:
          answerValues[12] || "",

        challenges:
          answerValues[13] || "",

        resourcesNeeded:
          answerValues[14] || "",

        financialRequest:
          answerValues[39] || "",

        financialRequestDescription:
          answerValues[41] || ""
      };

      const [
        actionResult,
        dateResult,
        budgetResult
      ] = await Promise.allSettled([
        apiRequest(
          `/reports/${id}/action-items`
        ),
        apiRequest(
          `/reports/${id}/dates-to-remember`
        ),
        apiRequest(
          `/reports/${id}/budget-items`
        )
      ]);

      if (
        actionResult.status === "fulfilled"
      ) {
        loadedData.actionItems =
          actionResult.value.length
            ? actionResult.value.map(item => ({
                id: item.action_item_id,
                actionItem:
                  item.action_item || "",
                owner:
                  item.owner || "",
                dueDate:
                  item.due_date || "",
                status:
                  item.status || "",
                notes:
                  item.notes || ""
              }))
            : initialReportData.actionItems;
      }

      if (
        dateResult.status === "fulfilled"
      ) {
        loadedData.datesToRemember =
          dateResult.value.length
            ? dateResult.value.map(item => ({
                id: item.report_date_id,
                date:
                  item.reminder_date || "",
                item:
                  item.item_deadline || "",
                owner:
                  item.owner || ""
              }))
            : initialReportData.datesToRemember;
      }

      if (
        budgetResult.status === "fulfilled"
      ) {
        loadedData.budgetItems =
          budgetResult.value.length
            ? budgetResult.value.map(item => ({
                id: item.budget_item_id,
                category:
                  item.category || "",
                estimatedCost:
                  item.estimated_cost ?? "",
                actualCost:
                  item.actual_cost ?? "",
                notes:
                  item.notes || ""
              }))
            : initialReportData.budgetItems;
      }

      setReportData(loadedData);

      const savedCompletedSections =
        sectionProgress
          .filter(item => item.completed)
          .map(item => item.section_name);

      setCompletedSections(savedCompletedSections);
    } catch (error) {
      console.error(
        "Error loading draft:",
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
    if (currentSection === "Report Details" && !validateReportDetails()) {
      setValidationMessage(
        "Please complete all required Report Details fields before saving."
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
    if (currentSection === "Report Details" && !validateReportDetails()) {
      setValidationMessage(
        "Please complete all required fields before continuing."
      );
      return;
    }

    if (
      currentSection === "Program Overview"
    ) {
      if (
        !programOverview.eventName.trim() ||
        !programOverview.date ||
        !programOverview.time.trim() ||
        !programOverview.location.trim()
      ) {
        setValidationMessage(
          "Please complete all required fields before continuing."
        );
        return;
      }
    }

    if (
      currentSection === "Program Summary" &&
      !programSummary.trim()
    ) {
      setValidationMessage(
        "Please complete the required field before continuing."
      );
      return;
    }

    if (
      currentSection === "Goals" &&
      !goals.trim()
    ) {
      setValidationMessage(
        "Please complete the required field before continuing."
      );
      return;
    }

    if (
      currentSection === "Recent Successes" &&
      !recentSuccesses.trim()
    ) {
      setValidationMessage(
        "Please complete the required field before continuing."
      );
      return;
    }

    if (
      currentSection === "Resources Needed" &&
      Number(financialRequest) > 0 &&
      !financialRequestDescription.trim()
    ) {
      setValidationMessage(
        "Please provide a description for the financial request."
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
        "Report Details":
          "Program Overview",

        "Program Overview":
          "Program Summary",

        "Program Summary":
          "Goals",

        "Goals":
          "Recent Successes",

        "Recent Successes":
          "Challenges",

        "Challenges":
          "Resources Needed",

        "Resources Needed":
          "Action Items",

        "Action Items":
          "Dates to Remember",

        "Dates to Remember":
          "Budget",

        "Budget":
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
      setValidationMessage("Please save the report before submitting.");
      return;
    }

    try {
      setValidationMessage("");

      const submittedReport = await apiRequest(
        `/reports/${reportId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            changed_by_user_id: Number(reportDetails.submittedByUserId)
          })
        }
      );

      setReportStatus(submittedReport.status);
      setSaveMessage("Report submitted successfully.");

      setTimeout(() => {
        setSaveMessage("");
      }, 2500);
    } catch (error) {
      setValidationMessage(error.message);
    }
  }

  async function handleReturnForChanges() {
    if (!reviewComments.trim()) {
      setReviewError("A comment is required when returning a report for changes.");
      return;
    }

    try {
      setReviewError("");
      setReviewMessage("");

      const returnedReport = await apiRequest(
        `/reports/${reportId}/return`,
        {
          method: "POST",
          body: JSON.stringify({
            changed_by_user_id: Number(reviewerUserId),
            comments: reviewComments.trim()
          })
        }
      );

      setReportStatus(returnedReport.status);
      setReviewComments("");
      setReviewMessage("Report returned for changes.");
    } catch (error) {
      setReviewError(error.message);
    }
  }

  async function handleApproveReport() {
    try {
      setReviewError("");
      setReviewMessage("");

      const approvedReport = await apiRequest(
        `/reports/${reportId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            changed_by_user_id: Number(reviewerUserId),
            comments: reviewComments.trim() || null
          })
        }
      );

      setReportStatus(approvedReport.status);
      setReviewComments("");
      setReviewMessage("Report approved.");
    } catch (error) {
      setReviewError(error.message);
    }
  }

  async function handleLockReport() {
    if (!reportId) {
      setLockError("Report ID is missing.");
      return;
    }

    try {
      setLockError("");
      setLockMessage("");

      const lockedReport = await apiRequest(`/reports/${reportId}/lock`, {
        method: "POST",
        body: JSON.stringify({
          changed_by_user_id: Number(lockUserId),
          comments: lockComments.trim() || null
        })
      });

      setReportStatus(lockedReport.status);
      setLockComments("");
      setLockMessage("Report locked successfully.");
      setCurrentSection("Review");
    } catch (error) {
      setLockError(error.message);
    }
  }

  function handleSectionChange(section) {
    setValidationMessage("");
    setCurrentSection(section);
  }

  function editSection(section) {
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

  function formatHistoryDate(value) {
    if (!value) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date(value));
  }

  const latestReturn = statusHistory.find(
    item => item.to_status === "returned_for_changes"
  );

  function displayCurrency(value) {
    return `$${(
      Number(value) || 0
    ).toFixed(2)}`;
  }

  const estimatedTotal =
    budgetItems.reduce(
      (total, item) =>
        total +
        (Number(item.estimatedCost) || 0),
      0
    );

  const actualTotal =
    budgetItems.reduce(
      (total, item) =>
        total +
        (Number(item.actualCost) || 0),
      0
    );

  if (loadingDraft) {
    return (
      <div className="entry-page">
        <div className="entry-loading">
          <p>Loading saved draft...</p>
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
                setMenuOpen(open => !open)
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
            <h1>Committee Report</h1>
            <p>
              {[
                reportDetails.reportingMonth && reportDetails.reportingYear
                  ? `${reportDetails.reportingMonth} ${reportDetails.reportingYear}`
                  : "",
                selectedCommitteeName()
              ]
                .filter(Boolean)
                .join(" • ") || "New Committee Report"}
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
            <span className="user-avatar">
              LD
            </span>

            <span>Leigh D.</span>

            <FaChevronDown />
          </div>

          <div className="report-status">
            <span>Status:</span>
            <span className={`status-badge ${reportStatus}`}>
              {reportStatus.replaceAll("_", " ").toUpperCase()}
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

                <span>{section}</span>
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
          {reportStatus === "returned_for_changes" && latestReturn && (
            <div className="returned-report-banner">
              <h3>Returned for Changes</h3>
              <p>
                {`${latestReturn.first_name || ""} ${latestReturn.last_name || ""}`.trim() || "The reviewer"} returned this report
                {latestReturn.changed_at ? ` on ${formatHistoryDate(latestReturn.changed_at)}.` : "."}
              </p>
              <p><strong>Reviewer Comments:</strong> {latestReturn.comments || "No comments provided."}</p>
            </div>
          )}

          {isReadOnly && (
            <div className="form-save-message">
              This report is {reportStatus.replaceAll("_", " ")} and is read-only.
            </div>
          )}
          {saveMessage && (
            <div className="form-save-message">
              {saveMessage}
            </div>
          )}

          {currentSection === "Report Details" ? (
            <>
              <h2>REPORT DETAILS</h2>

              <form className="entry-form">
                {validationMessage && (
                  <div className="form-validation-message">
                    {validationMessage}
                  </div>
                )}

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Reporting Month <span>*</span>
                    </label>
                    <select disabled={isReadOnly}
                      value={reportDetails.reportingMonth}
                      onChange={event =>
                        updateReportDetails("reportingMonth", event.target.value)
                      }
                      required
                    >
                      <option value="">Select Month</option>
                      {months.map(month => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Reporting Year <span>*</span>
                    </label>
                    <select disabled={isReadOnly}
                      value={reportDetails.reportingYear}
                      onChange={event =>
                        updateReportDetails("reportingYear", event.target.value)
                      }
                      required
                    >
                      {reportingYears.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Submitted By <span>*</span>
                    </label>
                    <select disabled={isReadOnly}
                      value={reportDetails.submittedByUserId}
                      onChange={event =>
                        updateReportDetails("submittedByUserId", event.target.value)
                      }
                      required
                    >
                      <option value="">Select Name</option>
                      {users.map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Committee <span>*</span>
                    </label>
                    <select disabled={isReadOnly}
                      value={reportDetails.committeeId}
                      onChange={event =>
                        updateReportDetails("committeeId", event.target.value)
                      }
                      required
                    >
                      <option value="">Select Committee</option>
                      {committees.map(committee => (
                        <option
                          key={committee.committee_id}
                          value={committee.committee_id}
                        >
                          {committee.committee_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
              </form>
            </>
          ) : currentSection ===
          "Program Overview" ? (
            <>
              <h2>
                EVENT LOGISTICS / PROGRAM OVERVIEW
              </h2>

              <form className="entry-form">
                {validationMessage && (
                  <div className="form-validation-message">
                    {validationMessage}
                  </div>
                )}

                <div className="entry-form-group full-width">
                  <label>
                    Event / Program Name{" "}
                    <span>*</span>
                  </label>

                  <input disabled={isReadOnly}
                    type="text"
                    value={
                      programOverview.eventName
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "eventName",
                        event.target.value
                      )
                    }
                    placeholder="Enter event or program name"
                    required
                  />
                </div>

                <div className="entry-form-row">
                  <div className="entry-form-group">
                    <label>
                      Date <span>*</span>
                    </label>

                    <input disabled={isReadOnly}
                      type="date"
                      value={
                        programOverview.date
                      }
                      onChange={event =>
                        updateProgramOverview(
                          "date",
                          event.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="entry-form-group">
                    <label>
                      Time <span>*</span>
                    </label>

                    <input disabled={isReadOnly}
                      type="text"
                      value={
                        programOverview.time
                      }
                      onChange={event =>
                        updateProgramOverview(
                          "time",
                          event.target.value
                        )
                      }
                      placeholder="Enter time"
                      required
                    />
                  </div>
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Location / Format{" "}
                    <span>*</span>
                  </label>

                  <input disabled={isReadOnly}
                    type="text"
                    value={
                      programOverview.location
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "location",
                        event.target.value
                      )
                    }
                    placeholder="Enter location or format"
                    required
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Internal Partners
                  </label>

                  <input disabled={isReadOnly}
                    type="text"
                    value={
                      programOverview.internalPartners
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "internalPartners",
                        event.target.value
                      )
                    }
                    placeholder="Enter internal partners"
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    External Partners
                  </label>

                  <input disabled={isReadOnly}
                    type="text"
                    value={
                      programOverview.externalPartners
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "externalPartners",
                        event.target.value
                      )
                    }
                    placeholder="Enter external partners or collaborators"
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Program Thrust
                  </label>

                  <select disabled={isReadOnly}
                    value={
                      programOverview.programThrust
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "programThrust",
                        event.target.value
                      )
                    }
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
                    Population Served
                  </label>

                  <input disabled={isReadOnly}
                    type="text"
                    value={
                      programOverview.populationServed
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "populationServed",
                        event.target.value
                      )
                    }
                    placeholder="Enter population served"
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Expected Outcomes
                  </label>

                  <textarea disabled={isReadOnly}
                    value={
                      programOverview.expectedOutcomes
                    }
                    onChange={event =>
                      updateProgramOverview(
                        "expectedOutcomes",
                        event.target.value
                      )
                    }
                    placeholder="Enter expected outcomes"
                    rows="4"
                  />
                </div>

                <div className="entry-form-actions">
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={
                      handleSaveDraft
                    }
                  disabled={isReadOnly}
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={
                      handleSaveAndContinue
                    }
                  disabled={isReadOnly}
                  >
                    Save & Continue →
                  </button>
                </div>
              </form>
            </>
          ) : currentSection ===
            "Program Summary" ? (
            <>
              <h2>PROGRAM SUMMARY</h2>

              <form className="entry-form">
                {validationMessage && (
                  <div className="form-validation-message">
                    {validationMessage}
                  </div>
                )}

                <div className="entry-form-group full-width">
                  <label>
                    Program Summary{" "}
                    <span>*</span>
                  </label>

                  <textarea disabled={isReadOnly}
                    value={programSummary}
                    onChange={event =>
                      updateReportField(
                        "programSummary",
                        event.target.value
                      )
                    }
                    placeholder="Enter program summary"
                    rows="8"
                    required
                  />
                </div>

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
                    onClick={
                      handleSaveAndContinue
                    }
                  disabled={isReadOnly}
                  >
                    Save & Continue →
                  </button>
                </div>
              </form>
            </>
          ) : currentSection ===
            "Goals" ? (
            <>
              <h2>GOALS</h2>

              <form className="entry-form">
                {validationMessage && (
                  <div className="form-validation-message">
                    {validationMessage}
                  </div>
                )}

                <div className="entry-form-group full-width">
                  <label>
                    Goals <span>*</span>
                  </label>

                  <textarea disabled={isReadOnly}
                    value={goals}
                    onChange={event =>
                      updateReportField(
                        "goals",
                        event.target.value
                      )
                    }
                    placeholder="Enter program goals"
                    rows="8"
                    required
                  />
                </div>

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
                    onClick={
                      handleSaveAndContinue
                    }
                  disabled={isReadOnly}
                  >
                    Save & Continue →
                  </button>
                </div>
              </form>
            </>
          ) : currentSection ===
            "Recent Successes" ? (
            <>
              <h2>
                RECENT SUCCESSES
              </h2>

              <form className="entry-form">
                {validationMessage && (
                  <div className="form-validation-message">
                    {validationMessage}
                  </div>
                )}

                <div className="entry-form-group full-width">
                  <label>
                    Recent Successes{" "}
                    <span>*</span>
                  </label>

                  <textarea disabled={isReadOnly}
                    value={recentSuccesses}
                    onChange={event =>
                      updateReportField(
                        "recentSuccesses",
                        event.target.value
                      )
                    }
                    placeholder="Enter recent successes"
                    rows="8"
                    required
                  />
                </div>

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
                    onClick={
                      handleSaveAndContinue
                    }
                  disabled={isReadOnly}
                  >
                    Save & Continue →
                  </button>
                </div>
              </form>
            </>
          ) : currentSection ===
            "Challenges" ? (
            <>
              <h2>CHALLENGES</h2>

              <form className="entry-form">
                <div className="entry-form-group full-width">
                  <label>
                    Challenges
                  </label>

                  <textarea disabled={isReadOnly}
                    value={challenges}
                    onChange={event =>
                      updateReportField(
                        "challenges",
                        event.target.value
                      )
                    }
                    placeholder="Enter challenges or concerns"
                    rows="8"
                  />
                </div>

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
                    onClick={
                      handleSaveAndContinue
                    }
                  disabled={isReadOnly}
                  >
                    Save & Continue →
                  </button>
                </div>
              </form>
            </>
          ) : currentSection ===
            "Resources Needed" ? (
            <>
              <h2>
                RESOURCES NEEDED
              </h2>

              <form className="entry-form">
                {validationMessage && (
                  <div className="form-validation-message">
                    {validationMessage}
                  </div>
                )}

                <div className="entry-form-group full-width">
                  <label>
                    Resources Needed
                  </label>

                  <textarea disabled={isReadOnly}
                    value={resourcesNeeded}
                    onChange={event =>
                      updateReportField(
                        "resourcesNeeded",
                        event.target.value
                      )
                    }
                    placeholder="Enter resources, support, or assistance needed"
                    rows="8"
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Financial Request
                  </label>

                  <input
                    disabled={isReadOnly}
                    type="number"
                    min="0"
                    step="0.01"
                    value={financialRequest}
                    onChange={event =>
                      updateReportField(
                        "financialRequest",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="entry-form-group full-width">
                  <label>
                    Financial Request Description
                    {Number(financialRequest) > 0 && <span> *</span>}
                  </label>

                  <textarea
                    disabled={isReadOnly}
                    value={financialRequestDescription}
                    onChange={event =>
                      updateReportField(
                        "financialRequestDescription",
                        event.target.value
                      )
                    }
                    placeholder="Describe what the requested funds will be used for"
                    rows="4"
                    required={Number(financialRequest) > 0}
                  />
                </div>

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
                    onClick={
                      handleSaveAndContinue
                    }
                  disabled={isReadOnly}
                  >
                    Save & Continue →
                  </button>
                </div>
              </form>
            </>
          ) : currentSection ===
            "Action Items" ? (
            <>
              <div className="structured-section-header">
                <div>
                  <h2>ACTION ITEMS</h2>
                  <p>
                    Add action items,
                    owners, due dates,
                    status, and notes.
                  </p>
                </div>

                <button
                  type="button"
                  className="add-row-button"
                  onClick={
                    addActionItem
                  }
                  disabled={isReadOnly}
                >
                  <FaPlus />
                  Add Action Item
                </button>
              </div>

              <div className="structured-entry-table">
                <div className="structured-entry-header">
                  <span>
                    Action Item
                  </span>
                  <span>Owner</span>
                  <span>
                    Due Date
                  </span>
                  <span>Status</span>
                  <span>Notes</span>
                  <span></span>
                </div>

                {actionItems.map(
                  (item, index) => (
                    <div
                      className="structured-entry-row"
                      key={index}
                    >
                      <input disabled={isReadOnly}
                        type="text"
                        value={
                          item.actionItem
                        }
                        onChange={
                          event =>
                            updateActionItem(
                              index,
                              "actionItem",
                              event.target
                                .value
                            )
                        }
                        placeholder="Enter action item"
                      />

                      <input disabled={isReadOnly}
                        type="text"
                        value={item.owner}
                        onChange={
                          event =>
                            updateActionItem(
                              index,
                              "owner",
                              event.target
                                .value
                            )
                        }
                        placeholder="Owner"
                      />

                      <input disabled={isReadOnly}
                        type="date"
                        value={
                          item.dueDate
                        }
                        onChange={
                          event =>
                            updateActionItem(
                              index,
                              "dueDate",
                              event.target
                                .value
                            )
                        }
                      />

                      <input disabled={isReadOnly}
                        type="text"
                        value={item.status}
                        onChange={
                          event =>
                            updateActionItem(
                              index,
                              "status",
                              event.target
                                .value
                            )
                        }
                        placeholder="Status"
                      />

                      <input disabled={isReadOnly}
                        type="text"
                        value={item.notes}
                        onChange={
                          event =>
                            updateActionItem(
                              index,
                              "notes",
                              event.target
                                .value
                            )
                        }
                        placeholder="Notes"
                      />

                      <button
                        type="button"
                        className="remove-row-button"
                        title="Remove action item"
                        onClick={() =>
                          removeActionItem(
                            index
                          )
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )
                )}
              </div>

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
                  onClick={
                    handleSaveAndContinue
                  }
                  disabled={isReadOnly}
                >
                  Save & Continue →
                </button>
              </div>
            </>
          ) : currentSection ===
            "Dates to Remember" ? (
            <>
              <div className="structured-section-header">
                <div>
                  <h2>
                    DATES TO REMEMBER
                  </h2>
                  <p>
                    Add important dates,
                    deadlines, and
                    responsible owners.
                  </p>
                </div>

                <button
                  type="button"
                  className="add-row-button"
                  onClick={
                    addDateToRemember
                  }
                  disabled={isReadOnly}
                >
                  <FaPlus />
                  Add Date
                </button>
              </div>

              <div className="structured-entry-table dates-table">
                <div className="structured-entry-header">
                  <span>Date</span>
                  <span>
                    Item / Deadline
                  </span>
                  <span>Owner</span>
                  <span></span>
                </div>

                {datesToRemember.map(
                  (item, index) => (
                    <div
                      className="structured-entry-row"
                      key={index}
                    >
                      <input disabled={isReadOnly}
                        type="date"
                        value={item.date}
                        onChange={
                          event =>
                            updateDateToRemember(
                              index,
                              "date",
                              event.target
                                .value
                            )
                        }
                      />

                      <input disabled={isReadOnly}
                        type="text"
                        value={item.item}
                        onChange={
                          event =>
                            updateDateToRemember(
                              index,
                              "item",
                              event.target
                                .value
                            )
                        }
                        placeholder="Enter item or deadline"
                      />

                      <input disabled={isReadOnly}
                        type="text"
                        value={item.owner}
                        onChange={
                          event =>
                            updateDateToRemember(
                              index,
                              "owner",
                              event.target
                                .value
                            )
                        }
                        placeholder="Owner"
                      />

                      <button
                        type="button"
                        className="remove-row-button"
                        title="Remove date"
                        onClick={() =>
                          removeDateToRemember(
                            index
                          )
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )
                )}
              </div>

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
                  onClick={
                    handleSaveAndContinue
                  }
                  disabled={isReadOnly}
                >
                  Save & Continue →
                </button>
              </div>
            </>
          ) : currentSection ===
            "Budget" ? (
            <>
              <div className="structured-section-header">
                <div>
                  <h2>BUDGET</h2>
                  <p>
                    Add budget categories,
                    estimated costs,
                    actual costs, and
                    notes.
                  </p>
                </div>

                <button
                  type="button"
                  className="add-row-button"
                  onClick={addBudgetItem}
                  disabled={isReadOnly}
                >
                  <FaPlus />
                  Add Budget Item
                </button>
              </div>

              <div className="structured-entry-table budget-table">
                <div className="structured-entry-header">
                  <span>Category</span>
                  <span>
                    Estimated Cost
                  </span>
                  <span>
                    Actual Cost
                  </span>
                  <span>Notes</span>
                  <span></span>
                </div>

                {budgetItems.map(
                  (item, index) => (
                    <div
                      className="structured-entry-row"
                      key={index}
                    >
                      <input disabled={isReadOnly}
                        type="text"
                        value={
                          item.category
                        }
                        onChange={
                          event =>
                            updateBudgetItem(
                              index,
                              "category",
                              event.target
                                .value
                            )
                        }
                        placeholder="Enter category"
                      />

                      <input disabled={isReadOnly}
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.estimatedCost
                        }
                        onChange={
                          event =>
                            updateBudgetItem(
                              index,
                              "estimatedCost",
                              event.target
                                .value
                            )
                        }
                        placeholder="0.00"
                      />

                      <input disabled={isReadOnly}
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.actualCost
                        }
                        onChange={
                          event =>
                            updateBudgetItem(
                              index,
                              "actualCost",
                              event.target
                                .value
                            )
                        }
                        placeholder="0.00"
                      />

                      <input disabled={isReadOnly}
                        type="text"
                        value={item.notes}
                        onChange={
                          event =>
                            updateBudgetItem(
                              index,
                              "notes",
                              event.target
                                .value
                            )
                        }
                        placeholder="Notes"
                      />

                      <button
                        type="button"
                        className="remove-row-button"
                        title="Remove budget item"
                        onClick={() =>
                          removeBudgetItem(
                            index
                          )
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )
                )}

                <div className="budget-totals">
                  <span>TOTAL</span>

                  <span>
                    $
                    {estimatedTotal.toFixed(
                      2
                    )}
                  </span>

                  <span>
                    $
                    {actualTotal.toFixed(
                      2
                    )}
                  </span>

                  <span></span>
                  <span></span>
                </div>
              </div>

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
                  onClick={
                    handleSaveAndContinue
                  }
                  disabled={isReadOnly}
                >
                  Save & Review →
                </button>
              </div>
            </>
          ) : currentSection ===
            "Review" ? (
            <section className="report-preview">
              <div className="report-preview-paper">
                <div className="report-preview-header">
                  <div>
                    <p className="report-preview-brand">MACReporting</p>
                    <h1>Committee Report</h1>
                    <p className="report-preview-subtitle">
                      {selectedCommitteeName() || "Committee not selected"}
                      {" • "}
                      {reportDetails.reportingMonth && reportDetails.reportingYear
                        ? `${reportDetails.reportingMonth} ${reportDetails.reportingYear}`
                        : "Reporting period not selected"}
                    </p>
                  </div>

                  <div className="report-preview-status">
                    <span>Status</span>
                    <strong>{reportStatus.replaceAll("_", " ").toUpperCase()}</strong>
                  </div>
                </div>

                <div className="report-preview-divider"></div>

                <section className="preview-section">
                  <div className="preview-section-heading">
                        <h2>Report Details</h2>
                        <button
                          type="button"
                          className="preview-edit-button"
                          onClick={() => editSection("Report Details")}
                        >
                          Edit
                        </button>
                      </div>

                      <div className="preview-detail-grid">
                        <div>
                          <span className="preview-label">Reporting Month</span>
                          <span className="preview-value">
                            {displayValue(reportDetails.reportingMonth)}
                          </span>
                        </div>

                        <div>
                          <span className="preview-label">Reporting Year</span>
                          <span className="preview-value">
                            {displayValue(reportDetails.reportingYear)}
                          </span>
                        </div>

                        <div>
                          <span className="preview-label">Submitted By</span>
                          <span className="preview-value">
                            {selectedSubmitterName() || "—"}
                          </span>
                        </div>

                        <div>
                          <span className="preview-label">Committee</span>
                          <span className="preview-value">
                            {selectedCommitteeName() || "—"}
                          </span>
                        </div>
                      </div>
                    </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>Program Overview</h2>
                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Program Overview"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-detail-grid">
                    <div>
                      <span className="preview-label">Event / Program Name</span>
                      <span className="preview-value">
                        {displayValue(
                          programOverview.eventName
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        Date
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.date
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        Time
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.time
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        Location / Format
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.location
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        Program Thrust
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.programThrust
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        Population Served
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.populationServed
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        Internal Partners
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.internalPartners
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="preview-label">
                        External Partners
                      </span>

                      <span className="preview-value">
                        {displayValue(
                          programOverview.externalPartners
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="preview-narrative-block">
                    <h3>
                      Expected Outcomes
                    </h3>

                    <p>
                      {displayValue(
                        programOverview.expectedOutcomes
                      )}
                    </p>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>
                      Program Summary
                    </h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Program Summary"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-narrative-block">
                    <p>
                      {displayValue(
                        programSummary
                      )}
                    </p>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>Goals</h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Goals"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-narrative-block">
                    <p>
                      {displayValue(
                        goals
                      )}
                    </p>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>
                      Recent Successes
                    </h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Recent Successes"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-narrative-block">
                    <p>
                      {displayValue(
                        recentSuccesses
                      )}
                    </p>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>
                      Challenges
                    </h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Challenges"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-narrative-block">
                    <p>
                      {displayValue(
                        challenges
                      )}
                    </p>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>
                      Resources Needed
                    </h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Resources Needed"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-narrative-block">
                    <p>
                      {displayValue(
                        resourcesNeeded
                      )}
                    </p>
                  </div>

                  <div className="preview-narrative-block">
                    <h3>
                      Financial Request
                    </h3>

                    <p>
                      {financialRequest !== ""
                        ? displayCurrency(financialRequest)
                        : "—"}
                    </p>
                  </div>

                  <div className="preview-narrative-block">
                    <h3>
                      Financial Request Description
                    </h3>

                    <p>
                      {displayValue(financialRequestDescription)}
                    </p>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>
                      Action Items
                    </h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Action Items"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  {actionItems.some(
                    item =>
                      item.actionItem ||
                      item.owner ||
                      item.dueDate ||
                      item.status ||
                      item.notes
                  ) ? (
                    <div className="preview-table-wrap">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>
                              Action Item
                            </th>
                            <th>
                              Owner
                            </th>
                            <th>
                              Due Date
                            </th>
                            <th>
                              Status
                            </th>
                            <th>
                              Notes
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {actionItems
                            .filter(
                              item =>
                                item.actionItem ||
                                item.owner ||
                                item.dueDate ||
                                item.status ||
                                item.notes
                            )
                            .map(
                              (
                                item,
                                index
                              ) => (
                                <tr
                                  key={
                                    index
                                  }
                                >
                                  <td>
                                    {displayValue(
                                      item.actionItem
                                    )}
                                  </td>

                                  <td>
                                    {displayValue(
                                      item.owner
                                    )}
                                  </td>

                                  <td>
                                    {displayValue(
                                      item.dueDate
                                    )}
                                  </td>

                                  <td>
                                    {displayValue(
                                      item.status
                                    )}
                                  </td>

                                  <td>
                                    {displayValue(
                                      item.notes
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="preview-empty">
                      No action items entered.
                    </p>
                  )}
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>
                      Dates to Remember
                    </h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Dates to Remember"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-table-wrap">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>
                            Item / Deadline
                          </th>
                          <th>
                            Owner
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {datesToRemember.map(
                          (
                            item,
                            index
                          ) => (
                            <tr
                              key={
                                index
                              }
                            >
                              <td>
                                {displayValue(
                                  item.date
                                )}
                              </td>

                              <td>
                                {displayValue(
                                  item.item
                                )}
                              </td>

                              <td>
                                {displayValue(
                                  item.owner
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="preview-section">
                  <div className="preview-section-heading">
                    <h2>Budget</h2>

                    <button
                      type="button"
                      className="preview-edit-button"
                      onClick={() =>
                        editSection(
                          "Budget"
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <div className="preview-table-wrap">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>
                            Category
                          </th>
                          <th>
                            Estimated Cost
                          </th>
                          <th>
                            Actual Cost
                          </th>
                          <th>
                            Notes
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {budgetItems.map(
                          (
                            item,
                            index
                          ) => (
                            <tr
                              key={
                                index
                              }
                            >
                              <td>
                                {displayValue(
                                  item.category
                                )}
                              </td>

                              <td>
                                {item.estimatedCost === "" ||
                                item.estimatedCost === null ||
                                item.estimatedCost === undefined
                                  ? "—"
                                  : displayCurrency(
                                      item.estimatedCost
                                    )}
                              </td>

                              <td>
                                {item.actualCost === "" ||
                                item.actualCost === null ||
                                item.actualCost === undefined
                                  ? "—"
                                  : displayCurrency(
                                      item.actualCost
                                    )}
                              </td>

                              <td>
                                {displayValue(
                                  item.notes
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>

                      <tfoot>
                        <tr>
                          <td>
                            <strong>
                              Total
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {displayCurrency(
                                estimatedTotal
                              )}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {displayCurrency(
                                actualTotal
                              )}
                            </strong>
                          </td>

                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                <div className="report-preview-footer">
                  <div>
                    <span className="preview-label">
                      Report ID
                    </span>

                    <span className="preview-value">
                      {reportId || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Committee
                    </span>

                    <span className="preview-value">
                      {selectedCommitteeName() || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="preview-label">
                      Reporting Period
                    </span>

                    <span className="preview-value">
                      {reportDetails.reportingMonth && reportDetails.reportingYear
                        ? `${reportDetails.reportingMonth} ${reportDetails.reportingYear}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="report-preview-actions">
                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={() =>
                    setCurrentSection(
                      "Budget"
                    )
                  }
                >
                  ← Back
                </button>

                {isReviewerView ? (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() => setCurrentSection("Reviewer Action")}
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
                ) : (
                  <>
                    {reportStatus !== "locked" && (
                      <button type="button" className="primary-action-button" onClick={handleSubmitReport} disabled={!reportId || isReadOnly}>
                        {isReadOnly ? "Report Submitted" : reportStatus === "returned_for_changes" ? "Resubmit Report" : "Submit Report"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>
          ) : currentSection === "Reviewer Action" ? (
            <section>
              <div className="reviewer-action-header">
                <h2>Reviewer Action</h2>
                <p>Review this submitted report and choose an action below.</p>
              </div>

              <div className="entry-form">
                {reviewError && (
                  <div className="form-validation-message">{reviewError}</div>
                )}

                {reviewMessage && (
                  <div className="form-save-message">{reviewMessage}</div>
                )}

                <div className="reviewer-summary-card">
                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">Reviewer</span>
                    <span className="reviewer-summary-value">{reviewerName}</span>
                  </div>

                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">Committee</span>
                    <span className="reviewer-summary-value">
                      {selectedCommitteeName() || "—"}
                    </span>
                  </div>

                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">Status</span>
                    <span className={`status-badge ${reportStatus}`}>
                      {reportStatus.replaceAll("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="entry-form-group full-width reviewer-comments-group">
                  <label>Reviewer Comments</label>
                  <p className="field-helper-text">
                    Comments are required when returning a report for changes and optional when approving.
                  </p>
                  <textarea
                    value={reviewComments}
                    onChange={event => {
                      setReviewComments(event.target.value);
                      if (reviewError) setReviewError("");
                    }}
                    rows="6"
                    placeholder="Enter comments for the committee chair..."
                  />
                </div>

                <div className="reviewer-action-buttons">
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={handleReturnForChanges}
                  >
                    ← Return for Changes
                  </button>

                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={handleApproveReport}
                  >
                    Approve Report ✓
                  </button>
                </div>
              </div>
            </section>
          ) : currentSection === "Finalization Action" ? (
            <section>
              <div className="reviewer-action-header">
                <h2>Finalization Action</h2>
                <p>
                  Lock this approved report to complete the reporting workflow.
                  Once locked, the report is read-only and ready for final PDF generation.
                </p>
              </div>

              <div className="entry-form">
                {lockError && <div className="form-validation-message">{lockError}</div>}
                {lockMessage && <div className="form-save-message">{lockMessage}</div>}

                <div className="reviewer-summary-card">
                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">Finalized By</span>
                    <span className="reviewer-summary-value">{finalizerName}</span>
                  </div>
                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">Committee</span>
                    <span className="reviewer-summary-value">{selectedCommitteeName() || "—"}</span>
                  </div>
                  <div className="reviewer-summary-item">
                    <span className="reviewer-summary-label">Status</span>
                    <span className={`status-badge ${reportStatus}`}>
                      {reportStatus.replaceAll("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="entry-form-group full-width reviewer-comments-group">
                  <label>Finalization Comments</label>
                  <p className="field-helper-text">
                    Comments are optional and will be saved with the report's status history.
                  </p>
                  <textarea
                    value={lockComments}
                    onChange={event => {
                      setLockComments(event.target.value);
                      if (lockError) setLockError("");
                    }}
                    rows="6"
                    placeholder="Enter optional finalization comments..."
                  />
                </div>

                <div className="reviewer-action-buttons">
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() => setCurrentSection("Review")}
                  >
                    ← Back to Review
                  </button>
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={handleLockReport}
                  >
                    Lock Report
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="section-placeholder">
              <h2>
                {currentSection.toUpperCase()}
              </h2>

              <p>
                The {currentSection} section
                will be added as part of the
                Committee Report workflow.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default CommitteeReportEntry;
