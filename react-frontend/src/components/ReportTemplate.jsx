function ReportTemplate({
  template,
  selected,
  onViewQuestions
}) {
  return (
    <button
      className={`template-item ${
        selected ? "selected" : ""
      }`}
      onClick={() => onViewQuestions(template)}
    >
      <span className="template-name">
        {template.name}
      </span>

      <span className="template-description">
        {template.description}
      </span>
    </button>
  );
}

export default ReportTemplate;