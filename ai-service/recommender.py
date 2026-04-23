import os
import psycopg2
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")  # postgresql://user:pass@host:5432/db


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def recommend_lawyers(category: str, location: str, budget: float) -> list[dict]:
    """
    Returns up to 10 recommended lawyers ranked by cosine similarity.

    Feature weights (encoded in the user vector):
      category_match   0.35  — specialization keyword overlap
      location_match   0.25  — city / state partial match
      budget_score     0.20  — proximity to budget (clamped 0-1, penalises over-budget)
      rating_score     0.12  — bayesian-smoothed rating
      experience_score 0.08  — normalised years of experience
    """
    conn = _get_conn()
    query = """
        SELECT
            users.id          AS user_id,
            lawyers.id        AS lawyer_id,
            users.name,
            users.location,
            lawyers.specialization,
            COALESCE(lawyers.experience, 0)    AS experience,
            COALESCE(lawyers.pricing, 0)       AS pricing,
            COALESCE(lawyers.rating, 0)        AS rating,
            COALESCE(lawyers.review_count, 0)  AS review_count
        FROM lawyers
        JOIN users ON users.id = lawyers.user_id
        WHERE lawyers.approval_status = 'approved'
          AND lawyers.is_profile_complete = TRUE
    """
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty:
        return []

    # ── Feature Engineering ──────────────────────────────────────────────────

    # 1. Category match — count how many words in the category appear in specialization
    cat_words = set(category.lower().split())
    df["category_match"] = df["specialization"].fillna("").apply(
        lambda s: len(cat_words & set(s.lower().split())) / max(len(cat_words), 1)
    )

    # 2. Location match — partial token overlap (city OR state)
    loc_tokens = set(location.lower().split())
    df["location_match"] = df["location"].fillna("").apply(
        lambda s: 1.0 if loc_tokens & set(s.lower().split()) else 0.0
    )

    # 3. Budget score — 1 when pricing == budget, penalise over-budget more
    def budget_score(pricing):
        if budget <= 0:
            return 1.0
        diff = pricing - budget
        if diff <= 0:
            # under or equal budget: mild penalty for being too cheap (might signal low quality)
            return max(0.0, 1.0 - abs(diff) / (budget * 2))
        else:
            # over budget: steeper penalty
            return max(0.0, 1.0 - diff / budget)

    df["budget_score"] = df["pricing"].apply(budget_score)

    # 4. Bayesian-smoothed rating (avoids inflating lawyers with 1 review)
    #    smoothed = (rating * review_count + global_mean * m) / (review_count + m)
    global_mean = df["rating"].mean() if df["rating"].mean() > 0 else 3.5
    m = 5  # prior weight (equivalent to 5 reviews at global mean)
    df["rating_score"] = (
        (df["rating"] * df["review_count"] + global_mean * m)
        / (df["review_count"] + m)
    )

    # 5. Experience score (raw — will be normalised by scaler)
    df["experience_score"] = df["experience"]

    # ── Normalise ────────────────────────────────────────────────────────────
    feature_cols = ["category_match", "location_match", "budget_score", "rating_score", "experience_score"]
    features = df[feature_cols].copy()

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(features)

    # ── Weighted user vector ─────────────────────────────────────────────────
    # Weights reflect importance: category > location > budget > rating > experience
    weights = np.array([0.35, 0.25, 0.20, 0.12, 0.08])

    # User's ideal values (all maxed out = perfect match)
    user_raw = np.array([[1.0, 1.0, 1.0, 1.0, 1.0]])

    # Apply weights to both sides so cosine similarity respects importance
    weighted_scaled = scaled * weights
    weighted_user = user_raw * weights

    # ── Cosine Similarity ────────────────────────────────────────────────────
    similarity = cosine_similarity(weighted_user, weighted_scaled)[0]
    df["score"] = similarity

    # ── Top 10 ───────────────────────────────────────────────────────────────
    top10 = df.sort_values("score", ascending=False).head(10)

    return top10[[
        "lawyer_id", "user_id", "name", "location", "specialization",
        "experience", "pricing", "rating", "review_count", "score"
    ]].rename(columns={"lawyer_id": "id"}).to_dict(orient="records")
