# LawTalk AI Service

Flask microservice that recommends lawyers using cosine similarity on case features.

## Setup

```bash
cd ai-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure DB (same PostgreSQL as backend)
# Edit .env and set DATABASE_URL

# Run
python app.py
```

Runs on **http://localhost:5001**

## Endpoint

```
POST /recommend
Body: { "category": "Criminal Law", "location": "Mumbai", "budget": 5000 }
Response: { "lawyers": [ { "id", "name", "specialization", "score", ... } ] }
```

## Algorithm

Features used (weighted cosine similarity):

| Feature          | Weight | Description                                      |
|------------------|--------|--------------------------------------------------|
| category_match   | 0.35   | Token overlap between case category & specialization |
| location_match   | 0.25   | City/state partial match                         |
| budget_score     | 0.20   | Proximity to budget, penalises over-budget more  |
| rating_score     | 0.12   | Bayesian-smoothed rating (avoids 1-review bias)  |
| experience_score | 0.08   | Normalised years of experience                   |
