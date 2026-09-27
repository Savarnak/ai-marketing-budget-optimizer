const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Checks backend health status.
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(
      'FastAPI backend is offline or unreachable on http://127.0.0.1:8000'
    );
  }
};

/**
 * Sends campaign parameters to FastAPI model endpoint.
 */
export const predictCampaign = async (campaignData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = Array.isArray(errorData.detail)
        ? errorData.detail.map((e) => e.msg).join(', ')
        : errorData.detail || `Server returned error status ${response.status}`;
      throw new Error(detail);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        'Backend server is not running on http://127.0.0.1:8000. Please start FastAPI.'
      );
    }
    throw error;
  }
};

/**
 * Sends total budget to FastAPI budget optimizer endpoint.
 */
export const optimizeBudget = async (totalBudget) => {
  try {
    const response = await fetch(`${API_BASE_URL}/optimize-budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ total_budget: Number(totalBudget) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = Array.isArray(errorData.detail)
        ? errorData.detail.map((e) => e.msg).join(', ')
        : errorData.detail || `Server returned error status ${response.status}`;
      throw new Error(detail);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        'Backend server is not running on http://127.0.0.1:8000. Please start FastAPI.'
      );
    }
    throw error;
  }
};
