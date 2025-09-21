import React, { useState } from 'react';
import * as IonIcons from "react-icons/io5";

// Service-related icons for categories
const commonIcons = [
  // Home & Building Services
  { name: 'home-outline', label: 'Home' },
  { name: 'build-outline', label: 'Building' },
  { name: 'construct-outline', label: 'Construction' },
  { name: 'business-outline', label: 'Business' },
  { name: 'office-outline', label: 'Office' },
  
  // Tools & Repair Services
  { name: 'wrench-outline', label: 'Tools' },
  { name: 'hammer-outline', label: 'Repair' },
  { name: 'cog-outline', label: 'Machinery' },
  { name: 'settings-outline', label: 'Installation' },
  { name: 'hardware-chip-outline', label: 'Electronics' },
  
  // Cleaning & Maintenance
  { name: 'brush-outline', label: 'Cleaning' },
  { name: 'water-outline', label: 'Plumbing' },
  { name: 'leaf-outline', label: 'Garden' },
  { name: 'trash-outline', label: 'Waste' },
  { name: 'reload-outline', label: 'Maintenance' },
  
  // Electrical & Technology
  { name: 'flash-outline', label: 'Electrical' },
  { name: 'laptop-outline', label: 'Technology' },
  { name: 'desktop-outline', label: 'Computer' },
  { name: 'phone-portrait-outline', label: 'Mobile' },
  { name: 'wifi-outline', label: 'Internet' },
  
  // Health & Wellness
  { name: 'medical-outline', label: 'Medical' },
  { name: 'fitness-outline', label: 'Fitness' },
  { name: 'heart-outline', label: 'Health' },
  { name: 'body-outline', label: 'Wellness' },
  { name: 'nutrition-outline', label: 'Nutrition' },
  
  // Food & Hospitality
  { name: 'restaurant-outline', label: 'Food' },
  { name: 'cafe-outline', label: 'Cafe' },
  { name: 'wine-outline', label: 'Catering' },
  { name: 'fast-food-outline', label: 'Fast Food' },
  { name: 'pizza-outline', label: 'Pizza' },
  
  // Education & Training
  { name: 'school-outline', label: 'Education' },
  { name: 'library-outline', label: 'Library' },
  { name: 'book-outline', label: 'Tutoring' },
  { name: 'calculator-outline', label: 'Math' },
  { name: 'language-outline', label: 'Language' },
  
  // Transportation & Delivery
  { name: 'car-outline', label: 'Car' },
  { name: 'bicycle-outline', label: 'Bicycle' },
  { name: 'airplane-outline', label: 'Air Travel' },
  { name: 'boat-outline', label: 'Marine' },
  { name: 'train-outline', label: 'Train' },
  { name: 'rocket-outline', label: 'Delivery' },
  
  // Beauty & Personal Care
  { name: 'cut-outline', label: 'Haircut' },
  { name: 'color-palette-outline', label: 'Beauty' },
  { name: 'sparkles-outline', label: 'Spa' },
  { name: 'shirt-outline', label: 'Fashion' },
  { name: 'diamond-outline', label: 'Jewelry' },
  
  // Entertainment & Events
  { name: 'musical-notes-outline', label: 'Music' },
  { name: 'camera-outline', label: 'Photography' },
  { name: 'videocam-outline', label: 'Video' },
  { name: 'game-controller-outline', label: 'Gaming' },
  { name: 'ticket-outline', label: 'Events' },
  { name: 'film-outline', label: 'Film' },
  
  // Professional Services
  { name: 'people-outline', label: 'Consulting' },
  { name: 'person-outline', label: 'Personal' },
  { name: 'briefcase-outline', label: 'Professional' },
  { name: 'card-outline', label: 'Financial' },
  { name: 'shield-outline', label: 'Security' },
  { name: 'law-outline', label: 'Legal' },
  
  // Pet & Animal Services
  { name: 'paw-outline', label: 'Pet Care' },
  { name: 'fish-outline', label: 'Aquarium' },
  { name: 'bird-outline', label: 'Bird Care' },
  { name: 'bug-outline', label: 'Pest Control' },
  
  // Sports & Recreation
  { name: 'football-outline', label: 'Sports' },
  { name: 'basketball-outline', label: 'Basketball' },
  { name: 'tennisball-outline', label: 'Tennis' },
  { name: 'golf-outline', label: 'Golf' },
  
  // Child & Family Services
  { name: 'baby-outline', label: 'Childcare' },
  { name: 'people-circle-outline', label: 'Family' },
  { name: 'happy-outline', label: 'Entertainment' },
  
  // Environmental Services
  { name: 'recycle-outline', label: 'Recycling' },
  { name: 'sunny-outline', label: 'Solar' },
  { name: 'earth-outline', label: 'Green' },
];

interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
  services: any[];
}

