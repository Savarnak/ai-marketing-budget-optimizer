import os
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import joblib
import pandas as pd
import numpy as np

# Import decision engine
try:
    from backend.decision_engine import evaluate_campaign
except ImportError:
    from decision_engine import evaluate_campaign

app = FastAPI(title="AI-Driven Marketing Campaign Analytics API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths to models directory
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
if not MODELS_DIR.exists():
    MODELS_DIR = BASE_DIR / "model"

MODEL_PATH = MODELS_DIR / "revenue_model.pkl"
PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.pkl"
RECOMMENDATIONS_CSV_PATH = BASE_DIR / "data" / "final_marketing_recommendations.csv"

revenue_model = None
preprocessor = None
model_loaded = False
preprocessor_loaded = False

try:
    if MODEL_PATH.exists():
        revenue_model = joblib.load(MODEL_PATH)
        model_loaded = True
        print(f"Successfully loaded revenue model from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading revenue model: {e}")

try:
    if PREPROCESSOR_PATH.exists():
        preprocessor = joblib.load(PREPROCESSOR_PATH)
        preprocessor_loaded = True
        print(f"Successfully loaded preprocessor from {PREPROCESSOR_PATH}")
except Exception as e:
    print(f"Error loading preprocessor: {e}")


class PredictionRequest(BaseModel):
    Campaign_Type: str = Field(..., description="Type of marketing campaign")
    Target_Audience: str = Field(..., description="Target audience group")
    Customer_Segment: str = Field(..., description="Customer segment")
    Campaign_Date: str = Field(..., description="Campaign start date (YYYY-MM-DD)")
    Duration: int = Field(..., gt=0, description="Campaign duration in days")
    Acquisition_Cost: float = Field(..., gt=0, description="Acquisition cost in currency")
    Language: str = Field("English", description="Campaign language")
    Has_Email: int = Field(0, ge=0, le=1)
    Has_WhatsApp: int = Field(0, ge=0, le=1)
    Has_Facebook: int = Field(0, ge=0, le=1)
    Has_Instagram: int = Field(0, ge=0, le=1)
    Has_Google: int = Field(0, ge=0, le=1)
    Has_YouTube: int = Field(0, ge=0, le=1)

    @field_validator("Campaign_Date")
    def validate_date(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Campaign_Date must be in YYYY-MM-DD format")
        return v


class BudgetOptimizationRequest(BaseModel):
    total_budget: float = Field(..., gt=0, description="Total marketing budget in currency")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "preprocessor_loaded": preprocessor_loaded
    }


@app.post("/predict")
def predict_campaign(req: PredictionRequest):
    if not model_loaded or revenue_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML revenue model is not loaded"
        )
    if not preprocessor_loaded or preprocessor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Preprocessor pipeline is not loaded"
        )

    try:
        # 1. Feature Engineering from Campaign_Date
        dt = pd.to_datetime(req.Campaign_Date)
        year = int(dt.year)
        month = int(dt.month)
        quarter_num = int(dt.quarter)
        day_of_week = int(dt.weekday())

        lang = req.Language if req.Language else "English"

        # 2. Construct DataFrame with exact expected feature names and order
        feature_data = {
            "Campaign_Type": [req.Campaign_Type],
            "Target_Audience": [req.Target_Audience],
            "Customer_Segment": [req.Customer_Segment],
            "Duration": [req.Duration],
            "Acquisition_Cost": [req.Acquisition_Cost],
            "Language": [lang],
            "Year": [year],
            "Month": [month],
            "Quarter_Num": [quarter_num],
            "DayOfWeek": [day_of_week],
            "Has_Email": [req.Has_Email],
            "Has_WhatsApp": [req.Has_WhatsApp],
            "Has_Facebook": [req.Has_Facebook],
            "Has_Instagram": [req.Has_Instagram],
            "Has_Google": [req.Has_Google],
            "Has_YouTube": [req.Has_YouTube]
        }

        df = pd.DataFrame(feature_data)

        # 3. Transform using real preprocessor
        X_transformed = preprocessor.transform(df)

        # 4. Predict using real revenue model
        prediction_result = revenue_model.predict(X_transformed)
        predicted_revenue = float(prediction_result[0])

        # Ensure prediction is non-negative
        predicted_revenue = max(0.0, predicted_revenue)

        # 5. AI Decision Engine evaluation
        decision_info = evaluate_campaign(predicted_revenue, req.Acquisition_Cost)

        return {
            "predicted_revenue": round(predicted_revenue, 2),
            "revenue_cost_ratio": decision_info["revenue_cost_ratio"],
            "decision": decision_info["decision"],
            "priority": decision_info["priority"],
            "explanation": decision_info["explanation"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing prediction: {str(e)}"
        )


@app.post("/optimize-budget")
def optimize_budget(req: BudgetOptimizationRequest):
    recommendations_file = RECOMMENDATIONS_CSV_PATH
    if not recommendations_file.exists():
        alt_path = Path("c:/Users/savar/Downloads/final_marketing_recommendations.csv")
        if alt_path.exists():
            recommendations_file = alt_path
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Strategy optimization dataset file not found."
            )

    try:
        df = pd.read_csv(recommendations_file)
        
        strategies = []
        total_allocated = 0.0
        channel_totals = {}

        for i, row in df.iterrows():
            percentage = float(row["Budget_Percentage"])
            amount = round(req.total_budget * (percentage / 100.0), 2)
            total_allocated += amount

            # Channel aggregation
            channels = [c.strip() for c in str(row["Channel_Used"]).split(",")]
            for ch in channels:
                channel_totals[ch] = channel_totals.get(ch, 0.0) + amount

            strategies.append({
                "rank": int(row.get("Strategy_ID", i + 1)),
                "campaign_type": str(row["Campaign_Type"]),
                "target_audience": str(row["Target_Audience"]),
                "channel_combination": str(row["Channel_Used"]),
                "historical_campaigns": int(row["Campaigns"]),
                "avg_roi": round(float(row["Avg_ROI"]), 2),
                "avg_revenue": round(float(row["Avg_Revenue"]), 2),
                "avg_conversions": round(float(row["Avg_Conversions"]), 2),
                "adjusted_score": round(float(row["Adjusted_Score"]), 4),
                "recommended_percentage": round(percentage, 2),
                "recommended_amount": amount,
                "priority": str(row["Priority"])
            })

        # Sort channel totals in descending order
        sorted_channels = sorted(channel_totals.items(), key=lambda x: x[1], reverse=True)
        channel_summary = [
            {"channel": ch, "recommended_investment": round(val, 2)}
            for ch, val in sorted_channels
        ]

        return {
            "total_budget": req.total_budget,
            "total_allocated": round(total_allocated, 2),
            "strategies": strategies,
            "channel_summary": channel_summary,
            "ai_explanation": "These allocations are data-driven recommendations based on historical campaign performance using ROI (40%), Revenue (30%), Conversions (20%), Engagement (10%), and historical campaign volume/reliability. Actual future results may vary."
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing budget optimization: {str(e)}"
        )
