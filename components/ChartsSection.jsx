'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sector,
} from 'recharts';

const RADIAN = Math.PI / 180;

function renderActiveShape(props) {
  const {
    cx, cy, midAngle, innerRadius, outerRadius,
    startAngle, endAngle, fill, payload, percent, value,
  } = props;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;
  const mx = cx + (outerRadius + 16) * cos;
  const my = cy + (outerRadius + 16) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 14;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  const pct = (percent * 100).toFixed(2);
  const label = `${payload.name}`;
  const subLabel = `₹${Number(value).toFixed(2)} (${pct}%)`;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={2.5} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey - 6}
        textAnchor={textAnchor}
        fill="#0f172a"
        fontSize={12}
        fontWeight={600}
      >
        {label}
      </text>
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey + 10}
        textAnchor={textAnchor}
        fill="#64748b"
        fontSize={11}
      >
        {subLabel}
      </text>
    </g>
  );
}

export default function ChartsSection({ trendBuckets, categoryBreakdown }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const hasTrendData = trendBuckets.some((b) => b.inflow > 0 || b.outflow > 0);
  const hasCategoryData = categoryBreakdown.length > 0;
  const totalOutflow = categoryBreakdown.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl2 shadow-card p-4">
        <h3 className="font-semibold mb-3 text-ink-900">Trend</h3>
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} dot={false} name="Inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} dot={false} name="Outflow" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-ink-400 text-sm">
            No Data For This Period
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl2 shadow-card p-4">
        <h3 className="font-semibold mb-3 text-ink-900">Spending By Category</h3>
        {hasCategoryData ? (
          <div className="space-y-3">
            {/* Chart gets its own full-width row, so slice callouts always have
                open space around them — no side panel to collide with. */}
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={0}
                  minAngle={3}
                  stroke="#ffffff"
                  strokeWidth={1}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(_, index) => setActiveIndex(index === activeIndex ? null : index)}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Legend now sits below, in a compact 2-column grid, never beside the chart */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {categoryBreakdown
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((entry, index) => {
                  const pct = totalOutflow > 0 ? (entry.value / totalOutflow) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate text-ink-700">{entry.name}</span>
                      </span>
                      <span className="text-ink-400 flex-shrink-0 ml-2">{pct.toFixed(2)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-ink-400 text-sm">
            No Outflow Data For This Period
          </div>
        )}
      </div>
    </div>
  );
}