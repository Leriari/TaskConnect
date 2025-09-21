import React, { useState } from 'react';
import { IoPencilOutline, IoTrashOutline, IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';

export interface Tasker {
  id: string;
  firstName: string;
  lastName: string;
  profileImageBase64?: string;
  idNumber: string;
  kraPin: string;
  onboardingStatus: string;
  services: any[];
  email?: string;
  idFrontImageBase64?: string;
  idBackImageBase64?: string;
  supportingDocuments?: SupportingDocument[];
}

interface SupportingDocument {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  base64: string;
}

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

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 14,
  width: '100%',
  background: '#fff',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const baseBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '8px 12px',
  marginRight: 8,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s, transform 0.1s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: 14,
};

const editBtnStyle: React.CSSProperties = { ...baseBtnStyle, background: '#3b82f6', color: '#fff' };
const deleteBtnStyle: React.CSSProperties = { ...baseBtnStyle, background: '#ef4444', color: '#fff' };
const saveBtnStyle: React.CSSProperties = { ...baseBtnStyle, background: '#22c55e', color: '#fff' };
const cancelBtnStyle: React.CSSProperties = { ...baseBtnStyle, background: '#6b7280', color: '#fff' };

const getStatusPillStyle = (status: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    borderRadius: '9999px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block',
    textTransform: 'capitalize',
  };
  if (status === 'completed') {
    return { ...base, background: '#dcfce7', color: '#166534' };
  }
  return { ...base, background: '#fef3c7', color: '#92400e' };
};

const base64ToImageSrc = (base64?: string, mimeType: string = 'image/jpeg') => {
  if (!base64) return undefined;
  if (base64.startsWith('data:')) return base64;
  return `data:${mimeType};base64,${base64}`;
};

const base64ToFileSrc = (doc: SupportingDocument) =>
  doc.base64 ? `data:${doc.mimeType};base64,${doc.base64}` : undefined;

