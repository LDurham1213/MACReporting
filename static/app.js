//this module says to ask FLASK to get all the report templates.  Convert them to JSON
// find the Report Template section of the page.
// For each report template, create a section containing the name and the description
//  add that section to the webpage, if there is a problem - print the error
// SQLite (sql statement) ---> FLASK (json) ---> app.js (template.name/description) ---> index.html  
// The user will see the webpage
// console.log("app.js is loading");

let editingTemplateId = null;
let editingQuestionId = null;

//this is replacing the 'get' postman was doing to get the report templates from the database
fetch("/report-templates") 
    .then(response => response.json()) //turns the json data into a javascript object
    .then(reportTemplates => {
        const container = document.getElementById("report-templates");
        // Remove the "Loading report templates..." message
        container.innerHTML = "";
        // Loop through the report templates and create HTML elements for each template
        reportTemplates.forEach(template => {
            const templateElement = document.createElement("div");
            // this will put the value of template.xxxxx here
            templateElement.innerHTML = `
                <h3>${template.name}</h3>
                <p>${template.description}</p>

                <div class="button-row">
                    <button onclick="loadQuestions(${template.id}, '${template.name}')">
                        View Questions
                    </button>

                    <button onclick="editTemplate(${template.id}, '${template.name}', '${template.description}')">
                        Edit
                    </button>

                    <button onclick="deleteTemplate(${template.id})">
                        Delete
                    </button>
                </div>
            `;
            container.appendChild(templateElement);
        });
    })
    .catch(error => {
        console.error("Error loading report templates:", error);
    });

    function loadQuestions(templateId, templateName) {
    fetch(`/report-templates/${templateId}/questions`)
        .then(response => response.json())
        .then(questions => {
            const questionsContainer = document.getElementById("questions");
            const questionsTitle = document.getElementById("questions-title");
            questionsTitle.innerHTML = `${templateName} Questions`;
            questionsContainer.innerHTML = "";
            questions.forEach(question => {
                const questionElement = document.createElement("div");
                questionElement.innerHTML = `
                <div class="question-row">
                    <p>${question.question_text}</p>

                    <div class="button-row">
                        <button onclick="editQuestion(
                            ${question.id},
                            ${question.report_template_id},
                            '${question.section_name}',
                            '${question.question_text}',
                            '${question.question_type}',
                            ${question.required},
                            ${question.display_order}
                        )">
                            Edit
                        </button>

                        <button onclick="deleteQuestion(${question.id})">
                            Delete
                        </button>
                    </div>
                </div>
                `;
                questionsContainer.appendChild(questionElement);
            });
            questionsTitle.scrollIntoView({
                behavior: "smooth"
            });
        })
        .catch(error => {
            console.error("Error loading questions:", error);
        });
    }
    function deleteTemplate(templateId) {
        fetch(`/report-templates/${templateId}`, {method: "DELETE"})
        .then(response => response.json())
        .then(result => {
            console.log("Template deleted:", result);
            location.reload();
            })
        .catch(error => {
            console.error("Error deleting template:", error);
        });
    }
   function editTemplate(templateId, templateName, templateDescription) {
        editingTemplateId = templateId;
        document.getElementById("template-name").value = templateName;
        document.getElementById("template-description").value = templateDescription;

        document.getElementById("template-submit-button").textContent = "Update Template";
        document.getElementById("template-form").scrollIntoView({
            behavior: "smooth"
        });
    }

const templateForm = document.getElementById("template-form");
templateForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const name = document.getElementById("template-name").value;
    const description = document.getElementById("template-description").value;
    const url = editingTemplateId
        ? `/report-templates/${editingTemplateId}`
        : "/report-templates";
    const method = editingTemplateId ? "PUT" : "POST";
    fetch(url, {
        method: method,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: name, description: description})
        })
        .then(response => response.json())
        .then(reportTemplates => {
            console.log("Template created:", reportTemplates);
            templateForm.reset();
            location.reload();
        })
        .catch(error => {
            console.error("Error creating report template:", error);
        });
});

const questionForm = document.getElementById("question-form");

questionForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const reportTemplateId = document.getElementById("question-template-id").value;
    const sectionName = document.getElementById("question-section").value;
    const questionText = document.getElementById("question-text").value;
    const questionType = document.getElementById("question-type").value;
    const required = document.getElementById("question-required").value;
    const displayOrder = document.getElementById("question-order").value;

    const url = editingQuestionId
    ? `/questions/${editingQuestionId}`
    : "/questions";

    const method = editingQuestionId ? "PUT" : "POST";

    fetch(url, {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            report_template_id: Number(reportTemplateId),
            section_name: sectionName,
            question_text: questionText,
            question_type: questionType,
            required: Number(required),
            display_order: Number(displayOrder)
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log("Question saved:", result);

        questionForm.reset();
        editingQuestionId = null;

        location.reload();
    })
    .catch(error => {
        console.error("Error saving question:", error);
    });
    });

function editQuestion(
    questionId,
    reportTemplateId,
    sectionName,
    questionText,
    questionType,
    required,
    displayOrder
) {
    editingQuestionId = questionId;

    document.getElementById("question-template-id").value = reportTemplateId;
    document.getElementById("question-section").value = sectionName;
    document.getElementById("question-text").value = questionText;
    document.getElementById("question-type").value = questionType;
    document.getElementById("question-required").value = required;
    document.getElementById("question-order").value = displayOrder;

    document.getElementById("question-submit-button").textContent = "Update Question";
    document.getElementById("question-form").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};

function deleteQuestion(questionId) {

    fetch(`/questions/${questionId}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(result => {
        console.log("Question deleted:", result);
        location.reload();
    })
    .catch(error => {
        console.error("Error deleting question:", error);
    });
};