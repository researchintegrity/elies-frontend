// src/AppLayout.jsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// Importa todas as páginas
import UploadPDFPage from './pages/UploadPDFPage'; 
import UploadImagePage from './pages/UploadImagePage';
import ViewImagesPage from './pages/ViewImagesPage';
import ViewPDFPage from './pages/ViewPDFPage';
import AnnotationPage from './pages/AnnotationPage';

import './App.css'; 

// Define as chaves para todas as páginas
const PAGES = {
  UPLOAD_IMAGE: 'uploadImage',
  VIEW_IMAGES: 'viewImages',
  ANNOTATION: 'annotation', // 2. ADICIONE A CHAVE DA NOVA PÁGINA
  UPLOAD_PDF: 'uploadPDF',
  VIEW_PDFS: 'viewPDFs',
  SEARCH: 'search',
};

function AppLayout() {
  // 3. Mudei o estado inicial para 'ANNOTATION' para você ver a nova página
  const [activePage, setActivePage] = useState(PAGES.ANNOTATION);

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
      case PAGES.SEARCH:
        return <div>Página "Search" (Em breve)</div>;
      default:
        return <AnnotationPage />;
    }
  };

  return (
    <div className="app-container">
      {/* Passe os props para a Sidebar (agora incluindo a chave 'pages') */}
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        pages={PAGES}
      />
      <main className="main-content">
        <Topbar /> 
        {/* Renderiza a página selecionada */}
        {renderActivePage()}
      </main>
    </div>
  );
}

export default AppLayout;
