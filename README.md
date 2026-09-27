AI-Driven Marketing Campaign Analytics & Budget Optimizer is an AI-powered decision-support platform that helps marketing managers analyze campaign performance, predict revenue, and optimize marketing budgets.

The system uses a 55,555-record simulated e-commerce marketing dataset. After data preprocessing and feature engineering, campaign attributes, customer information, date features, acquisition cost, and channel indicators are used to train a Gradient Boosting Regressor for revenue prediction. The model uses 500 boosting estimators, a 0.03 learning rate, and maximum tree depth of 3, with categorical variables handled using One-Hot Encoding.

The project also evaluates revenue prediction at different campaign stages, from pre-campaign to late/in-campaign, allowing predictions to become more informed as campaign performance data becomes available.

For budget optimization, historical strategies are scored using ROI (40%), Revenue (30%), Conversions (20%), and Engagement (10%), with a reliability adjustment based on historical campaign volume. A constrained optimization process then allocates the manager's entered budget with 5% minimum and 20% maximum allocation per strategy.

The complete solution is implemented using a React frontend and FastAPI backend, providing two main workflows: AI Budget Optimizer for budget allocation and Campaign Predictor for individual campaign revenue prediction and operational recommendations.
