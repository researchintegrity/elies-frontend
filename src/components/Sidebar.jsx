// src/components/Sidebar.jsx
import React from 'react';
import './Sidebar.css';
import { useAuth } from '../context/AuthContext';
import {
  FiImage,
  FiFileText,
  FiUpload,
  FiSearch,
  FiTag,
  FiSettings,
  FiGrid,
  FiEdit
} from 'react-icons/fi';

const Sidebar = ({ activePage, onNavigate, pages }) => {
  const { user } = useAuth();

  const getItemClass = (pageKey) => {
    return `menu-item ${activePage === pageKey ? 'active' : ''}`;
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h3>Plataforma de Análise</h3>
        <p>Bem-vindo, {user?.username || 'Usuário'}</p>
      </div>

      {/* Campo de Busca Visualmente Distinto */}
      <div className="sidebar-search">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Buscar..."
          className="search-input"
          onClick={() => onNavigate(pages.SEARCH)} // Mantendo navegação ao clicar por enquanto
        />
      </div>

      <div className="sidebar-content">
        {/* Seção Principal */}
        <div className="sidebar-section">
          <h4 className="section-title">Plataforma</h4>

          <button
            className={getItemClass(pages.UPLOAD_IMAGE)}
            onClick={() => onNavigate(pages.UPLOAD_IMAGE)}
          >
            <FiImage />
            <span>Upload Imagens</span>
          </button>

          <button
            className={getItemClass(pages.VIEW_IMAGES)}
            onClick={() => onNavigate(pages.VIEW_IMAGES)}
          >
            <FiGrid />
            <span>Visualizar Imagens</span>
          </button>

          <button
            className={getItemClass(pages.ANNOTATION)}
            onClick={() => onNavigate(pages.ANNOTATION)}
          >
            <FiEdit />
            <span>Anotar Imagens</span>
          </button>
        </div>

        {/* Seção de Documentos */}
        <div className="sidebar-section">
          <h4 className="section-title">Documentos</h4>

          <button
            className={getItemClass(pages.VIEW_PDFS)}
            onClick={() => onNavigate(pages.VIEW_PDFS)}
          >
            <FiFileText />
            <span>Visualizar PDFs</span>
          </button>

          <button
            className={getItemClass(pages.UPLOAD_PDF)}
            onClick={() => onNavigate(pages.UPLOAD_PDF)}
          >
            <FiUpload />
            <span>Enviar PDF</span>
          </button>
        </div>

        {/* Seção de Ferramentas (Placeholder) */}
        <div className="sidebar-section">
          <h4 className="section-title">Ferramentas</h4>
          <a href="#" className="menu-item">
            <FiTag />
            <span>Etiquetas</span>
          </a>
          <a href="#" className="menu-item">
            <FiTag />
            <span>Categorias</span>
          </a>
        </div>

        {/* Seção de Configurações */}
        <div className="sidebar-section">
          <h4 className="section-title">Configurações</h4>
          <a href="#" className="menu-item">
            <FiSettings />
            <span>Geral</span>
          </a>
          <a href="#" className="menu-item">
            <FiSettings />
            <span>Perfil</span>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