const DashboardCategories = ({
  categories,
  setSelectedCategory,
  setShowCategoryModal,
  getIonIconComponent,
  getTaskersForCategory,
  onAddCategory,
  onDeleteCategory,
}: {
  categories: ServiceCategory[];
  setSelectedCategory: (category: ServiceCategory) => void;
  setShowCategoryModal: (show: boolean) => void;
  getIonIconComponent: (iconName?: string) => React.ComponentType<any> | null;
  getTaskersForCategory: (category: ServiceCategory) => any[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
}) => {
  const { IoGridOutline, IoChevronForwardOutline, IoAddOutline } = IonIcons;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearchTerm, setIconSearchTerm] = useState('');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    setIsAdding(true);
    try {
      await onAddCategory(newCategoryName.trim(), newCategoryIcon);
      setNewCategoryName('');
      setNewCategoryIcon('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>Service Categories</h2>
        <p>Manage categories and view assigned taskers.</p>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'linear-gradient(90deg, #4A80F0 0%, #5CBD6A 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            boxShadow: '0 2px 8px rgba(74,128,240,0.15)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,128,240,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,128,240,0.15)';
          }}
        >
          <IoAddOutline size={18} />
          Add Category
        </button>
      </div>
      
      <div className="categories-grid">
        {categories.map((cat: ServiceCategory) => {
          const IconComp = getIonIconComponent(cat.icon) || IoGridOutline;
          const taskerCount = getTaskersForCategory(cat).length;

          return (
            <div
              key={cat.id}
              className="category-card"
              style={{ position: 'relative' }}
            >
              <div 
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                onClick={() => { setSelectedCategory(cat); setShowCategoryModal(true); }}
              >
                <div className="category-icon-wrapper">
                  <IconComp size={28} />
                </div>
                <div className="category-info">
                  <h3>{cat.name}</h3>
                  <p>{taskerCount} tasker{taskerCount !== 1 ? 's' : ''}</p>
                </div>
                <IoChevronForwardOutline className="category-arrow" size={20} />
              </div>
              
              {onDeleteCategory && taskerCount === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
                      onDeleteCategory(cat.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                  title="Delete category"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#111827' }}>
              Add New Category
            </h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Category Name *
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Cleaning, Plumbing, Electrical"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 16,
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4A80F0'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Icon (optional)
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    minWidth: 120,
                  }}
                >
                  {newCategoryIcon ? (
                    <>
                      {(() => {
                        const IconComp = getIonIconComponent(newCategoryIcon);
                        return IconComp ? <IconComp size={20} color="#4A80F0" /> : <IonIcons.IoGridOutline size={20} color="#4A80F0" />;
                      })()}
                      <span style={{ fontSize: 14, color: '#374151' }}>
                        {commonIcons.find(icon => icon.name === newCategoryIcon)?.label || 'Custom'}
                      </span>
                    </>
                  ) : (
                    <>
                      <IonIcons.IoGridOutline size={20} color="#9ca3af" />
                      <span style={{ fontSize: 14, color: '#9ca3af' }}>Select Icon</span>
                    </>
                  )}
                </button>
                
                {newCategoryIcon && (
                  <button
                    type="button"
                    onClick={() => setNewCategoryIcon('')}
                    style={{
                      padding: '8px',
                      border: '1px solid #ef4444',
                      borderRadius: 6,
                      background: '#fff',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {showIconPicker && (
                <div style={{
                  marginTop: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  background: '#f9fafb',
                  maxHeight: 300,
                  overflowY: 'auto',
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearchTerm}
                      onChange={(e) => setIconSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 14,
                        outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4A80F0'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  
                                    <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: 8,
                  }}>
                    {(() => {
                      const filteredIcons = commonIcons.filter(icon => 
                        icon.name.toLowerCase().includes(iconSearchTerm.toLowerCase()) ||
                        icon.label.toLowerCase().includes(iconSearchTerm.toLowerCase())
                      );
                      
                      if (filteredIcons.length === 0) {
                        return (
                          <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '20px',
                            color: '#6b7280',
                            fontSize: 14,
                          }}>
                            No icons found matching "{iconSearchTerm}"
                          </div>
                        );
                      }
                      
                      return filteredIcons.map((icon) => {
                        const IconComp = getIonIconComponent(icon.name);
                        return (
                          <button
                            key={icon.name}
                            type="button"
                            onClick={() => {
                              setNewCategoryIcon(icon.name);
                              setShowIconPicker(false);
                              setIconSearchTerm('');
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                              padding: '8px 4px',
                              border: '1px solid #e5e7eb',
                              borderRadius: 6,
                              background: '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.borderColor = '#4A80F0';
                              e.currentTarget.style.background = '#eef2ff';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.background = '#fff';
                            }}
                          >
                            {IconComp ? <IconComp size={20} color="#4A80F0" /> : <IonIcons.IoGridOutline size={20} color="#9ca3af" />}
                            <span style={{ fontSize: 10, color: '#374151', textAlign: 'center' }}>
                              {icon.label}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                Click to select an icon, or leave empty for default grid icon.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={isAdding || !newCategoryName.trim()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: isAdding || !newCategoryName.trim() ? '#9ca3af' : 'linear-gradient(90deg, #4A80F0 0%, #5CBD6A 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: isAdding || !newCategoryName.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isAdding ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCategories; 