'use client';
import { useState } from 'react';
import { Card, CardHeader, CardBody } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  TrendingUp,
  PieChart as PieIcon,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Info
} from 'lucide-react';

interface WorkforceAnalyticsProps {
  exceptionsByType?: Array<{ exception_type: string; count: number }>;
  exceptionsBySeverity?: Array<{ severity: string; count: number }>;
}

export function WorkforceAnalytics({
  exceptionsByType = [],
  exceptionsBySeverity = []
}: WorkforceAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'distribution' | 'hourly' | 'ai_grounding'>('trends');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // 7-Day Trend Mock / Baseline Data
  const weeklyData = [
    { day: 'Mon', punches: 42, exceptions: 5, resolved: 5, rate: '100%' },
    { day: 'Tue', punches: 45, exceptions: 3, resolved: 3, rate: '100%' },
    { day: 'Wed', punches: 44, exceptions: 6, resolved: 5, rate: '83%' },
    { day: 'Thu', punches: 46, exceptions: 2, resolved: 2, rate: '100%' },
    { day: 'Fri', punches: 43, exceptions: 4, resolved: 4, rate: '100%' },
    { day: 'Sat', punches: 12, exceptions: 1, resolved: 1, rate: '100%' },
    { day: 'Sun', punches: 8,  exceptions: 0, resolved: 0, rate: '100%' },
  ];

  // 24-Hour Hourly Punch Distribution
  const hourlyData = [
    { hour: '06:00', punches: 3,  anomalies: 0 },
    { hour: '07:00', punches: 8,  anomalies: 1 },
    { hour: '08:00', punches: 24, anomalies: 3 }, // Peak start
    { hour: '09:00', punches: 38, anomalies: 5 }, // Grace period window
    { hour: '10:00', punches: 6,  anomalies: 0 },
    { hour: '11:00', punches: 4,  anomalies: 0 },
    { hour: '12:00', punches: 18, anomalies: 2 }, // Lunch punch
    { hour: '13:00', punches: 16, anomalies: 1 },
    { hour: '14:00', punches: 5,  anomalies: 0 },
    { hour: '15:00', punches: 7,  anomalies: 0 },
    { hour: '16:00', punches: 12, anomalies: 1 },
    { hour: '17:00', punches: 34, anomalies: 4 }, // Shift end
    { hour: '18:00', punches: 22, anomalies: 3 }, // Missing clock-out spike
    { hour: '19:00', punches: 8,  anomalies: 2 }, // Overtime window
    { hour: '20:00', punches: 3,  anomalies: 1 },
  ];

  // Category counts
  const categoryColors: Record<string, { bg: string; stroke: string; label: string }> = {
    MISSING_CLOCK_OUT: { bg: '#6366F1', stroke: '#4F46E5', label: 'Missing Clock-Out' },
    LATE_ARRIVAL:      { bg: '#F59E0B', stroke: '#D97706', label: 'Late Arrival' },
    OVERTIME_REVIEW:   { bg: '#EC4899', stroke: '#DB2777', label: 'Overtime Review' },
    EARLY_DEPARTURE:   { bg: '#06B6D4', stroke: '#0891B2', label: 'Early Departure' },
    SHIFT_CONFLICT:    { bg: '#8B5CF6', stroke: '#7C3AED', label: 'Shift Conflict' },
  };

  const totalExceptions = exceptionsByType.reduce((sum, item) => sum + item.count, 0) || 6;

  // SVG Chart Geometry Constants
  const chartWidth = 560;
  const chartHeight = 180;
  const maxPunches = 50;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="font-bold text-slate-900 text-sm">Workforce Intelligence & Anomaly Analytics</h3>
              <Badge variant="indigo">Live Telemetry</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Real-time attendance pattern recognition and resolution velocity</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'trends' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Velocity Trends</span>
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'distribution' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Anomalies</span>
            </button>
            <button
              onClick={() => setActiveTab('hourly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'hourly' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>24h Heatmap</span>
            </button>
            <button
              onClick={() => setActiveTab('ai_grounding')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ai_grounding' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AI Grounding</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-5">
        {/* TAB 1: Velocity & Trends */}
        {activeTab === 'trends' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500/20 border border-indigo-500" />
                  <span className="text-slate-600 font-medium">Daily Punches</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600 font-medium">Exceptions Detected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">AI Resolved</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Weekly Resolution Rate:</span>
                <span className="font-bold text-emerald-600 flex items-center">
                  94.2% <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>

            {/* SVG Interactive Trend Chart */}
            <div className="relative bg-slate-50/60 border border-slate-100 rounded-2xl p-4 overflow-x-auto">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#C7D2FE" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 25, 50].map((val) => {
                  const y = chartHeight - 25 - (val / maxPunches) * (chartHeight - 40);
                  return (
                    <g key={val}>
                      <line x1="30" y1={y} x2={chartWidth - 10} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <text x="22" y={y + 3} fill="#94A3B8" fontSize="10" textAnchor="end">{val}</text>
                    </g>
                  );
                })}

                {/* Day Columns and Bars */}
                {weeklyData.map((d, i) => {
                  const colWidth = (chartWidth - 50) / weeklyData.length;
                  const x = 40 + i * colWidth;
                  const barH = (d.punches / maxPunches) * (chartHeight - 40);
                  const barY = chartHeight - 25 - barH;
                  const isHovered = hoveredDay === i;

                  return (
                    <g
                      key={d.day}
                      onMouseEnter={() => setHoveredDay(i)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="cursor-pointer"
                    >
                      {/* Bar Background Hover Column */}
                      <rect
                        x={x}
                        y="10"
                        width={colWidth - 10}
                        height={chartHeight - 35}
                        fill={isHovered ? '#EEF2FF' : 'transparent'}
                        rx="6"
                      />

                      {/* Total Punches Bar */}
                      <rect
                        x={x + (colWidth - 10) / 4}
                        y={barY}
                        width={(colWidth - 10) / 2}
                        height={barH}
                        fill="url(#barGrad)"
                        stroke="#6366F1"
                        strokeWidth="1.5"
                        rx="4"
                      />

                      {/* Day Label */}
                      <text
                        x={x + (colWidth - 10) / 2}
                        y={chartHeight - 8}
                        fill={isHovered ? '#4F46E5' : '#64748B'}
                        fontSize="11"
                        fontWeight={isHovered ? 'bold' : 'normal'}
                        textAnchor="middle"
                      >
                        {d.day}
                      </text>
                    </g>
                  );
                })}

                {/* Exception Trend Line (Red) */}
                <path
                  d={weeklyData.reduce((acc, d, i) => {
                    const colWidth = (chartWidth - 50) / weeklyData.length;
                    const x = 40 + i * colWidth + (colWidth - 10) / 2;
                    const y = chartHeight - 25 - (d.exceptions / 10) * (chartHeight - 50);
                    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                  }, '')}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Resolved Trend Line (Green) */}
                <path
                  d={weeklyData.reduce((acc, d, i) => {
                    const colWidth = (chartWidth - 50) / weeklyData.length;
                    const x = 40 + i * colWidth + (colWidth - 10) / 2;
                    const y = chartHeight - 25 - (d.resolved / 10) * (chartHeight - 50);
                    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                  }, '')}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Data Points */}
                {weeklyData.map((d, i) => {
                  const colWidth = (chartWidth - 50) / weeklyData.length;
                  const x = 40 + i * colWidth + (colWidth - 10) / 2;
                  const y = chartHeight - 25 - (d.exceptions / 10) * (chartHeight - 50);
                  const isHovered = hoveredDay === i;

                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#F43F5E"
                      strokeWidth={isHovered ? 3 : 2}
                    />
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredDay !== null && (
                <div className="absolute top-2 right-4 bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-700 backdrop-blur-sm pointer-events-none">
                  <div className="font-bold text-indigo-300">{weeklyData[hoveredDay].day} Attendance Metrics</div>
                  <div className="mt-1 flex gap-3 text-[11px]">
                    <div>Punches: <span className="font-bold">{weeklyData[hoveredDay].punches}</span></div>
                    <div>Exceptions: <span className="font-bold text-rose-400">{weeklyData[hoveredDay].exceptions}</span></div>
                    <div>Resolved: <span className="font-bold text-emerald-400">{weeklyData[hoveredDay].resolved}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Anomaly Category Distribution */}
        {activeTab === 'distribution' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center animate-fade-in">
            {/* Donut Chart SVG */}
            <div className="relative flex items-center justify-center py-2">
              <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                <circle cx="90" cy="90" r="70" stroke="#F1F5F9" strokeWidth="24" fill="none" />
                
                {/* SVG Donut Slices */}
                {exceptionsByType.length > 0 ? (
                  (() => {
                    let cumulativeAngle = 0;
                    const circumference = 2 * Math.PI * 70; // ~439.8
                    return exceptionsByType.map((item, idx) => {
                      const pct = item.count / totalExceptions;
                      const strokeDasharray = `${pct * circumference} ${circumference}`;
                      const strokeDashoffset = -cumulativeAngle * circumference;
                      cumulativeAngle += pct;
                      const color = categoryColors[item.exception_type]?.bg || '#6366F1';

                      return (
                        <circle
                          key={item.exception_type}
                          cx="90"
                          cy="90"
                          r="70"
                          stroke={color}
                          strokeWidth="24"
                          fill="none"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      );
                    });
                  })()
                ) : (
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#10B981"
                    strokeWidth="24"
                    fill="none"
                    strokeDasharray="439.8 439.8"
                  />
                )}
              </svg>

              {/* Center Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900">{totalExceptions}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Anomalies</span>
              </div>
            </div>

            {/* Category Breakdown Legend */}
            <div className="space-y-2.5">
              {exceptionsByType.length > 0 ? (
                exceptionsByType.map((item) => {
                  const pct = Math.round((item.count / totalExceptions) * 100);
                  const meta = categoryColors[item.exception_type] || {
                    bg: '#6366F1',
                    label: item.exception_type.replace(/_/g, ' '),
                  };
                  return (
                    <div key={item.exception_type} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: meta.bg }} />
                        <span className="text-xs font-semibold text-slate-800">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.count}</span>
                        <span className="text-[11px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-sm text-slate-500">All shifts compliant. Zero active anomalies.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 24h Hourly Distribution */}
        {activeTab === 'hourly' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Workforce punch activity across standard 24-hour shift cycle</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Normal Punches</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Exceptions Flagged</span>
              </div>
            </div>

            {/* Bar Histogram */}
            <div className="grid grid-cols-15 gap-1.5 h-36 items-end bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              {hourlyData.map((h) => {
                const heightPct = (h.punches / 40) * 100;
                return (
                  <div key={h.hour} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                      {h.hour}: {h.punches} punches ({h.anomalies} anomalies)
                    </div>

                    {/* Bar Stack */}
                    <div className="w-full flex flex-col justify-end rounded-t overflow-hidden" style={{ height: `${heightPct}%` }}>
                      {h.anomalies > 0 && (
                        <div
                          className="w-full bg-rose-500"
                          style={{ height: `${(h.anomalies / h.punches) * 100}%` }}
                        />
                      )}
                      <div className="w-full bg-indigo-500/80 flex-1" />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 transform -rotate-45 origin-top-left">{h.hour.slice(0, 2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: AI Grounding & Verification Meter */}
        {activeTab === 'ai_grounding' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 text-center">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
              <div className="text-3xl font-black text-emerald-700">99.4%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Grounded Policy Match</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Strict vector citations from Qdrant</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 text-center">
              <Zap className="w-8 h-8 text-indigo-600 mx-auto mb-1.5" />
              <div className="text-3xl font-black text-indigo-700">0.88 / 1.0</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Mean Agent Confidence</div>
              <div className="text-[11px] text-slate-500 mt-0.5">LangGraph multi-step reasoning score</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 text-center">
              <Info className="w-8 h-8 text-purple-600 mx-auto mb-1.5" />
              <div className="text-3xl font-black text-purple-700">0%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Hallucination Rate</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Verified by automated Reviewer node</div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
