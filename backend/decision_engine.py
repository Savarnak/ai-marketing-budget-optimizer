"""
AI Decision Engine Module
Provides initial decision mapping based on predicted revenue relative to acquisition cost.
"""

# Easily editable threshold definitions
DECISION_THRESHOLDS = [
    {
        "min_ratio": 12.0,
        "decision": "Increase Budget",
        "priority": "High",
        "explanation": "Operational rule: Predicted revenue exceeds 12x acquisition cost. Excellent efficiency."
    },
    {
        "min_ratio": 8.0,
        "decision": "Maintain Budget",
        "priority": "Medium",
        "explanation": "Operational rule: Predicted revenue is 8x - 12x acquisition cost. Stable efficiency."
    },
    {
        "min_ratio": 5.0,
        "decision": "Monitor Closely",
        "priority": "Medium",
        "explanation": "Operational rule: Predicted revenue is 5x - 8x acquisition cost. Moderate efficiency requiring monitoring."
    },
    {
        "min_ratio": 0.0,
        "decision": "Reduce / Reallocate Budget",
        "priority": "High",
        "explanation": "Operational rule: Predicted revenue is below 5x acquisition cost. Low efficiency."
    }
]

def evaluate_campaign(predicted_revenue: float, acquisition_cost: float) -> dict:
    """
    Evaluates campaign revenue against acquisition cost and returns AI recommendation.
    
    Operational rule:
    revenue_cost_ratio = predicted_revenue / acquisition_cost
    """
    if acquisition_cost <= 0:
        ratio = 0.0
    else:
        ratio = predicted_revenue / acquisition_cost

    for item in DECISION_THRESHOLDS:
        if ratio >= item["min_ratio"]:
            return {
                "revenue_cost_ratio": round(ratio, 2),
                "decision": item["decision"],
                "priority": item["priority"],
                "explanation": item["explanation"]
            }

    fallback = DECISION_THRESHOLDS[-1]
    return {
        "revenue_cost_ratio": round(ratio, 2),
        "decision": fallback["decision"],
        "priority": fallback["priority"],
        "explanation": fallback["explanation"]
    }
