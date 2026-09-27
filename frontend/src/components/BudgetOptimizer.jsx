import React, { useState, useEffect, useMemo } from 'react';
import { optimizeBudget } from '../services/predictionService';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Zap, 
  DollarSign, 
  PieChart as PieIcon, 
  BarChart2, 
  Sparkles, 
  AlertTriangle, 
  Layers, 
  Info,
  CheckCircle2,
  Award
} from 'lucide-react';

const COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#3b82f6', '#10b981', 
  '#f59e0b', '#ec4899', '#14b8a6', '#84cc16', '#a855f7'
];

export default function BudgetOptimizer() {
  const [totalBudget, setTotalBudget] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Run initial budget optimization on mount for default 1,00,000
  useEffect(() => {
    handleOptimize(100000);
  }, []);

  const handleOptimize = async (budgetToUse) => {
    const val = budgetToUse !== undefined ? budgetToUse : totalBudget;
    if (!val || Number(val) <= 0) {
      setError('Please enter a valid positive total marketing budget.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await optimizeBudget(val);
      setOptimizationResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleOptimize();
  };

  // Dynamically compute channel allocations and campaign type summaries with full precision aggregation
  const { channelSummary, campaignTypeSummary } = useMemo(() => {
    if (!optimizationResult || !optimizationResult.strategies) {
      return { channelSummary: [], campaignTypeSummary: [] };
    }

    const budgetNum = Number(optimizationResult.total_budget);
    const strategies = optimizationResult.strategies;

    // -------------------------------------------------------------
    // 1. Dynamic Recommended Channel Allocation Algorithm
    // -------------------------------------------------------------
    const standardChannels = ['Instagram', 'YouTube', 'WhatsApp', 'Google', 'Email', 'Facebook'];
    const rawChannelTotals = {};
    standardChannels.forEach(ch => { rawChannelTotals[ch] = 0.0; });

    strategies.forEach((strat) => {
      const amount = Number(strat.recommended_amount) || 0;
      const channels = String(strat.channel_combination || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      if (channels.length > 0) {
        const share = amount / channels.length; // Full precision float division
        channels.forEach((ch) => {
          if (rawChannelTotals[ch] === undefined) {
            rawChannelTotals[ch] = 0.0;
          }
          rawChannelTotals[ch] += share;
        });
      }
    });

    // Aggregate finished -> round each channel total to 2 decimal places
    const roundedChannelTotals = {};
    let sumChannelAllocated = 0.0;

    Object.keys(rawChannelTotals).forEach((ch) => {
      const roundedVal = Math.round(rawChannelTotals[ch] * 100) / 100;
      roundedChannelTotals[ch] = roundedVal;
      sumChannelAllocated += roundedVal;
    });

    sumChannelAllocated = Math.round(sumChannelAllocated * 100) / 100;
    const channelRemainder = Math.round((budgetNum - sumChannelAllocated) * 100) / 100;

    const allChannels = Object.keys(roundedChannelTotals);
    if (channelRemainder !== 0 && allChannels.length > 0) {
      // Find channel with largest allocation to absorb the rounding remainder
      let largestCh = allChannels[0];
      allChannels.forEach((ch) => {
        if (roundedChannelTotals[ch] > roundedChannelTotals[largestCh]) {
          largestCh = ch;
        }
      });
      roundedChannelTotals[largestCh] = Math.round((roundedChannelTotals[largestCh] + channelRemainder) * 100) / 100;
    }

    // Build final sorted channel summary array
    const channelSummary = Object.keys(roundedChannelTotals).map((ch) => {
      const investment = roundedChannelTotals[ch];
      const percentage = budgetNum > 0 ? (investment / budgetNum) * 100 : 0;
      return {
        channel: ch,
        recommended_investment: investment,
        percentage: percentage,
      };
    }).sort((a, b) => b.recommended_investment - a.recommended_investment);

    // -------------------------------------------------------------
    // 2. Campaign Type Donut Aggregation Algorithm
    // -------------------------------------------------------------
    const rawTypeTotals = {};
    strategies.forEach((strat) => {
      const type = strat.campaign_type || 'Other';
      const amount = Number(strat.recommended_amount) || 0;
      rawTypeTotals[type] = (rawTypeTotals[type] || 0.0) + amount;
    });

    const roundedTypeTotals = {};
    let sumTypeAllocated = 0.0;

    Object.keys(rawTypeTotals).forEach((type) => {
      const roundedVal = Math.round(rawTypeTotals[type] * 100) / 100;
      roundedTypeTotals[type] = roundedVal;
      sumTypeAllocated += roundedVal;
    });

    sumTypeAllocated = Math.round(sumTypeAllocated * 100) / 100;
    const typeRemainder = Math.round((budgetNum - sumTypeAllocated) * 100) / 100;

    const allTypes = Object.keys(roundedTypeTotals);
    if (typeRemainder !== 0 && allTypes.length > 0) {
      let largestType = allTypes[0];
      allTypes.forEach((type) => {
        if (roundedTypeTotals[type] > roundedTypeTotals[largestType]) {
          largestType = type;
        }
      });
      roundedTypeTotals[largestType] = Math.round((roundedTypeTotals[largestType] + typeRemainder) * 100) / 100;
    }

    const campaignTypeSummary = Object.keys(roundedTypeTotals).map((type) => {
      const amount = roundedTypeTotals[type];
      const percentage = budgetNum > 0 ? (amount / budgetNum) * 100 : 0;
      return {
        campaign_type: type,
        recommended_amount: amount,
        recommended_percentage: percentage,
      };
    }).sort((a, b) => b.recommended_amount - a.recommended_amount);

    return { channelSummary, campaignTypeSummary };
  }, [optimizationResult]);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      default:
        return 'rec-maintain';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Input Card */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <Zap size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)' }}>AI MARKETING BUDGET OPTIMIZER</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Enter your total campaign budget to generate data-driven strategy allocations and multi-channel investments.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                Total Marketing Budget (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>
                  ₹
                </span>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="e.g. 100000"
                  className="form-input"
                  style={{ paddingLeft: '36px', fontSize: '1.1rem', fontWeight: 700 }}
                  min="1"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: 'auto', minWidth: '240px', height: '48px' }}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Optimizing Budget...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>OPTIMIZE MY BUDGET</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '12px 16px', borderRadius: '10px', color: 'var(--accent-rose)', fontSize: '0.9rem', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Optimization Results View */}
      {optimizationResult && (
        <>
          {/* Summary Metric Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <span className="form-label" style={{ color: 'var(--text-muted)' }}>Total Budget Entered</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '4px' }}>
                ₹{Number(optimizationResult.total_budget).toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <CheckCircle2 size={14} /> 100% Budget Allocated
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <span className="form-label" style={{ color: 'var(--text-muted)' }}>Recommended Strategies</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }}>
                {optimizationResult.strategies.length} Strategies
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                Filtered for high reliability (&ge; 10 historical campaigns)
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <span className="form-label" style={{ color: 'var(--text-muted)' }}>Allocation Constraints</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#a855f7', marginTop: '6px' }}>
                Min 5% &nbsp;•&nbsp; Max 20%
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                Balanced risk & channel diversification
              </span>
            </div>
          </div>

          {/* Recommended Allocation Strategy Table */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={22} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>AI RECOMMENDED ALLOCATION</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--badge-purple-text)', background: 'var(--badge-purple-bg)', padding: '4px 12px', borderRadius: '6px', fontWeight: 600 }}>
                Nykaa Dataset Prescriptive Optimization
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--table-border-color)', color: 'var(--table-header-color)' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Rank</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Campaign Type</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Target Audience</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Channel Combination</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Campaigns</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Avg ROI</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Avg Revenue</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Avg Conversions</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Adj. Score</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Rec. %</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Recommended Amount</th>
                    <th style={{ padding: '12px 10px', fontWeight: 600 }}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizationResult.strategies.map((strat) => (
                    <tr 
                      key={strat.rank} 
                      style={{ borderBottom: '1px solid var(--table-row-border)', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--table-row-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#6366f1' }}>
                        #{strat.rank}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-heading)' }}>
                        {strat.campaign_type}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-subtle)' }}>
                        {strat.target_audience}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {strat.channel_combination}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-subtle)' }}>
                        {strat.historical_campaigns}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {strat.avg_roi}x
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-subtle)' }}>
                        ₹{Number(strat.avg_revenue).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-subtle)' }}>
                        {Number(strat.avg_conversions).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 10px', color: '#a855f7', fontWeight: 600 }}>
                        {strat.adjusted_score}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {strat.recommended_percentage}%
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                        ₹{Number(strat.recommended_amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge-recommendation ${getPriorityStyle(strat.priority)}`} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                          {strat.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visualizations Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            {/* Campaign Type Donut Chart (PART 3) */}
            <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <PieIcon size={20} color="#8b5cf6" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>Budget Allocation by Campaign Type</h4>
              </div>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={campaignTypeSummary}
                      dataKey="recommended_amount"
                      nameKey="campaign_type"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {campaignTypeSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Amount']}
                      contentStyle={{ 
                        backgroundColor: 'var(--chart-tooltip-bg)', 
                        borderColor: 'var(--chart-tooltip-border)', 
                        color: 'var(--chart-tooltip-text)', 
                        borderRadius: '8px' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recommended Channel Allocation Bar Chart (PART 2) */}
            <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BarChart2 size={20} color="var(--accent-blue)" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>Recommended Channel Allocation</h4>
              </div>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelSummary} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <XAxis dataKey="channel" stroke="var(--chart-axis-color)" fontSize={12} tickLine={false} />
                    <YAxis 
                      stroke="var(--chart-axis-color)" 
                      fontSize={12} 
                      tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      formatter={(value) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Recommended Amount']}
                      contentStyle={{ 
                        backgroundColor: 'var(--chart-tooltip-bg)', 
                        borderColor: 'var(--chart-tooltip-border)', 
                        color: 'var(--chart-tooltip-text)', 
                        borderRadius: '8px' 
                      }}
                    />
                    <Bar dataKey="recommended_investment" radius={[6, 6, 0, 0]}>
                      {channelSummary.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommended Channel Allocation Section (PART 2) */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <Layers size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>RECOMMENDED CHANNEL ALLOCATION</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {channelSummary.map((item) => (
                <div 
                  key={item.channel} 
                  style={{ background: 'var(--bg-inner-card)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px' }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {item.channel}
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '4px' }}>
                    ₹{Number(item.recommended_investment).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '2px', display: 'block' }}>
                    {item.percentage.toFixed(2)}% of total budget
                  </span>
                </div>
              ))}
            </div>

            {/* Dynamic Methodology Note */}
            <div style={{ background: 'var(--badge-blue-note-bg)', border: '1px solid var(--badge-blue-note-border)', padding: '14px 18px', borderRadius: '10px', color: 'var(--badge-blue-note-text)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>How channel allocation is calculated:</strong> Each recommended multi-channel strategy receives a portion of the total budget. That strategy budget is equally distributed across the channels included in the strategy. Channel totals therefore represent the budget-equivalent allocation derived from the recommended strategies and sum to the manager's total budget.
              </span>
            </div>
          </div>

          {/* AI Explanation Card */}
          <div className="glass-panel" style={{ padding: '28px', background: 'var(--bg-ai-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Sparkles size={20} color="#a855f7" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>WHY DID AI RECOMMEND THIS?</h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-subtle)', lineHeight: '1.7' }}>
              {optimizationResult.ai_explanation}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
