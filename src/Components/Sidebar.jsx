// src/components/Sidebar.jsx
import React from 'react';
import './Sidebar.css';
import { 
  FiImage, 
  FiFileText, 
  FiUpload, 
  FiSearch, 
  FiTag, 
  FiSettings,
  FiGrid, // Ícone para "View Imagens"
  FiEdit  // Ícone para "Anotar Imagens"
} from 'react-icons/fi';

// 1. Recebe os props (activePage, onNavigate, pages) do AppLayout
const Sidebar = ({ activePage, onNavigate, pages }) => {
  
  // 2. Função helper para definir a classe 'active'
  const getItemClass = (pageKey) => {
    return `menu-item ${activePage === pageKey ? 'active' : ''}`;
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h3>Plataforma de Análise</h3>
        <p>Bem-vindo, Guilherme</p>
      </div>

      <div className="sidebar-menu">
        {/* Botão de Upload Imagens */}
        <button 
          className={getItemClass(pages.UPLOAD_IMAGE)}
          onClick={() => onNavigate(pages.UPLOAD_IMAGE)}
        >
          <FiImage />
          <span>Upload Imagens</span>
        </button>
        
        {/* Botão de View Imagens */}
        <button 
          className={getItemClass(pages.VIEW_IMAGES)}
          onClick={() => onNavigate(pages.VIEW_IMAGES)}
        >
          <FiGrid />
          <span>View Imagens</span>
        </button>

        {/* 3. BOTÃO ADICIONADO PARA ANOTAÇÃO */}
        <button 
          className={getItemClass(pages.ANNOTATION)}
          onClick={() => onNavigate(pages.ANNOTATION)}
        >
          <FiEdit />
          <span>Anotar Imagens</span>
        </button>
        
        {/* Botão de View PDFs */}
        <button 
          className={getItemClass(pages.VIEW_PDFS)}
          onClick={() => onNavigate(pages.VIEW_PDFS)}
        >
          <FiFileText />
          <span>View PDFs</span>
        </button>

        {/* Botão de Upload PDF */}
        <button 
          className={getItemClass(pages.UPLOAD_PDF)}
          onClick={() => onNavigate(pages.UPLOAD_PDF)}
        >
          <FiUpload />
          <span>Upload PDF</span>
        </button>
        
        {/* Botão de Search */}
        <button 
          className={getItemClass(pages.SEARCH)}
          onClick={() => onNavigate(pages.SEARCH)}
        >
          <FiSearch />
          <span>Search</span>
        </button>
      </div>

      {/* Seções de placeholder (ainda como links <a>) */}
      <div className="sidebar-section">
        <h4 className="section-title">Outras Ferramentas</h4>
        <a href="#" className="menu-item">
          <FiTag />
          <span>Label</span>
        </a>
        <a href="#" className="menu-item">
          <FiTag />
          <span>Label</span>
        </a>
        <a href="#" className="menu-item">
          <FiTag />
          <span>Label</span>
        </a>
      </div>

      <div className="sidebar-section">
        <h4 className="section-title">Configurações</h4>
        <a href="#" className="menu-item">
          <FiSettings />
          <span>Label</span>
        </a>
        <a href="#" className="menu-item">
          <FiSettings />
          <span>Label</span>
        </a>
        <a href="#" className="menu-item">
          <FiSettings />
          <span>Label</span>
        </a>
      </div>
    </nav>
  );
};

export default Sidebar;
