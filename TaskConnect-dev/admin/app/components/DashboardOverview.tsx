import React from 'react';
import { IoPeopleOutline, IoBuildOutline, IoAppsOutline } from 'react-icons/io5';

interface DashboardOverviewProps {
  totalUsers: number;
  totalTaskers: number;
  totalCategories: number;
}

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => {
  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: '1 1 250px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  };

  const iconContainerStyle: React.CSSProperties = {
    width: 50,
    height: 50,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color,
    background: `${color}20`, // Light background tint
    fontSize: '24px',
  };

  const textContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
  };

  return (
    <div style={cardStyle} onMouseOver={e => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }} onMouseOut={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    }}>
      <div style={iconContainerStyle}>{icon}</div>
      <div style={textContainerStyle}>
        <div style={labelStyle}>{label}</div>
        <div style={valueStyle}>{value}</div>
      </div>
    </div>
  );
};

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ totalUsers, totalTaskers, totalCategories }) => (
  <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
    <StatCard icon={<IoPeopleOutline />} label="Total Users" value={totalUsers} color="#3B82F6" />
    <StatCard icon={<IoBuildOutline />} label="Total Taskers" value={totalTaskers} color="#10B981" />
    <StatCard icon={<IoAppsOutline />} label="Total Categories" value={totalCategories} color="#F59E0B" />
  </div>
);

export default DashboardOverview; 