import { useEffect, useState } from "react";
import ReportTemplate from "./components/ReportTemplate";
import "./App.css";


function App() {

  // =========================================================
  // STATE
  // =========================================================

  // -------------------------
  // Report Template State
  // -------------------------

  const [reportTemplates, setReportTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");


  // -------------------------
  // Question State
  // -------------------------

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
  // LOAD REPORT TEMPLATES WHEN REACT STARTS
  // =========================================================

  useEffect(() => {

    fetch("http://127.0.0.1:5000/report-templates")

      .then(response => response.json())

      .then(data => {
        setReportTemplates(data);
      })

      .catch(error => {
        console.error(
          "Error loading report templates:",
          error
        );
      });

  }, []);


  // =========================================================
  // REPORT TEMPLATE FUNCTIONS
  // =========================================================


  // ---------------------------------------------------------
  // READ TEMPLATE / LOAD ITS QUESTIONS
  // ---------------------------------------------------------

  function loadQuestions(template) {

    // Close any forms that may already be open
    setShowTemplateForm(false);
    setShowQuestionForm(false);

    setEditingTemplateId(null);
    setEditingQuestionId(null);

    setAddingNewSection(false);

    // Remember which template was selected
    setSelectedTemplate(template);

    // Retrieve the questions that belong to this template
    fetch(
      `http://127.0.0.1:5000/report-templates/${template.id}/questions`
    )

      .then(response => response.json())

      .then(data => {
        setQuestions(data);
      })

      .catch(error => {
        console.error(
          "Error loading questions:",
          error
        );
      });
  }


  // ---------------------------------------------------------
  // OPEN TEMPLATE EDIT FORM
  // ---------------------------------------------------------

  function editTemplate() {

    setEditingTemplateId(selectedTemplate.id);

    setTemplateName(selectedTemplate.name);
    setTemplateDescription(selectedTemplate.description);

    setShowQuestionForm(false);
    setShowTemplateForm(true);
  }


  // ---------------------------------------------------------
  // CREATE OR UPDATE TEMPLATE
  // ---------------------------------------------------------

  function saveTemplate(event) {

    event.preventDefault();

    const url = editingTemplateId
      ? `http://127.0.0.1:5000/report-templates/${editingTemplateId}`
      : "http://127.0.0.1:5000/report-templates";

    const method = editingTemplateId
      ? "PUT"
      : "POST";


    fetch(url, {

      method: method,

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        name: templateName,
        description: templateDescription
      })

    })

      .then(response => response.json())

      .then(savedTemplate => {

        // UPDATE
        if (editingTemplateId) {

          setReportTemplates(
            reportTemplates.map(template =>
              template.id === editingTemplateId
                ? savedTemplate
                : template
            )
          );

          setSelectedTemplate(savedTemplate);

        }

        // CREATE
        else {

          setReportTemplates([
            ...reportTemplates,
            savedTemplate
          ]);

        }


        // Clear the Template form
        setTemplateName("");
        setTemplateDescription("");

        setEditingTemplateId(null);
        setShowTemplateForm(false);

      })

      .catch(error => {

        console.error(
          "Error saving template:",
          error
        );

      });
  }


  // ---------------------------------------------------------
  // DELETE TEMPLATE
  // ---------------------------------------------------------

  function deleteTemplate(templateId) {

    fetch(
      `http://127.0.0.1:5000/report-templates/${templateId}`,
      {
        method: "DELETE"
      }
    )

      .then(response => response.json())

      .then(() => {

        // Remove the deleted template from React state
        setReportTemplates(
          reportTemplates.filter(
            template => template.id !== templateId
          )
        );

        // Clear selected-template area
        setSelectedTemplate(null);
        setQuestions([]);

        setShowTemplateForm(false);
        setShowQuestionForm(false);

      })

      .catch(error => {

        console.error(
          "Error deleting template:",
          error
        );

      });
  }


  // =========================================================
  // QUESTION FUNCTIONS
  // =========================================================


  // ---------------------------------------------------------
  // OPEN QUESTION EDIT FORM
  // ---------------------------------------------------------

  function editQuestion(question) {

    setEditingQuestionId(question.id);

    setQuestionSection(question.section_name);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setQuestionRequired(question.required);
    setQuestionOrder(question.display_order);

    // We are editing an existing section,
    // not creating a new section
    setAddingNewSection(false);

    setShowQuestionForm(true);
  }


  // ---------------------------------------------------------
  // CREATE OR UPDATE QUESTION
  // ---------------------------------------------------------

  function saveQuestion(event) {

    event.preventDefault();

    const url = editingQuestionId
      ? `http://127.0.0.1:5000/questions/${editingQuestionId}`
      : "http://127.0.0.1:5000/questions";

    const method = editingQuestionId
      ? "PUT"
      : "POST";


    fetch(url, {

      method: method,

      headers: {
        "Content-Type": "application/json"
      },

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

        // UPDATE
        if (editingQuestionId) {

          setQuestions(
            questions.map(question =>
              question.id === editingQuestionId
                ? savedQuestion
                : question
            )
          );

        }

        // CREATE
        else {

          setQuestions([
            ...questions,
            savedQuestion
          ]);

        }


        // Clear Question form state
        setEditingQuestionId(null);

        setQuestionSection("");
        setQuestionText("");
        setQuestionType("");
        setQuestionRequired(0);
        setQuestionOrder("");

        setAddingNewSection(false);

        setShowQuestionForm(false);

      })

      .catch(error => {

        console.error(
          "Error saving question:",
          error
        );

      });
  }


  // ---------------------------------------------------------
  // DELETE QUESTION
  // ---------------------------------------------------------

  function deleteQuestion(questionId) {

    fetch(
      `http://127.0.0.1:5000/questions/${questionId}`,
      {
        method: "DELETE"
      }
    )

      .then(response => response.json())

      .then(() => {

        // Remove deleted question from React state
        setQuestions(
          questions.filter(
            question => question.id !== questionId
          )
        );

      })

      .catch(error => {

        console.error(
          "Error deleting question:",
          error
        );

      });
  }


  // =========================================================
  // SECTION NAMES
  // =========================================================

  // Build a unique list of Section Names
  // from the questions belonging to the selected template.

  const sectionNames = [

    ...new Set(

      questions
        .map(question => question.section_name)
        .filter(section => section)

    )

  ];


  // =========================================================
  // JSX - WHAT APPEARS ON THE WEBPAGE
  // =========================================================

  return (

    <div className="app">


      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="app-header">

        <div>

          <p className="chapter-label">
            FUTURE REPORT APP
          </p>

          <h1>
            MACReporting
          </h1>

          <p className="header-description">
            Report Template Administration
          </p>

        </div>

      </header>


      {/* =====================================================
          DASHBOARD
      ====================================================== */}

      <main className="dashboard">


        {/* ===================================================
            LEFT COLUMN - REPORT TEMPLATES
        ==================================================== */}

        <aside className="template-panel">

          <div className="panel-heading">

            <h2>
              Report Templates
            </h2>

            <span>
              {reportTemplates.length}
            </span>

          </div>


          <div className="template-list">

            {reportTemplates.map(template => (

              <ReportTemplate

                key={template.id}

                template={template}

                selected={
                  selectedTemplate?.id === template.id
                }

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


        {/* ===================================================
            RIGHT COLUMN
        ==================================================== */}

        <section className="detail-panel">


          {/* =================================================
              TEMPLATE FORM
          ================================================== */}

          {showTemplateForm ? (

            <div className="template-form-panel">


              <p className="section-label">
                Template Management
              </p>


              <h2>

                {editingTemplateId
                  ? "Edit Report Template"
                  : "Add Report Template"}

              </h2>


              <form onSubmit={saveTemplate}>


                <div className="form-group">

                  <label>
                    Name
                  </label>

                  <input

                    type="text"

                    value={templateName}

                    onChange={event =>
                      setTemplateName(
                        event.target.value
                      )
                    }

                    required

                  />

                </div>


                <div className="form-group">

                  <label>
                    Description
                  </label>

                  <input

                    type="text"

                    value={templateDescription}

                    onChange={event =>
                      setTemplateDescription(
                        event.target.value
                      )
                    }

                  />

                </div>


                <div className="action-buttons">


                  <button

                    type="submit"

                    className="primary-button"

                  >

                    {editingTemplateId
                      ? "Update Template"
                      : "Save Template"}

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


            /* ===============================================
               SELECTED TEMPLATE
            ================================================ */

            <>


              <div className="detail-header">


                <div>


                  <p className="section-label">
                    Selected Report
                  </p>


                  <h2>
                    {selectedTemplate.name}
                  </h2>


                  <p>
                    {selectedTemplate.description}
                  </p>


                </div>


                <div className="action-buttons">


                  <button

                    className="edit-button"

                    onClick={editTemplate}

                  >

                    Edit

                  </button>


                  <button

                    className="delete-button"

                    onClick={() =>
                      deleteTemplate(
                        selectedTemplate.id
                      )
                    }

                  >

                    Delete

                  </button>


                </div>


              </div>


              {/* =============================================
                  QUESTIONS SECTION
              ============================================== */}

              <div className="questions-section">


                <div className="questions-heading">


                  <div>

                    <p className="section-label">
                      Report Configuration
                    </p>

                    <h3>
                      Questions
                    </h3>

                  </div>


                  <button

                    className="primary-button"

                    onClick={() => {

                      // Start a new question
                      setEditingQuestionId(null);

                      setQuestionSection("");
                      setQuestionText("");
                      setQuestionType("");
                      setQuestionRequired(0);

                      // Make sure the Section dropdown
                      // starts in normal mode.
                      setAddingNewSection(false);


                      // Automatically assign the next
                      // Display Order number.
                      const nextOrder =

                        questions.length > 0

                          ? Math.max(
                              ...questions.map(
                                question =>
                                  Number(
                                    question.display_order
                                  )
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


                {/* ===========================================
                    QUESTION FORM
                ============================================ */}

                {showQuestionForm ? (


                  <div className="question-form-panel">


                    <p className="section-label">
                      Question Management
                    </p>


                    <h3>

                      {editingQuestionId
                        ? "Edit Question"
                        : "Add Question"}

                    </h3>


                    <form onSubmit={saveQuestion}>


                      {/* =====================================
                          SECTION NAME
                      ====================================== */}

                      <div className="form-group">

                        <label>
                          Section Name
                        </label>


                        {sectionNames.length === 0 ||
                        addingNewSection ? (


                          // New template OR
                          // user selected "+ New Section"

                          <input

                            type="text"

                            value={questionSection}

                            placeholder="Enter section name"

                            onChange={event =>
                              setQuestionSection(
                                event.target.value
                              )
                            }

                            required

                          />


                        ) : (


                          // Existing template sections

                          <select

                            value={questionSection}

                            onChange={event => {


                              if (
                                event.target.value ===
                                "new-section"
                              ) {

                                setQuestionSection("");

                                setAddingNewSection(true);

                              }

                              else {

                                setQuestionSection(
                                  event.target.value
                                );

                              }

                            }}

                            required

                          >


                            <option value="">
                              Select Section
                            </option>


                            {sectionNames.map(section => (

                              <option

                                key={section}

                                value={section}

                              >

                                {section}

                              </option>

                            ))}


                            <option value="new-section">
                              + New Section
                            </option>


                          </select>


                        )}


                      </div>


                      {/* =====================================
                          QUESTION TEXT
                      ====================================== */}

                      <div className="form-group">
                        <label>Question</label>
                        <textarea
                          value={questionText}
                          onChange={event =>
                            setQuestionText(
                              event.target.value
                            )
                          }
                          required
                        />
                      </div>
                      {/* =====================================
                          QUESTION TYPE
                      ====================================== */}

                      <div className="form-group">
                        <label>
                          Question Type
                        </label>
                        <select
                          value={questionType}
                          onChange={event =>
                            setQuestionType(
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">
                            Select Type
                          </option>
                          <option value="text">Text</option>
                          <option value="textarea">Long Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                        </select>
                      </div>

                      {/* =====================================
                          REQUIRED
                      ====================================== */}
                      <div className="form-group">
                        <label>Required</label>
                        <select
                          value={questionRequired}
                          onChange={event => setQuestionRequired(Number(event.target.value))}
                        >
                          <option value={0}>No</option>
                          <option value={1}> Yes</option>
                        </select>
                      </div>

                      {/* =====================================
                          DISPLAY ORDER
                      ====================================== */}

                      <div className="form-group">
                        <label>Display Order</label>
                        <input
                          type="number"
                          value={questionOrder}
                          onChange={event =>
                            setQuestionOrder(
                              event.target.value
                            )
                          }
                        />
                      </div>

                      {/* =====================================
                          QUESTION FORM BUTTONS
                      ====================================== */}

                      <div className="action-buttons">
                        <button type="submit" className="primary-button">
                          {editingQuestionId
                            ? "Update Question"
                            : "Save Question"}
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


                  /* =========================================
                     QUESTIONS TABLE
                  ========================================== */

                  <div className="question-table">


                    <div className="question-table-header">

                      <span>
                        Question
                      </span>

                      <span>
                        Section
                      </span>

                      <span>
                        Type
                      </span>

                      <span>
                        Actions
                      </span>

                    </div>


                    {questions.map(question => (


                      <div

                        className="question-row"

                        key={question.id}

                      >


                        <span className="question-text">

                          {question.question_text}

                        </span>


                        <span>

                          {question.section_name}

                        </span>


                        <span>

                          {question.question_type}

                        </span>


                        <span className="row-actions">


                          <button

                            className="text-button"

                            onClick={() =>
                              editQuestion(question)
                            }

                          >

                            Edit

                          </button>


                          <button

                            className="text-button delete-text"

                            onClick={() =>
                              deleteQuestion(
                                question.id
                              )
                            }

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


            /* ===============================================
               NOTHING SELECTED
            ================================================ */

            <div className="empty-state">


              <h2>
                Select a Report Template
              </h2>


              <p>

                Choose a report template from the left
                to view its information and questions.

              </p>


            </div>


          )}


        </section>


      </main>


    </div>

  );

}


export default App;