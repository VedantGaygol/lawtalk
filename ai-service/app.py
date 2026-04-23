from flask import Flask, request, jsonify
from flask_cors import CORS
from recommender import recommend_lawyers

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json(force=True)
    category = data.get("category", "")
    location = data.get("location", "")
    budget = float(data.get("budget") or 0)

    if not category:
        return jsonify({"error": "category is required"}), 400

    try:
        results = recommend_lawyers(category, location, budget)
        return jsonify({"lawyers": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
