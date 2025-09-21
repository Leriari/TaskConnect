"use client";
import React, { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import * as IonIcons from "react-icons/io5";
import DashboardOverview from './components/DashboardOverview';
import DashboardAnalytics from './components/DashboardAnalytics';
import DashboardTaskers from './components/DashboardTaskers';
import type { Tasker } from './components/DashboardTaskers';
import DashboardCategories from './components/DashboardCategories';
import DashboardUsers from './components/DashboardUsers';
import { getAuth, onAuthStateChanged, User, signOut } from "firebase/auth";
import LoginForm from './components/LoginForm';
import Modal from 'react-modal';

interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
  services: any[];
}

const base64ToImageSrc = (base64?: string) =>
  base64 ? `data:image/jpeg;base64,${base64}` : undefined;

function getIonIconComponent(iconName: string | undefined) {
  if (!iconName) return null;
  let compName = "Io";
  const parts = iconName.split("-");
  compName += parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return (IonIcons as any)[compName] || null;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [taskers, setTaskers] = useState<Tasker[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Tasker>>({});
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Only fetch data if user is authenticated
  useEffect(() => {
    if (user) {
      fetchTaskers();
      fetchCategories();
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchTaskers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "taskers"));
      const data: Tasker[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Tasker[];
      setTaskers(data);
    } catch (err: any) {
      setError("Failed to fetch taskers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "serviceCategories"));
      const data: ServiceCategory[] = querySnapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as ServiceCategory))
        .filter((category) => category.name !== 'All');
      setCategories(data);
    } catch (err: any) {
      setError("Failed to fetch categories: " + err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const data = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setUsers(data);
    } catch (err: any) {
      setError("Failed to fetch users: " + err.message);
    }
  };

  const handleEdit = (tasker: Tasker) => {
    setEditId(tasker.id);
    setEditData({ ...tasker });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof Tasker, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editId) return;
    try {
      await updateDoc(doc(db, "taskers", editId), editData);
      setEditId(null);
      setEditData({});
      fetchTaskers();
    } catch (err: any) {
      setError("Failed to update tasker: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tasker? This will also remove all their services from the platform.")) return;
    try {
      // First, get all service categories and remove all services by this tasker
      const batch = writeBatch(db);
      const serviceCategoriesSnapshot = await getDocs(collection(db, "serviceCategories"));
      
      for (const categoryDoc of serviceCategoriesSnapshot.docs) {
        const categoryData = categoryDoc.data();
        if (categoryData.services && Array.isArray(categoryData.services)) {
          // Filter out all services that belong to this tasker
          const servicesToRemove = categoryData.services.filter((service: any) => 
            service.taskerId === id
          );
          
          // Remove each service that belongs to this tasker
          for (const serviceToRemove of servicesToRemove) {
            console.log('Removing service from category:', categoryDoc.id, serviceToRemove);
            batch.update(categoryDoc.ref, {
              services: arrayRemove(serviceToRemove)
            });
          }
        }
      }
      
      // Delete the tasker document
      await deleteDoc(doc(db, "taskers", id));
      
      // Commit all the service removals
      await batch.commit();
      
      // Update local state
      setTaskers((prev) => prev.filter((t) => t.id !== id));
      
      // Refresh categories to reflect the changes
      fetchCategories();
    } catch (err: any) {
      setError("Failed to delete tasker: " + err.message);
    }
  };

  const handleAddCategory = async (name: string, icon: string) => {
    try {
      // Check if category already exists
      const existingCategory = categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
      if (existingCategory) {
        throw new Error('A category with this name already exists');
      }

      // Create document ID from the category name
      const documentId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if document already exists in Firestore
      const existingDoc = await getDoc(doc(db, "serviceCategories", documentId));
      if (existingDoc.exists()) {
        throw new Error('A category with this name already exists');
      }

      // Create new category document with name as ID
      const newCategoryRef = doc(db, "serviceCategories", documentId);
      const newCategory = {
        id: documentId,
        name: name,
        icon: icon || '',
        services: []
      };

      await setDoc(newCategoryRef, {
        name: name,
        icon: icon || '',
        services: []
      });

      // Update local state
      setCategories(prev => [...prev, newCategory]);
      
      console.log('Category added successfully:', newCategory);
    } catch (err: any) {
      console.error('Error adding category:', err);
      throw new Error(err.message || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Delete the category document
      await deleteDoc(doc(db, "serviceCategories", categoryId));
      
      // Update local state
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      console.log('Category deleted successfully:', categoryId);
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError("Failed to delete category: " + err.message);
    }
  };

  const getTaskersForCategory = (category: ServiceCategory) => {
    const taskerIds = new Set((category.services || []).map((svc: any) => svc.taskerId));
    return taskers.filter((t) => taskerIds.has(t.id));
  };

  // Analytics Data Preparation
  const categoryTaskerCounts = categories.map(cat => ({
    name: cat.name,
    value: new Set((cat.services || []).map((svc: any) => svc.taskerId)).size
  })).filter(c => c.value > 0);

  const sortedCategoryTaskerCounts = [...categoryTaskerCounts].sort((a, b) => b.value - a.value).slice(0, 5);
  const pieColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: 'IoHomeOutline' },
    { id: 'taskers', label: 'Taskers', icon: 'IoPeopleOutline' },
    { id: 'categories', label: 'Categories', icon: 'IoAppsOutline' },
    { id: 'users', label: 'Users', icon: 'IoPersonCircleOutline' },
  ];

  const { IoBusinessOutline, IoChevronForwardOutline, IoChevronBackOutline, IoGridOutline } = IonIcons;

  const renderSidebar = () => (
    <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <IoBusinessOutline size={32} color="#3B82F6" />
          {!sidebarCollapsed && <span>AdminPanel</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <IoChevronForwardOutline /> : <IoChevronBackOutline />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {sidebarItems.map((item) => {
          const IconComponent = (IonIcons as any)[item.icon] || IoGridOutline;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
              title={sidebarCollapsed ? item.label : ''}
            >
              <IconComponent size={22} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderSectionHeader = (title: string, subtitle: string) => (
    <div className="section-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );

  const renderOverview = () => (
    <div className="section">
      {renderSectionHeader("Dashboard Overview", `Welcome back, Admin!`)}
      <DashboardOverview
        totalUsers={users.length}
        totalTaskers={taskers.length}
        totalCategories={categories.length}
      />
      {renderSectionHeader("Analytics", "Key metrics and tasker distribution.")}
      <DashboardAnalytics
        categoryTaskerCounts={categoryTaskerCounts}
        sortedCategoryTaskerCounts={sortedCategoryTaskerCounts}
        pieColors={pieColors}
      />
    </div>
  );

  const renderTaskers = () => (
    <div className="section">
      {renderSectionHeader("Tasker Management", "View, edit, or remove taskers from the platform.")}
      <DashboardTaskers
        taskers={taskers}
        editId={editId}
        editData={editData}
        loading={loading}
        error={error}
        handleEdit={handleEdit}
        handleCancelEdit={handleCancelEdit}
        handleEditChange={handleEditChange}
        handleEditSave={handleEditSave}
        handleDelete={handleDelete}
      />
    </div>
  );

  const renderCategories = () => (
    <DashboardCategories
      categories={categories}
      setSelectedCategory={setSelectedCategory}
      setShowCategoryModal={setShowCategoryModal}
      getIonIconComponent={getIonIconComponent}
      getTaskersForCategory={getTaskersForCategory}
      onAddCategory={handleAddCategory}
      onDeleteCategory={handleDeleteCategory}
    />
  );

  const renderUsers = () => (
    <DashboardUsers users={users} taskers={taskers} />
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'taskers':
        return renderTaskers();
      case 'categories':
        return renderCategories();
      case 'users':
        return renderUsers();
      default:
        return renderOverview();
    }
  };

  const renderCategoryModal = () => {
    if (!showCategoryModal || !selectedCategory) return null;
    const taskersForCategory = getTaskersForCategory(selectedCategory);
    return (
      <Modal
        isOpen={showCategoryModal}
        onRequestClose={() => setShowCategoryModal(false)}
        contentLabel="Category Taskers"
        ariaHideApp={false}
        style={{
          overlay: { backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000 },
          content: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            maxWidth: 900,
            width: '90%',
            borderRadius: 12,
            padding: 0,
            margin: 'auto',
            background: '#fff',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
          }
        }}
      >
        <div style={{ padding: 32, position: 'relative' }}>
          <button
            onClick={() => setShowCategoryModal(false)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}
            aria-label="Close"
          >
            &times;
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
            Taskers for {selectedCategory.name}
          </h2>
          <DashboardTaskers
            taskers={taskersForCategory}
            editId={editId}
            editData={editData}
            loading={loading}
            error={error}
            handleEdit={handleEdit}
            handleCancelEdit={handleCancelEdit}
            handleEditChange={handleEditChange}
            handleEditSave={handleEditSave}
            handleDelete={handleDelete}
          />
        </div>
      </Modal>
    );
  };

  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: 40 }}>Loading...</div>;
  }

  if (!user) {
    return <LoginForm onLogin={() => {
      const auth = getAuth();
      setUser(auth.currentUser);
    }} />;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-layout">
        {renderSidebar()}
        <main className="admin-main-content">
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 }}>
            <button
              onClick={() => {
                const auth = getAuth();
                signOut(auth);
                setUser(null);
              }}
              style={{
                background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(239,68,68,0.08)',
                transition: 'background 0.2s',
              }}
            >
              Logout
            </button>
          </div>
          {renderContent()}
          {renderCategoryModal()}
        </main>
      </div>
      <style jsx global>{`
        /* Basic Reset & Font */
        :root { --sidebar-width: 240px; --collapsed-sidebar-width: 80px; }
        body { font-family: 'Inter', sans-serif; background-color: #f7f9fc; color: #1a202c; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* Layout */
        .admin-dashboard { max-width: 1800px; margin: 0 auto; }
        .admin-layout { display: flex; min-height: 100vh; }
        
        /* Sidebar */
        .sidebar {
          width: var(--sidebar-width);
          background: #ffffff;
          display: flex; flex-direction: column;
          padding: 16px;
          transition: width 0.3s ease;
          border-right: 1px solid #e2e8f0;
          position: fixed; top: 0; left: 0; height: 100%;
        }
        .sidebar.collapsed { width: var(--collapsed-sidebar-width); }
        .sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 4px; margin-bottom: 24px;
        }
        .logo {
          display: flex; align-items: center; gap: 12px;
          font-size: 20px; font-weight: 700; color: #111827;
          overflow: hidden; white-space: nowrap;
        }
        .collapse-btn {
          background: none; border: none; color: #4a5568; cursor: pointer;
          font-size: 24px; padding: 4px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }
        .collapse-btn:hover { background: #f1f5f9; }
        
        .sidebar-nav { display: flex; flex-direction: column; gap: 8px; }
        .nav-item {
          display: flex; align-items: center; gap: 16px;
          background: none; border: none; color: #4a5568;
          font-size: 15px; font-weight: 500; text-align: left;
          width: 100%; padding: 12px; border-radius: 8px;
          cursor: pointer; transition: background 0.2s, color 0.2s;
        }
        .sidebar.collapsed .nav-item { justify-content: center; padding: 16px 12px; }
        .sidebar.collapsed .nav-item span { display: none; }
        .nav-item.active { background: #eef2ff; color: #4338ca; font-weight: 600; }
        .nav-item:not(.active):hover { background: #f8fafc; color: #111827; }
        
        /* Main Content */
        .admin-main-content {
          width: calc(100% - var(--sidebar-width));
          margin-left: var(--sidebar-width);
          padding: 32px 40px;
          transition: width 0.3s, margin-left 0.3s;
        }
        .sidebar.collapsed ~ .admin-main-content {
          width: calc(100% - var(--collapsed-sidebar-width));
          margin-left: var(--collapsed-sidebar-width);
        }
        .section-header { margin-bottom: 24px; }
        .section-header h2 { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .section-header p { font-size: 16px; color: #6b7280; }

        /* Categories Grid */
        .categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .category-card {
          background: #fff; border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          padding: 20px; display: flex; align-items: center; gap: 16px;
          cursor: pointer; border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .category-card:hover { border-color: #4A80F0; transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(74,128,240,0.1), 0 4px 6px -2px rgba(74,128,240,0.05); }
        .category-icon-wrapper {
          font-size: 24px; color: #4A80F0; background: #eef2ff;
          border-radius: 8px; width: 48px; height: 48px;
          display: flex; align-items: center; justify-content: center;
        }
        .category-info { flex: 1; }
        .category-info h3 { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 2px; }
        .category-info p { font-size: 14px; color: #6b7280; }
        .category-arrow { color: #9ca3af; transition: transform 0.2s; }
        .category-card:hover .category-arrow { transform: translateX(4px); color: #4A80F0; }
        
        /* User/Tasker Table Row Hover Style */
        .tasker-row:hover, .user-row:hover { background-color: #f9fafb; }

        .section {
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}