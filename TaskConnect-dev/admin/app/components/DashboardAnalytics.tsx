import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface DashboardAnalyticsProps {
  categoryTaskerCounts: { name: string; value: number }[];
  sortedCategoryTaskerCounts: { name: string; value: number }[];
  pieColors: string[];
}

const chartContainerStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  padding: '24px',
  minWidth: 320,
  flex: '1 1 400px',
  height: '380px',
  display: 'flex',
  flexDirection: 'column',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 24,
};

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ categoryTaskerCounts, sortedCategoryTaskerCounts, pieColors }) => (
  <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
    {/* Pie Chart */}
    <div style={chartContainerStyle}>
      <h3 style={chartTitleStyle}>Taskers per Category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryTaskerCounts}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#4A80F0"
          >
            {categoryTaskerCounts.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
    {/* Bar Chart */}
    <div style={chartContainerStyle}>
      <h3 style={chartTitleStyle}>Top Categories by Tasker Count</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedCategoryTaskerCounts} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="value" name="Taskers" fill="#4A80F0" barSize={30} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default DashboardAnalytics; 