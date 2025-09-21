import React from 'react';
import { IoPersonCircleOutline } from 'react-icons/io5';

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#f9fafb',
  color: '#6b7280',
  fontWeight: 600,
  fontSize: 13,
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const getRolePillStyle = (isTasker: boolean): React.CSSProperties => {
  const base: React.CSSProperties = {
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block',
  };
  if (isTasker) {
    return { ...base, background: '#e0f2fe', color: '#0284c7' }; // light-blue
  }
  return { ...base, background: '#f0fdf4', color: '#16a34a' }; // light-green
};

const DashboardUsers = ({ users, taskers }: { users: any[], taskers: any[] }) => {
  const taskerIds = new Set(taskers.map((t: any) => t.id));

  return (
    <div className="section">
      <div className="section-header">
        <h2>User Management</h2>
        <p>A list of all {users.length} registered users on the platform.</p>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Role</th>
            </tr>
          </thead>
          <tbody style={{ color: '#374151' }}>
            {users.map((user: any) => {
              const isTasker = taskerIds.has(user.id);
              return (
                <tr key={user.id} className="user-row" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <IoPersonCircleOutline size={40} color="#9ca3af" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{user.displayName || user.fullName || 'N/A'}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>ID: {user.id}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>{user.email || 'No Email'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{user.phoneNumber || 'No Phone'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={getRolePillStyle(isTasker)}>
                      {isTasker ? 'Tasker' : 'Customer'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardUsers; 