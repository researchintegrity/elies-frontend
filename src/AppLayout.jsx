// src/AppLayout.jsx
import React, { useState, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoadingFallback from './components/LoadingFallback';

// ✅ CODE SPLITTING: Lazy load all pages
const UploadPDFPage = lazy(() => import('./pages/UploadPDFPage'));
const UploadImagePage = lazy(() => import('./pages/UploadImagePage'));
const ViewImagesPage = lazy(() => import('./pages/ViewImagesPage'));
const ViewPDFPage = lazy(() => import('./pages/ViewPDFPage'));
const AnnotationPage = lazy(() => import('./pages/AnnotationPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CBIRSearchPage = lazy(() => import('./pages/CBIRSearchPage'));

// Page keys
const PAGES = {
  UPLOAD_IMAGE: 'uploadImage',
  VIEW_IMAGES: 'viewImages',
  ANNOTATION: 'annotation',
  UPLOAD_PDF: 'uploadPDF',
  VIEW_PDFS: 'viewPDFs',
  PROFILE: 'profile',
  SEARCH: 'search',
  CBIR_SEARCH: 'cbirSearch',
};

function AppLayout() {
  const [activePage, setActivePage] = useState(PAGES.VIEW_IMAGES);

  const renderActivePage = () => {
    switch (activePage) {
      case PAGES.UPLOAD_IMAGE:
        return <UploadImagePage />;
      case PAGES.VIEW_IMAGES:
        return <ViewImagesPage />;
      case PAGES.ANNOTATION:
        return <AnnotationPage />;
      case PAGES.UPLOAD_PDF:
        return <UploadPDFPage />;
      case PAGES.VIEW_PDFS:
        return <ViewPDFPage />;
      case PAGES.PROFILE:
        return <ProfilePage />;
      case PAGES.SEARCH:
        return <div className="flex items-center justify-center h-full text-gray-400">Página "Search" (Em breve)</div>;
      case PAGES.CBIR_SEARCH:
        return <CBIRSearchPage />;
      default:
        return <ViewImagesPage />;
    }
  };

  return (
    <div className="grid grid-cols-[280px_1fr] min-h-screen bg-gray-50 dark:bg-dark-deep">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        pages={PAGES}
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

