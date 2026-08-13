function ReportTemplate({ template, onViewQuestions }) {

  return (
    <div>
        <h3>{template.name}</h3>
        <p>{template.description}</p>

        <button onClick={() => onViewQuestions(template.id)}>
          View Questions
        </button>
    </div>
    );

}

export default ReportTemplate;