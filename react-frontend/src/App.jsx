import { useEffect, useState } from "react";
import ReportTemplate from "./components/ReportTemplate";

function App() {
  const [reportTemplates, setReportTemplates] = useState([]);
  const [questions, setQuestions] = useState([]);

  function loadQuestions(templateId) {
  fetch(`http://127.0.0.1:5000/report-templates/${templateId}/questions`)
    .then(response => response.json())
    .then(data => {
      setQuestions(data);
    })
    .catch(error => {
      console.error("Error loading questions:", error);
    });
}

  useEffect(() => {
    fetch("http://127.0.0.1:5000/report-templates")
      .then(response => response.json())
      .then(data => {
        setReportTemplates(data);
      })
      .catch(error => {
        console.error("Error loading report templates:", error);
      });
  }, []);

  return (
    <div>
      <h1>MACReporting</h1>
      <p>React Frontend</p>

      <h2>Report Templates</h2>

      {reportTemplates.map(template => (
        <ReportTemplate
          key={template.id}
          template={template}
          onViewQuestions={loadQuestions}
        />
      ))}

      <h2>Questions</h2>

      {questions.map(question => (
        <div key={question.id}>
          <p>{question.question_text}</p>
        </div>
      ))}
    </div>
  );
}

export default App;