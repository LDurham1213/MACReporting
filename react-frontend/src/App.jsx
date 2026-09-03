import { useEffect, useState } from "react";
import ReportTemplate from "./components/ReportTemplate";
import Home from "./pages/Home";
import ReportOptions from "./pages/ReportOptions";
import CommitteeReportEntry from "./pages/CommitteeReportEntry";
import "./App.css";

const PAGE_STORAGE_KEY = "macreporting_current_page";
const REPORT_TYPE_STORAGE_KEY = "macreporting_selected_report_type";
const COMMITTEE_REPORT_STORAGE_KEY = "macreporting_committee_report_id";

function App() {
  // =========================================================
  // STATE
  // =========================================================

  // Application Navigation State
  const [currentPage, setCurrentPage] = useState(
    () => localStorage.getItem(PAGE_STORAGE_KEY) || "home"
  );

  const [selectedReportType, setSelectedReportType] = useState(
    () => localStorage.getItem(REPORT_TYPE_STORAGE_KEY) || null
  );

  // Report Template State
  const [reportTemplates, setReportTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Question State
  const [questions, setQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionSection, setQuestionSection] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [questionRequired, setQuestionRequired] = useState(0);
  const [questionOrder, setQuestionOrder] = useState("");
  const [addingNewSection, setAddingNewSection] = useState(false);

  // =========================================================
  // PERSIST NAVIGATION STATE
  // =========================================================

  useEffect(() => {
    localStorage.setItem(PAGE_STORAGE_KEY, currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedReportType) {
      localStorage.setItem(REPORT_TYPE_STORAGE_KEY, selectedReportType);
    } else {
      localStorage.removeItem(REPORT_TYPE_STORAGE_KEY);
    }
  }, [selectedReportType]);

  // =========================================================
  // LOAD REPORT TEMPLATES WHEN REACT STARTS
  // =========================================================

  useEffect(() => {
    fetch("http://127.0.0.1:5000/report-templates")
      .then(response => response.json())
      .then(data => setReportTemplates(data))
      .catch(error => console.error("Error loading report templates:", error));
  }, []);

  // =========================================================
  // NAVIGATION FUNCTIONS
  // =========================================================

  function selectReportType(reportType) {
    setSelectedReportType(reportType);
    setCurrentPage("report-options");
  }

  function goHome() {
    setSelectedReportType(null);
    setCurrentPage("home");
  }

  function createNewReport() {
    if (selectedReportType === "committee") {
      localStorage.removeItem(COMMITTEE_REPORT_STORAGE_KEY);
      setCurrentPage("committee-entry");
    } else {
      console.log("Post-Mortem entry screen not built yet");
    }
  }

  function goToReportOptions() {
    setCurrentPage("report-options");
  }

  // =========================================================
  // REPORT TEMPLATE FUNCTIONS
  // =========================================================

  function loadQuestions(template) {
    setShowTemplateForm(false);
    setShowQuestionForm(false);
    setEditingTemplateId(null);
    setEditingQuestionId(null);
    setAddingNewSection(false);
    setSelectedTemplate(template);

    fetch(`http://127.0.0.1:5000/report-templates/${template.id}/questions`)
      .then(response => response.json())
      .then(data => setQuestions(data))
      .catch(error => console.error("Error loading questions:", error));
  }

  function editTemplate() {
    setEditingTemplateId(selectedTemplate.id);
    setTemplateName(selectedTemplate.name);
    setTemplateDescription(selectedTemplate.description);
    setShowQuestionForm(false);
    setShowTemplateForm(true);
  }

  function saveTemplate(event) {
    event.preventDefault();

    const url = editingTemplateId
      ? `http://127.0.0.1:5000/report-templates/${editingTemplateId}`
      : "http://127.0.0.1:5000/report-templates";

    const method = editingTemplateId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateName,
        description: templateDescription
      })
    })
      .then(response => response.json())
      .then(savedTemplate => {
        if (editingTemplateId) {
          setReportTemplates(
            reportTemplates.map(template =>
              template.id === editingTemplateId ? savedTemplate : template
            )
          );
          setSelectedTemplate(savedTemplate);
        } else {
          setReportTemplates([...reportTemplates, savedTemplate]);
        }

        setTemplateName("");
        setTemplateDescription("");
        setEditingTemplateId(null);
        setShowTemplateForm(false);
      })
      .catch(error => console.error("Error saving template:", error));
  }

  function deleteTemplate(templateId) {
    fetch(`http://127.0.0.1:5000/report-templates/${templateId}`, {
      method: "DELETE"
    })
      .then(response => response.json())
      .then(() => {
        setReportTemplates(
          reportTemplates.filter(template => template.id !== templateId)
        );
        setSelectedTemplate(null);
        setQuestions([]);
        setShowTemplateForm(false);
        setShowQuestionForm(false);
      })
      .catch(error => console.error("Error deleting template:", error));
  }

  // =========================================================
  // QUESTION FUNCTIONS
  // =========================================================

  function editQuestion(question) {
    setEditingQuestionId(question.id);
    setQuestionSection(question.section_name);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setQuestionRequired(question.required);
    setQuestionOrder(question.display_order);
    setAddingNewSection(false);
    setShowQuestionForm(true);
  }

  function saveQuestion(event) {
    event.preventDefault();

    const url = editingQuestionId
      ? `http://127.0.0.1:5000/questions/${editingQuestionId}`
      : "http://127.0.0.1:5000/questions";

    const method = editingQuestionId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_template_id: selectedTemplate.id,
        section_name: questionSection,
        question_text: questionText,
        question_type: questionType,
        required: Number(questionRequired),
        display_order: Number(questionOrder)
      })
    })
      .then(response => response.json())
      .then(savedQuestion => {
        if (editingQuestionId) {
          setQuestions(
            questions.map(question =>
              question.id === editingQuestionId ? savedQuestion : question
            )
          );
        } else {
          setQuestions([...questions, savedQuestion]);
        }

        setEditingQuestionId(null);
        setQuestionSection("");
        setQuestionText("");
        setQuestionType("");
        setQuestionRequired(0);
        setQuestionOrder("");
        setAddingNewSection(false);
        setShowQuestionForm(false);
      })
      .catch(error => console.error("Error saving question:", error));
  }

  function deleteQuestion(questionId) {
    fetch(`http://127.0.0.1:5000/questions/${questionId}`, {
      method: "DELETE"
    })
      .then(response => response.json())
      .then(() => {
        setQuestions(
          questions.filter(question => question.id !== questionId)
        );
      })
      .catch(error => console.error("Error deleting question:", error));
  }

  // =========================================================
  // SECTION NAMES
  // =========================================================

  const sectionNames = [
    ...new Set(
      questions
        .map(question => question.section_name)
        .filter(section => section)
    )
  ];

  // =========================================================
  // PAGE ROUTING
  // =========================================================

  if (currentPage === "home") {
    return <Home onSelectReportType={selectReportType} />;
  }

  if (currentPage === "report-options") {
    return (
      <ReportOptions
        selectedReportType={selectedReportType}
        onCreateNew={createNewReport}
        onBack={goHome}
      />
    );
  }

  if (currentPage === "committee-entry") {
    return (<CommitteeReportEntry onBack={goToReportOptions} onHome={goHome}/>);
  }

  // =========================================================
  // JSX - REPORT TEMPLATE ADMINISTRATION
  // =========================================================

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="chapter-label">FUTURE REPORT APP</p>
          <h1>MACReporting</h1>
          <p className="header-description">Report Template Administration</p>
        </div>
      </header>

      <main className="dashboard">
        <aside className="template-panel">
          <div className="panel-heading">
            <h2>Report Templates</h2>
            <span>{reportTemplates.length}</span>
          </div>

          <div className="template-list">
            {reportTemplates.map(template => (
              <ReportTemplate
                key={template.id}
                template={template}
                selected={selectedTemplate?.id === template.id}
                onViewQuestions={loadQuestions}
              />
            ))}
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateName("");
              setTemplateDescription("");
              setShowQuestionForm(false);
              setAddingNewSection(false);
              setShowTemplateForm(true);
            }}
          >
            + Add Template
          </button>
        </aside>

        <section className="detail-panel">
          {showTemplateForm ? (
            <div className="template-form-panel">
              <p className="section-label">Template Management</p>
              <h2>{editingTemplateId ? "Edit Report Template" : "Add Report Template"}</h2>

              <form onSubmit={saveTemplate}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={event => setTemplateName(event.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={event => setTemplateDescription(event.target.value)}
                  />
                </div>

                <div className="action-buttons">
                  <button type="submit" className="primary-button">
                    {editingTemplateId ? "Update Template" : "Save Template"}
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => {
                      setShowTemplateForm(false);
                      setEditingTemplateId(null);
                      setTemplateName("");
                      setTemplateDescription("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedTemplate ? (
            <>
              <div className="detail-header">
                <div>
                  <p className="section-label">Selected Report</p>
                  <h2>{selectedTemplate.name}</h2>
                  <p>{selectedTemplate.description}</p>
                </div>

                <div className="action-buttons">
                  <button className="edit-button" onClick={editTemplate}>Edit</button>
                  <button
                    className="delete-button"
                    onClick={() => deleteTemplate(selectedTemplate.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="questions-section">
                <div className="questions-heading">
                  <div>
                    <p className="section-label">Report Configuration</p>
                    <h3>Questions</h3>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setEditingQuestionId(null);
                      setQuestionSection("");
                      setQuestionText("");
                      setQuestionType("");
                      setQuestionRequired(0);
                      setAddingNewSection(false);

                      const nextOrder =
                        questions.length > 0
                          ? Math.max(
                              ...questions.map(question =>
                                Number(question.display_order)
                              )
                            ) + 1
                          : 1;

                      setQuestionOrder(nextOrder);
                      setShowQuestionForm(true);
                    }}
                  >
                    + Add Question
                  </button>
                </div>

                {showQuestionForm ? (
                  <div className="question-form-panel">
                    <p className="section-label">Question Management</p>
                    <h3>{editingQuestionId ? "Edit Question" : "Add Question"}</h3>

                    <form onSubmit={saveQuestion}>
                      <div className="form-group">
                        <label>Section Name</label>

                        {sectionNames.length === 0 || addingNewSection ? (
                          <input
                            type="text"
                            value={questionSection}
                            placeholder="Enter section name"
                            onChange={event => setQuestionSection(event.target.value)}
                            required
                          />
                        ) : (
                          <select
                            value={questionSection}
                            onChange={event => {
                              if (event.target.value === "new-section") {
                                setQuestionSection("");
                                setAddingNewSection(true);
                              } else {
                                setQuestionSection(event.target.value);
                              }
                            }}
                            required
                          >
                            <option value="">Select Section</option>
                            {sectionNames.map(section => (
                              <option key={section} value={section}>{section}</option>
                            ))}
                            <option value="new-section">+ New Section</option>
                          </select>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Question</label>
                        <textarea
                          value={questionText}
                          onChange={event => setQuestionText(event.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Question Type</label>
                        <select
                          value={questionType}
                          onChange={event => setQuestionType(event.target.value)}
                          required
                        >
                          <option value="">Select Type</option>
                          <option value="text">Text</option>
                          <option value="textarea">Long Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Required</label>
                        <select
                          value={questionRequired}
                          onChange={event => setQuestionRequired(Number(event.target.value))}
                        >
                          <option value={0}>No</option>
                          <option value={1}>Yes</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Display Order</label>
                        <input
                          type="number"
                          value={questionOrder}
                          onChange={event => setQuestionOrder(event.target.value)}
                        />
                      </div>

                      <div className="action-buttons">
                        <button type="submit" className="primary-button">
                          {editingQuestionId ? "Update Question" : "Save Question"}
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => {
                            setShowQuestionForm(false);
                            setEditingQuestionId(null);
                            setQuestionSection("");
                            setQuestionText("");
                            setQuestionType("");
                            setQuestionRequired(0);
                            setQuestionOrder("");
                            setAddingNewSection(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="question-table">
                    <div className="question-table-header">
                      <span>Question</span>
                      <span>Section</span>
                      <span>Type</span>
                      <span>Actions</span>
                    </div>

                    {questions.map(question => (
                      <div className="question-row" key={question.id}>
                        <span className="question-text">{question.question_text}</span>
                        <span>{question.section_name}</span>
                        <span>{question.question_type}</span>

                        <span className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => editQuestion(question)}
                          >
                            Edit
                          </button>

                          <button
                            className="text-button delete-text"
                            onClick={() => deleteQuestion(question.id)}
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Select a Report Template</h2>
              <p>
                Choose a report template from the left to view its information
                and questions.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;