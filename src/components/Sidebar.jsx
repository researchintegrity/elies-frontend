// src/components/Sidebar.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FiImage,
  FiFileText,
  FiUpload,
  FiSearch,
  FiTag,
  FiSettings,
  FiGrid,
  FiEdit,
  FiUser
} from 'react-icons/fi';

const Sidebar = ({ activePage, onNavigate, pages }) => {
  const { user } = useAuth();

  const getItemClass = (pageKey) => {
    const baseClasses = "flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 ease-out cursor-pointer w-full text-left border-none font-medium text-[0.95rem]";
    const defaultClasses = "bg-transparent text-sidebar-text-secondary hover:bg-sidebar-hover-light dark:hover:bg-sidebar-hover-dark hover:text-text-primary dark:hover:text-white";
    const activeClasses = "bg-sidebar-accent text-sidebar-accent font-semibold";

    return activePage === pageKey
      ? `${baseClasses} ${activeClasses}`
      : `${baseClasses} ${defaultClasses}`;
  };

  return (
    <nav className="bg-sidebar-bg-light dark:bg-sidebar-bg-dark px-6 py-6 flex flex-col gap-8 h-screen overflow-y-auto text-sidebar-text-secondary border-r border-sidebar-light dark:border-sidebar-dark scrollbar-custom">
      <div className="sidebar-header">
        <h3 className="text-xs text-sidebar-text-secondary font-semibold uppercase tracking-wider mb-2 opacity-70">
          Plataforma de Análise
        </h3>
        <p className="text-lg font-semibold text-text-primary dark:text-white">
          Bem-vindo, {user?.username || 'Usuário'}
        </p>
      </div>

      {/* Campo de Busca Visualmente Distinto */}
      <div className="flex items-center bg-sidebar-search-bg-light dark:bg-sidebar-search-bg-dark px-4 py-3 rounded-lg gap-3 transition-shadow duration-200 focus-within:shadow-[0_0_0_2px_var(--sidebar-accent)]">
        <FiSearch className="text-sidebar-text-secondary text-lg" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent border-none text-text-primary dark:text-white text-sm w-full outline-none placeholder:text-sidebar-text-secondary/50"
          onClick={() => onNavigate(pages.SEARCH)}
        />
      </div>

      <div className="flex flex-col gap-8">
        {/* Seção Principal */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs text-sidebar-text-secondary font-semibold uppercase tracking-wider mb-2 pl-4 opacity-60">
            Plataforma
          </h4>

          <button
            className={getItemClass(pages.UPLOAD_IMAGE)}
            onClick={() => onNavigate(pages.UPLOAD_IMAGE)}
          >
            <FiImage className="text-xl" />
            <span>Upload Imagens</span>
          </button>

          <button
            className={getItemClass(pages.VIEW_IMAGES)}
            onClick={() => onNavigate(pages.VIEW_IMAGES)}
          >
            <FiGrid className="text-xl" />
            <span>Visualizar Imagens</span>
          </button>

          <button
            className={getItemClass(pages.ANNOTATION)}
            onClick={() => onNavigate(pages.ANNOTATION)}
          >
            <FiEdit className="text-xl" />
            <span>Anotar Imagens</span>
          </button>
        </div>

        {/* Seção de Documentos */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs text-sidebar-text-secondary font-semibold uppercase tracking-wider mb-2 pl-4 opacity-60">
            Documentos
          </h4>

          <button
            className={getItemClass(pages.VIEW_PDFS)}
            onClick={() => onNavigate(pages.VIEW_PDFS)}
          >
            <FiFileText className="text-xl" />
            <span>Visualizar PDFs</span>
          </button>

          <button
            className={getItemClass(pages.UPLOAD_PDF)}
            onClick={() => onNavigate(pages.UPLOAD_PDF)}
          >
            <FiUpload className="text-xl" />
            <span>Enviar PDF</span>
          </button>
        </div>

        {/* Seção de Ferramentas (Placeholder) */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs text-sidebar-text-secondary font-semibold uppercase tracking-wider mb-2 pl-4 opacity-60">
            Ferramentas
          </h4>
          <a href="#" className="flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 ease-out cursor-pointer text-sidebar-text-secondary hover:bg-sidebar-hover-light dark:hover:bg-sidebar-hover-dark hover:text-text-primary dark:hover:text-white font-medium text-[0.95rem]">
            <FiTag className="text-xl" />
            <span>Etiquetas</span>
          </a>
          <a href="#" className="flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 ease-out cursor-pointer text-sidebar-text-secondary hover:bg-sidebar-hover-light dark:hover:bg-sidebar-hover-dark hover:text-text-primary dark:hover:text-white font-medium text-[0.95rem]">
            <FiTag className="text-xl" />
            <span>Categorias</span>
          </a>
        </div>

        {/* Seção de Configurações */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs text-sidebar-text-secondary font-semibold uppercase tracking-wider mb-2 pl-4 opacity-60">
            Configurações
          </h4>
          <a href="#" className="flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 ease-out cursor-pointer text-sidebar-text-secondary hover:bg-sidebar-hover-light dark:hover:bg-sidebar-hover-dark hover:text-text-primary dark:hover:text-white font-medium text-[0.95rem]">
            <FiSettings className="text-xl" />
            <span>Geral</span>
          </a>
          <button
            className={getItemClass(pages.PROFILE)}
            onClick={() => onNavigate(pages.PROFILE)}
          >
            <FiUser className="text-xl" />
            <span>Perfil</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