const DashboardTaskers = ({
  taskers,
  editId,
  editData,
  loading,
  error,
  handleEdit,
  handleCancelEdit,
  handleEditChange,
  handleEditSave,
  handleDelete,
}: {
  taskers: Tasker[];
  editId: string | null;
  editData: Partial<Tasker>;
  loading: boolean;
  error: string | null;
  handleEdit: (tasker: Tasker) => void;
  handleCancelEdit: () => void;
  handleEditChange: (field: keyof Tasker, value: any) => void;
  handleEditSave: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}) => {
  const [selectedTasker, setSelectedTasker] = useState<Tasker | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const handleViewTasker = (tasker: Tasker) => {
    setSelectedTasker(tasker);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTasker(null);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, padding: '24px 24px 0 24px', color: '#111827' }}>Tasker Management</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading taskers...</div>
      ) : error ? (
        <div style={{ color: '#ef4444', padding: '24px' }}>{error}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={thStyle}>Tasker</th>
              <th style={thStyle}>ID Number / KRA PIN</th>
              <th style={thStyle}>Verification Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ color: '#374151' }}>
            {taskers.map((tasker: Tasker) => (
              <tr key={tasker.id} style={{ borderBottom: '1px solid #e5e7eb' }} className="tasker-row">
                <td style={{ padding: '12px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={base64ToImageSrc(tasker.profileImageBase64) || 'https://via.placeholder.com/48'}
                    alt="Profile"
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
                  />
                  <div>
                    {editId === tasker.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input
                          type="text"
                          value={editData.firstName || ''}
                          onChange={e => handleEditChange('firstName', e.target.value)}
                          style={{ ...inputStyle, width: '200px' }}
                          placeholder="First Name"
                        />
                        <input
                          type="text"
                          value={editData.lastName || ''}
                          onChange={e => handleEditChange('lastName', e.target.value)}
                          style={{ ...inputStyle, width: '200px' }}
                          placeholder="Last Name"
                        />
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600 }}>{`${tasker.firstName} ${tasker.lastName}`}</div>
                    )}
                    {editId !== tasker.id && <div style={{ fontSize: 13, color: '#6b7280' }}>{tasker.email || 'no-email@test.com'}</div>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                  {editId === tasker.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input 
                        type="text" 
                        value={editData.idNumber || ''} 
                        style={{ ...inputStyle, width: '200px', background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} 
                        placeholder="ID Number" 
                        readOnly 
                        tabIndex={-1} 
                      />
                      <input 
                        type="text" 
                        value={editData.kraPin || ''} 
                        style={{ ...inputStyle, width: '200px', background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} 
                        placeholder="KRA Pin" 
                        readOnly 
                        tabIndex={-1} 
                      />
                    </div>
                  ) : (
                    <>
                      <div>ID: <strong>{tasker.idNumber}</strong></div>
                      <div>KRA: <strong>{tasker.kraPin}</strong></div>
                    </>
                  )}
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                  {editId === tasker.id ? (
                    <select
                      value={editData.onboardingStatus || 'pendingVerification'}
                      onChange={e => handleEditChange('onboardingStatus', e.target.value)}
                      style={{ ...inputStyle, width: '200px' }}
                    >
                      <option value="pendingVerification">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <span style={getStatusPillStyle(tasker.onboardingStatus)}>
                      {tasker.onboardingStatus === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                  {editId === tasker.id ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleEditSave} style={saveBtnStyle}><IoCheckmarkOutline /> Save</button>
                      <button onClick={handleCancelEdit} style={cancelBtnStyle}><IoCloseOutline /> Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleEdit(tasker)} style={editBtnStyle}><IoPencilOutline /> Edit</button>
                      <button onClick={() => handleDelete(tasker.id)} style={deleteBtnStyle}><IoTrashOutline /> Delete</button>
                      <button onClick={() => handleViewTasker(tasker)} style={editBtnStyle}><IoPencilOutline /> View</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for viewing tasker details */}
      {showModal && selectedTasker && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            padding: '40px 36px',
            maxWidth: 520,
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(60,72,100,0.18)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <button onClick={handleCloseModal} style={{ position: 'absolute', top: 18, right: 18, fontSize: 26, background: 'none', border: 'none', color: '#888', cursor: 'pointer', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'} onMouseOut={e => e.currentTarget.style.background = 'none'}>&times;</button>
            <img
              src={base64ToImageSrc(selectedTasker.profileImageBase64) || 'https://via.placeholder.com/96'}
              alt="Profile"
              style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e5e7eb', marginBottom: 18 }}
            />
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#222', marginBottom: 6 }}>{selectedTasker.firstName} {selectedTasker.lastName}</h2>
            <div style={{ color: '#6b7280', fontSize: 15, marginBottom: 18 }}>{selectedTasker.email}</div>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>ID Number</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedTasker.idNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>KRA PIN</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedTasker.kraPin}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Status</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: selectedTasker.onboardingStatus === 'completed' ? '#22c55e' : '#f59e0b' }}>{selectedTasker.onboardingStatus === 'completed' ? 'Completed' : 'Pending'}</div>
              </div>
            </div>
            <div style={{ width: '100%', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#2E7D32' }}>ID Images</div>
              <div style={{ display: 'flex', gap: 18 }}>
                {selectedTasker.idFrontImageBase64 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Front</div>
                    <img
                      src={base64ToImageSrc(selectedTasker.idFrontImageBase64)}
                      alt="ID Front"
                      style={{ maxWidth: 120, display: 'block', cursor: 'pointer', borderRadius: 8, border: '1px solid #ccc' }}
                      onClick={() => setExpandedImage(base64ToImageSrc(selectedTasker.idFrontImageBase64)!)}
                    />
                  </div>
                )}
                {selectedTasker.idBackImageBase64 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Back</div>
                    <img
                      src={base64ToImageSrc(selectedTasker.idBackImageBase64)}
                      alt="ID Back"
                      style={{ maxWidth: 120, display: 'block', cursor: 'pointer', borderRadius: 8, border: '1px solid #ccc' }}
                      onClick={() => setExpandedImage(base64ToImageSrc(selectedTasker.idBackImageBase64)!)}
                    />
                  </div>
                )}
                {!(selectedTasker.idFrontImageBase64 || selectedTasker.idBackImageBase64) && (
                  <div style={{ color: '#888', fontSize: 14 }}>No ID images uploaded.</div>
                )}
              </div>
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#2E7D32' }}>Supporting Documents</div>
              {selectedTasker.supportingDocuments && selectedTasker.supportingDocuments.length > 0 ? (
                <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                  {selectedTasker.supportingDocuments.map(doc => (
                    <li key={doc.id} style={{ marginBottom: 16 }}>
                      <a
                        href={base64ToFileSrc(doc)}
                        download={doc.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#2563eb',
                          textDecoration: 'underline',
                          fontWeight: 600,
                          fontSize: 16,
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                        }}
                      >
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: '#888', fontSize: 14 }}>No supporting documents uploaded.</div>
              )}
            </div>
            <div style={{ width: '100%', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#2E7D32' }}>Services</div>
              {selectedTasker.services && selectedTasker.services.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedTasker.services.map((svc: any, idx: number) => (
                    <div key={idx} style={{ background: '#eef2ff', borderRadius: '6px', padding: '6px 14px', fontSize: '15px', color: '#4338ca', fontWeight: 600 }}>
                      {svc.title}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#888', fontSize: 14 }}>No services listed.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {expandedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded ID"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(60,72,100,0.28)',
              background: '#fff',
            }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            style={{
              position: 'fixed',
              top: 32,
              right: 48,
              fontSize: 32,
              color: '#fff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              zIndex: 2100,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardTaskers; 