// src/AppLayout.jsx
import React, { useState, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoadingFallback from './components/LoadingFallback';
import { useLanguage } from './context/LanguageContext';

// ✅ CODE SPLITTING: Lazy load all pages
const UploadPDFPage = lazy(() => import('./pages/UploadPDFPage'));
const UploadImagePage = lazy(() => import('./pages/UploadImagePage'));
const ViewImagesPage = lazy(() => import('./pages/ViewImagesPage'));
const ViewPDFPage = lazy(() => import('./pages/ViewPDFPage'));

const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CBIRSearchPage = lazy(() => import('./pages/CBIRSearchPage'));
const ImageAnalysisPage = lazy(() => import('./pages/ImageAnalysisPage'));
const ProvenancePage = lazy(() => import('./pages/ProvenancePage'));
const CopyMovePage = lazy(() => import('./pages/CopyMovePage'));
const ManipulationDetectionPage = lazy(() => import('./pages/ManipulationDetectionPage'));
const AnalysisDashboardPage = lazy(() => import('./pages/AnalysisDashboardPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));

// Page keys
const PAGES = {
  UPLOAD_IMAGE: 'uploadImage',

  VIEW_IMAGES: 'viewImages',
  UPLOAD_PDF: 'uploadPDF',
  VIEW_PDFS: 'viewPDFs',
  PROFILE: 'profile',
  SEARCH: 'search',
  CBIR_SEARCH: 'cbirSearch',
  IMAGE_ANALYSIS: 'imageAnalysis',
  PROVENANCE: 'provenance',
  COPY_MOVE: 'copyMove',
  MANIPULATION_DETECTION: 'manipulationDetection',
  ANALYSIS_DASHBOARD: 'analysisDashboard',
  // Admin pages
  ADMIN_DASHBOARD: 'adminDashboard',
  ADMIN_USERS: 'adminUsers',
};

function AppLayout() {
  // Check sessionStorage for reproduce/view results navigation
  const getInitialPage = () => {
    // First check for reproduce navigation
    const reproduceData = sessionStorage.getItem('reproduceAnalysis');
    if (reproduceData) {
      try {
        const { targetPage } = JSON.parse(reproduceData);
        if (targetPage) {
          return targetPage;
        }
      } catch (err) {
        console.error('Failed to parse reproduce data:', err);
      }
    }

    // Then check for view results navigation
    const viewResultsData = sessionStorage.getItem('viewResultsAnalysis');
    if (viewResultsData) {
      try {
        const { targetPage } = JSON.parse(viewResultsData);
        if (targetPage) {
          return targetPage;
        }
      } catch (err) {
        console.error('Failed to parse view results data:', err);
      }
    }

    return PAGES.VIEW_IMAGES;
  };

  const [activePage, setActivePage] = useState(getInitialPage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { t } = useLanguage();

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const renderActivePage = () => {
    switch (activePage) {
      case PAGES.UPLOAD_IMAGE:
        return <UploadImagePage />;
      case PAGES.VIEW_IMAGES:
        return <ViewImagesPage />;

      case PAGES.UPLOAD_PDF:
        return <UploadPDFPage />;
      case PAGES.VIEW_PDFS:
        return <ViewPDFPage />;
      case PAGES.PROFILE:
        return <ProfilePage />;
      case PAGES.SEARCH:
        return <div className="flex items-center justify-center h-full text-gray-400">{t('common.searchPage')}</div>;
      case PAGES.CBIR_SEARCH:
        return <CBIRSearchPage />;
      case PAGES.IMAGE_ANALYSIS:
        return <ImageAnalysisPage />;
      case PAGES.PROVENANCE:
        return <ProvenancePage />;
      case PAGES.COPY_MOVE:
        return <CopyMovePage />;
      case PAGES.MANIPULATION_DETECTION:
        return <ManipulationDetectionPage />;
      case PAGES.ANALYSIS_DASHBOARD:
        return <AnalysisDashboardPage />;
      // Admin pages
      case PAGES.ADMIN_DASHBOARD:
        return <AdminDashboard />;
      case PAGES.ADMIN_USERS:
        return <AdminUsersPage />;
      default:
        return <ViewImagesPage />;
    }
  };

  return (
    <div className={`grid min-h-screen bg-gray-50 dark:bg-dark-deep transition-all duration-300 ${sidebarCollapsed ? 'grid-cols-[72px_1fr]' : 'grid-cols-[280px_1fr]'
      }`}>
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        pages={PAGES}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <main className="flex flex-col min-h-screen overflow-hidden">
        {/* Content wrapper with padding */}
        <div className="flex-1 flex flex-col px-8 py-6 overflow-y-auto scrollbar-custom">
          <Topbar />

          {/* Page Content with Suspense */}
          <div className="flex-1 animate-fade-in">
            <Suspense fallback={<LoadingFallback />}>
              {renderActivePage()}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
