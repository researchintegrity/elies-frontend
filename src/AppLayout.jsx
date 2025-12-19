// src/AppLayout.jsx
import React, { useState, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoadingFallback from './components/LoadingFallback';

// ✅ CODE SPLITTING: Lazy load todas as páginas
// Cada página agora é carregada apenas quando necessária
const UploadPDFPage = lazy(() => import('./pages/UploadPDFPage'));
const UploadImagePage = lazy(() => import('./pages/UploadImagePage'));
const ViewImagesPage = lazy(() => import('./pages/ViewImagesPage'));
const ViewPDFPage = lazy(() => import('./pages/ViewPDFPage'));
const AnnotationPage = lazy(() => import('./pages/AnnotationPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CBIRSearchPage = lazy(() => import('./pages/CBIRSearchPage'));

// Define as chaves para todas as páginas
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
  // 3. Mudei o estado inicial para 'ANNOTATION' para você ver a nova página
  const [activePage, setActivePage] = useState(PAGES.VIEW_IMAGES);

  // Renderiza o componente da página ativa
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
        return <div>Página "Search" (Em breve)</div>;
      case PAGES.CBIR_SEARCH:
        return <CBIRSearchPage />;
      default:
        return <ViewImagesPage />;
    }
  };

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      {/* Passe os props para a Sidebar (agora incluindo a chave 'pages') */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        pages={PAGES}
      />
      <main className="flex flex-col bg-deep-dark dark:bg-dark-deep p-8">
        <Topbar />
        {/* ✅ Suspense: Mostra LoadingFallback enquanto página carrega */}
        <Suspense fallback={<LoadingFallback />}>
          {renderActivePage()}
        </Suspense>
      </main>
    </div>
  );
}

export default AppLayout;
