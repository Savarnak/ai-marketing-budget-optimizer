import React, { useState, useEffect } from 'react';
import { checkHealth, predictCampaign } from './services/predictionService';
import BudgetOptimizer from './components/BudgetOptimizer';
import { 
  TrendingUp, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  DollarSign, 
  Calendar, 
  Clock, 
  Sparkles,
  Zap,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Target,
  Users,
  Globe,
  Trash2,
  PieChart as PieIcon,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  // Theme state: 'dark' | 'light' backed by localStorage
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('marketing_ai_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('marketing_ai_theme', theme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
  }, [theme]);

  // Navigation tab state: 'optimizer' (default landing view) | 'predictor'
  const [activeTab, setActiveTab] = useState('optimizer');

  // Backend health status
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    online: false,
    modelLoaded: false,
    error: null,
  });

  // Form State initialized with prompt test defaults
  const [formData, setFormData] = useState({
    Campaign_Type: 'Social Media',
    Target_Audience: 'Premium Shoppers',
    Customer_Segment: 'Premium Shoppers',
    Campaign_Date: '2026-09-26',
    Duration: 30,
    Acquisition_Cost: 50000,
    Has_Email: 1,
    Has_WhatsApp: 1,
    Has_Facebook: 0,
    Has_Instagram: 1,
    Has_Google: 0,
    Has_YouTube: 0,
  });

  // Validation, Loading & Prediction Results State
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // History State backed by localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('marketing_ai_prediction_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load prediction history:', e);
      return [];
    }
  });

  // Check Backend Health on mount
  useEffect(() => {
    verifyBackendHealth();
  }, []);

  const verifyBackendHealth = async () => {
    setHealthStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await checkHealth();
      setHealthStatus({
        loading: false,
        online: data.status === 'ok',
        modelLoaded: data.model_loaded && data.preprocessor_loaded,
        error: null,
      });
    } catch (err) {
      setHealthStatus({
        loading: false,
        online: false,
        modelLoaded: false,
        error: err.message,
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'Duration' || name === 'Acquisition_Cost' ? (value === '' ? '' : Number(value)) : value,
      }));
    }
    if (formError) setFormError(null);
  };

  const validateForm = () => {
    if (!formData.Campaign_Type || !formData.Target_Audience || !formData.Customer_Segment) {
      return 'Please fill in all required dropdown fields.';
    }
    if (!formData.Campaign_Date) {
      return 'Campaign start date is required.';
    }
    if (!formData.Duration || Number(formData.Duration) <= 0) {
      return 'Duration must be a positive integer greater than 0.';
    }
    if (!formData.Acquisition_Cost || Number(formData.Acquisition_Cost) <= 0) {
      return 'Acquisition cost must be a positive number greater than 0.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      return;
    }

    setFormError(null);
    setLoading(true);
    setPrediction(null);

    try {
      const payload = {
        ...formData,
        Duration: Number(formData.Duration),
        Acquisition_Cost: Number(formData.Acquisition_Cost),
      };

      const result = await predictCampaign(payload);
      setPrediction(result);

      // Construct channels list
      const channels = [];
      if (formData.Has_Email) channels.push('Email');
      if (formData.Has_WhatsApp) channels.push('WhatsApp');
      if (formData.Has_Facebook) channels.push('Facebook');
      if (formData.Has_Instagram) channels.push('Instagram');
      if (formData.Has_Google) channels.push('Google');
      if (formData.Has_YouTube) channels.push('YouTube');

      const newRecord = {
        id: Date.now(),
        Campaign_Type: formData.Campaign_Type,
        Target_Audience: formData.Target_Audience,
        Customer_Segment: formData.Customer_Segment,
        Campaign_Date: formData.Campaign_Date,
        Duration: Number(formData.Duration),
        Acquisition_Cost: Number(formData.Acquisition_Cost),
        Selected_Channels: channels.length > 0 ? channels.join(', ') : 'None',
        predicted_revenue: result.predicted_revenue,
        revenue_cost_ratio: result.revenue_cost_ratio,
        decision: result.decision,
        priority: result.priority,
        explanation: result.explanation,
        timestamp: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      };

      setHistory((prevHistory) => {
        const updated = [newRecord, ...prevHistory].slice(0, 20);
        try {
          localStorage.setItem('marketing_ai_prediction_history', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save prediction history to localStorage:', err);
        }
        return updated;
      });

    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all prediction history?')) {
      setHistory([]);
      try {
        localStorage.removeItem('marketing_ai_prediction_history');
      } catch (err) {
        console.error('Failed to clear localStorage history:', err);
      }
    }
  };

  // Helper styling function for Recommendation Badges
  const getRecommendationStyle = (decision) => {
    switch (decision) {
      case 'Increase Budget':
        return 'rec-increase';
      case 'Maintain Budget':
        return 'rec-maintain';
      case 'Monitor Closely':
        return 'rec-monitor';
      case 'Reduce / Reallocate Budget':
      default:
        return 'rec-reduce';
    }
  };

  const getPriorityStyle = (priority) => {
    return priority === 'High' ? 'priority-high' : 'priority-medium';
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
              <TrendingUp size={24} color="#ffffff" />
            </div>
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              letterSpacing: '-0.02em', 
              background: 'var(--header-title-gradient)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Marketing Campaign Analytics & Budget Optimizer
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Nykaa Dataset Prescriptive Optimization Engine & Machine Learning Predictions
          </p>
        </div>

        {/* Right Section: Theme Toggle & Backend Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Light / Dark Mode Toggle */}
          <div className="theme-toggle-container" title="Switch Theme">
            <button
              onClick={() => setTheme('light')}
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              type="button"
            >
              <span>☀️</span>
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              type="button"
            >
              <span>🌙</span>
              <span>Dark</span>
            </button>
          </div>

          {/* Backend Status Badge */}
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {healthStatus.loading ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Checking API...</span>
              </>
            ) : healthStatus.online && healthStatus.modelLoaded ? (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--badge-online-dot)', boxShadow: '0 0 10px var(--badge-online-dot)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--badge-online-text)' }}>Backend & Real Model Online</span>
              </>
            ) : (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-rose)', boxShadow: '0 0 10px var(--accent-rose)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-rose)' }}>Backend Offline</span>
                <button 
                  onClick={verifyBackendHealth}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Retry connection"
                  type="button"
                >
                  <RefreshCw size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation / Tab System */}
      <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '8px', marginBottom: '32px', maxWidth: '480px' }}>
        <button
          onClick={() => setActiveTab('optimizer')}
          style={{
            flex: 1,
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            background: activeTab === 'optimizer' ? 'var(--primary-glow)' : 'transparent',
            color: activeTab === 'optimizer' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'optimizer' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
          }}
          type="button"
        >
          <PieIcon size={18} />
          <span>Budget Optimizer</span>
        </button>

        <button
          onClick={() => setActiveTab('predictor')}
          style={{
            flex: 1,
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            background: activeTab === 'predictor' ? 'var(--primary-glow)' : 'transparent',
            color: activeTab === 'predictor' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'predictor' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
          }}
          type="button"
        >
          <TrendingUp size={18} />
          <span>Campaign Predictor</span>
        </button>
      </div>

      {/* TAB 1: BUDGET OPTIMIZER (Default Landing View) */}
      {activeTab === 'optimizer' && <BudgetOptimizer />}

      {/* TAB 2: SINGLE CAMPAIGN PREDICTOR */}
      {activeTab === 'predictor' && (
        <>
          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            {/* Left Form Panel */}
            <div className="glass-panel" style={{ gridColumn: 'span 7', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <Zap size={20} color="#8b5cf6" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>Campaign Parameters</h2>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Campaign Type</label>
                    <select name="Campaign_Type" value={formData.Campaign_Type} onChange={handleInputChange} className="form-select">
                      <option value="Social Media">Social Media</option>
                      <option value="Paid Ads">Paid Ads</option>
                      <option value="SEO">SEO</option>
                      <option value="Influencer">Influencer</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Target Audience</label>
                    <select name="Target_Audience" value={formData.Target_Audience} onChange={handleInputChange} className="form-select">
                      <option value="Working Women">Working Women</option>
                      <option value="Premium Shoppers">Premium Shoppers</option>
                      <option value="Tier 2 City Customers">Tier 2 City Customers</option>
                      <option value="College Students">College Students</option>
                      <option value="Youth">Youth</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Customer Segment</label>
                    <select name="Customer_Segment" value={formData.Customer_Segment} onChange={handleInputChange} className="form-select">
                      <option value="Working Women">Working Women</option>
                      <option value="Premium Shoppers">Premium Shoppers</option>
                      <option value="Tier 2 City Customers">Tier 2 City Customers</option>
                      <option value="College Students">College Students</option>
                      <option value="Youth">Youth</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label className="form-label">Campaign Date</label>
                    <input 
                      type="date" 
                      name="Campaign_Date" 
                      value={formData.Campaign_Date} 
                      onChange={handleInputChange} 
                      className="form-input" 
                    />
                  </div>

                  <div>
                    <label className="form-label">Duration (Days)</label>
                    <input 
                      type="number" 
                      name="Duration" 
                      value={formData.Duration} 
                      onChange={handleInputChange} 
                      className="form-input" 
                      min="1"
                      placeholder="e.g. 30"
                    />
                  </div>

                  <div>
                    <label className="form-label">Acquisition Cost (₹)</label>
                    <input 
                      type="number" 
                      name="Acquisition_Cost" 
                      value={formData.Acquisition_Cost} 
                      onChange={handleInputChange} 
                      className="form-input" 
                      min="1"
                      placeholder="e.g. 50000"
                    />
                  </div>
                </div>

                {/* Channels Checkboxes */}
                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ marginBottom: '10px' }}>Active Distribution Channels</label>
                  <div className="channel-grid">
                    <label className={`channel-card ${formData.Has_Email ? 'active' : ''}`}>
                      <input type="checkbox" name="Has_Email" checked={formData.Has_Email === 1} onChange={handleInputChange} />
                      <span>Email</span>
                    </label>
                    <label className={`channel-card ${formData.Has_WhatsApp ? 'active' : ''}`}>
                      <input type="checkbox" name="Has_WhatsApp" checked={formData.Has_WhatsApp === 1} onChange={handleInputChange} />
                      <span>WhatsApp</span>
                    </label>
                    <label className={`channel-card ${formData.Has_Facebook ? 'active' : ''}`}>
                      <input type="checkbox" name="Has_Facebook" checked={formData.Has_Facebook === 1} onChange={handleInputChange} />
                      <span>Facebook</span>
                    </label>
                    <label className={`channel-card ${formData.Has_Instagram ? 'active' : ''}`}>
                      <input type="checkbox" name="Has_Instagram" checked={formData.Has_Instagram === 1} onChange={handleInputChange} />
                      <span>Instagram</span>
                    </label>
                    <label className={`channel-card ${formData.Has_Google ? 'active' : ''}`}>
                      <input type="checkbox" name="Has_Google" checked={formData.Has_Google === 1} onChange={handleInputChange} />
                      <span>Google</span>
                    </label>
                    <label className={`channel-card ${formData.Has_YouTube ? 'active' : ''}`}>
                      <input type="checkbox" name="Has_YouTube" checked={formData.Has_YouTube === 1} onChange={handleInputChange} />
                      <span>YouTube</span>
                    </label>
                  </div>
                </div>

                {/* Error Message Box */}
                {formError && (
                  <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '12px 16px', borderRadius: '10px', color: 'var(--accent-rose)', fontSize: '0.9rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner" />
                      <span>Running ML Model Prediction...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Predict Campaign Performance</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Output Panel */}
            <div className="glass-panel" style={{ gridColumn: 'span 5', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={20} color="var(--accent-emerald)" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>AI CAMPAIGN PREDICTION</h2>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' }}>
                  REAL ML MODEL
                </span>
              </div>

              {!prediction && !loading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ background: 'var(--bg-inner-card)', padding: '20px', borderRadius: '50%', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                    <Activity size={32} color="#6366f1" />
                  </div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '6px' }}>Ready for Prediction</h3>
                  <p style={{ fontSize: '0.85rem', maxWidth: '280px', color: 'var(--text-muted)' }}>
                    Configure parameters and click "Predict Campaign Performance" to run your trained machine learning model.
                  </p>
                </div>
              )}

              {loading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
                  <div className="spinner" style={{ width: '36px', height: '36px', borderWidth: '4px', marginBottom: '20px' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-heading)' }}>Evaluating Revenue Model Pipeline</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Passing features through ColumnTransformer & GradientBoostingRegressor...</p>
                </div>
              )}

              {prediction && !loading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Predicted Revenue Card */}
                  <div style={{ background: 'var(--bg-inner-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '14px' }}>
                    <span className="form-label" style={{ color: 'var(--text-muted)' }}>Predicted Revenue</span>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', marginTop: '2px' }}>
                      ₹{prediction.predicted_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue/Cost Efficiency</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {prediction.revenue_cost_ratio}x
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Acquisition Cost</span>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-subtle)' }}>
                          ₹{Number(formData.Acquisition_Cost).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation & Priority Badges */}
                  <div style={{ background: 'var(--bg-inner-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '14px' }}>
                    <span className="form-label" style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>AI Recommendation</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div className={`badge-recommendation ${getRecommendationStyle(prediction.decision)}`}>
                        <ShieldCheck size={18} />
                        <span>{prediction.decision}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '6px' }}>Priority:</span>
                        <span className={`badge-recommendation ${getPriorityStyle(prediction.priority)}`} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                          {prediction.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  <div style={{ background: 'var(--bg-inner-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '14px', flex: 1 }}>
                    <span className="form-label" style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>AI Explanation</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', lineHeight: '1.6' }}>
                      {prediction.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prediction History Section */}
          <div className="glass-panel" style={{ marginTop: '32px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="#8b5cf6" />
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>Prediction History</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stored locally • Up to 20 recent evaluations</p>
                </div>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={handleClearHistory}
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--accent-rose)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.25)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'}
                  type="button"
                >
                  <Trash2 size={16} />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.95rem' }}>No prediction history yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--table-border-color)', color: 'var(--table-header-color)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Date/Time</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Campaign Type</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Target Audience</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Cost (₹)</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Predicted Revenue</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Efficiency</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Recommendation</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr 
                        key={record.id} 
                        style={{ borderBottom: '1px solid var(--table-row-border)', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--table-row-hover)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {record.timestamp}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-heading)' }}>
                          {record.Campaign_Type}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-subtle)' }}>
                          {record.Target_Audience}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-subtle)' }}>
                          ₹{Number(record.Acquisition_Cost).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-heading)' }}>
                          ₹{Number(record.predicted_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {record.revenue_cost_ratio}x
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={`badge-recommendation ${getRecommendationStyle(record.decision)}`} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                            {record.decision}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={`badge-recommendation ${getPriorityStyle(record.priority)}`} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                            {record.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
