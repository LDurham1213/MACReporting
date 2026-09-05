from flask import Flask, jsonify
from flask_cors import CORS

from routes.templates import templates_bp
from routes.questions import questions_bp
from routes.reports import reports_bp
from routes.lookups import lookups_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(templates_bp)
app.register_blueprint(questions_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(lookups_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "MACReporting API is running"
    })


if __name__ == "__main__":
    app.run(debug=True)