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
  FiUser,
  FiShield,
  FiLayers
} from 'react-icons/fi';

const Sidebar = ({ activePage, onNavigate, pages }) => {
  const { user } = useAuth();

  const getItemClass = (pageKey) => {
    const isActive = activePage === pageKey;
    return `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer w-full text-left border-none font-medium text-sm group
      ${isActive
        ? 'bg-gradient-to-r from-primary-500/15 to-primary-500/5 text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`;
  };

  const getIconClass = (pageKey) => {
    const isActive = activePage === pageKey;
    return `w-5 h-5 transition-all duration-300 ${isActive
      ? 'text-primary-500'
      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`;
  };

  const ActiveIndicator = ({ pageKey }) => {
    if (activePage !== pageKey) return null;
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full shadow-sm shadow-primary-500/50" />
    );
  };

  const NavSection = ({ title, children }) => (
    <div className="space-y-1">
      <h4 className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider px-4 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );

  const NavItem = ({ pageKey, icon: Icon, label, onClick }) => (
    <button
      className={getItemClass(pageKey)}
      onClick={onClick || (() => onNavigate(pageKey))}
    >
      <ActiveIndicator pageKey={pageKey} />
      <Icon className={getIconClass(pageKey)} />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <nav className="relative bg-white dark:bg-dark-deep h-screen flex flex-col border-r border-gray-200/80 dark:border-gray-800/50 overflow-hidden">
      {/* Subtle gradient accent at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative px-6 pt-6 pb-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20">
            <FiShield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">ELIS</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Scientific Integrity</p>
          </div>
        </div>

        {/* User welcome */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-card/50 border border-gray-100 dark:border-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user?.username || 'Usuário'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Pesquisador</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <button
          onClick={() => onNavigate(pages.SEARCH)}
          className="flex items-center w-full bg-gray-50 dark:bg-dark-card/50 px-4 py-2.5 rounded-xl gap-3 border border-gray-200/50 dark:border-gray-700/30 
                     text-gray-400 dark:text-gray-500 hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-gray-100/50 dark:hover:bg-dark-card 
                     transition-all duration-200 group"
        >
          <FiSearch className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
          <span className="text-sm">Buscar...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-200/50 dark:bg-gray-700/50 text-gray-400 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-custom">

        <NavSection title="Imagens">
          <NavItem pageKey={pages.UPLOAD_IMAGE} icon={FiUpload} label="Upload Imagens" />
          <NavItem pageKey={pages.VIEW_IMAGES} icon={FiGrid} label="Galeria" />
          <NavItem pageKey={pages.ANNOTATION} icon={FiEdit} label="Anotar Imagens" />
        </NavSection>

        <NavSection title="Documentos">
          <NavItem pageKey={pages.VIEW_PDFS} icon={FiFileText} label="Visualizar PDFs" />
          <NavItem pageKey={pages.UPLOAD_PDF} icon={FiUpload} label="Enviar PDF" />
        </NavSection>

        <NavSection title="Ferramentas">
          <NavItem pageKey={pages.CBIR_SEARCH} icon={FiSearch} label="Buscar Similares" />
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-medium text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60">
            <FiTag className="w-5 h-5" />
            <span>Etiquetas</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">Em breve</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-medium text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60">
            <FiLayers className="w-5 h-5" />
            <span>Categorias</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">Em breve</span>
          </button>
        </NavSection>

        <NavSection title="Configurações">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-medium text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60">
            <FiSettings className="w-5 h-5" />
            <span>Geral</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">Em breve</span>
          </button>
          <NavItem pageKey={pages.PROFILE} icon={FiUser} label="Perfil" />
        </NavSection>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>v1.0.0</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
