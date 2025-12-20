// src/components/Sidebar.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  FiLayers,
  FiChevronsLeft,
  FiMenu,
  FiCpu,
  FiShare2,
} from 'react-icons/fi';

const Sidebar = ({ activePage, onNavigate, pages, isCollapsed = false, onToggle }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const getItemClass = (pageKey) => {
    const isActive = activePage === pageKey;
    return `relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'px-2' : 'px-4'} py-3 rounded-xl transition-all duration-300 cursor-pointer w-full text-left border-none font-medium text-sm group
      ${isActive
        ? 'bg-gradient-to-r from-primary-500/15 to-primary-500/5 text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`;
  };

  const getIconClass = (pageKey) => {
    const isActive = activePage === pageKey;
    return `w-5 h-5 transition-all duration-300 ${isCollapsed ? '' : ''} ${isActive
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
      {!isCollapsed && (
        <h4 className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider px-4 mb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );

  const NavItem = ({ pageKey, icon: Icon, label, onClick }) => (
    <button
      className={getItemClass(pageKey)}
      onClick={onClick || (() => onNavigate(pageKey))}
      title={isCollapsed ? label : undefined}
    >
      <ActiveIndicator pageKey={pageKey} />
      <Icon className={getIconClass(pageKey)} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const DisabledItem = ({ icon: Icon, label }) => (
    <button
      className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl w-full text-sm font-medium text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60`}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="w-5 h-5" />
      {!isCollapsed && (
        <>
          <span>{label}</span>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">{t('sidebar.comingSoon')}</span>
        </>
      )}
    </button>
  );

  return (
    <nav className={`relative bg-white dark:bg-dark-deep h-screen flex flex-col border-r border-gray-200/80 dark:border-gray-800/50 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}`}>
      {/* Subtle gradient accent at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className={`relative flex flex-col ${isCollapsed ? 'px-2' : 'px-6'} pt-6 pb-4 transition-all duration-300`}>

        {/* Top Row: Logo & Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4' : 'justify-between'} mb-6`}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={isCollapsed ? onToggle : undefined}
              title={isCollapsed ? 'Click to expand' : undefined}
            >
              <FiShield className="w-5 h-5 text-white" />
            </div>

            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">ELIS</h1>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('sidebar.platform')}</p>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          {isCollapsed ? (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
              title={t('sidebar.expand') || 'Expand sidebar'}
            >
              <FiMenu className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t('sidebar.collapse') || 'Collapse sidebar'}
            >
              <FiChevronsLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User welcome - hidden when collapsed */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-card/50 border border-gray-100 dark:border-gray-800/50">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.username || t('common.user')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('sidebar.researcher')}</p>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {isCollapsed && (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm" title={user?.username || t('common.user')}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>

      {/* Search - hidden when collapsed, replaced with icon */}
      <div className={`${isCollapsed ? 'px-2' : 'px-6'} mb-4`}>
        {isCollapsed ? (
          <button
            onClick={() => onNavigate(pages.SEARCH)}
            className="flex items-center justify-center w-full p-2.5 rounded-xl bg-gray-50 dark:bg-dark-card/50 border border-gray-200/50 dark:border-gray-700/30 
                     text-gray-400 dark:text-gray-500 hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-gray-100/50 dark:hover:bg-dark-card 
                     transition-all duration-200"
            title={t('sidebar.search')}
          >
            <FiSearch className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onNavigate(pages.SEARCH)}
            className="flex items-center w-full bg-gray-50 dark:bg-dark-card/50 px-4 py-2.5 rounded-xl gap-3 border border-gray-200/50 dark:border-gray-700/30 
                       text-gray-400 dark:text-gray-500 hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-gray-100/50 dark:hover:bg-dark-card 
                       transition-all duration-200 group"
          >
            <FiSearch className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
            <span className="text-sm">{t('sidebar.search')}</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-200/50 dark:bg-gray-700/50 text-gray-400 font-mono">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-4'} pb-4 space-y-6 scrollbar-custom`}>

        <NavSection title={t('sidebar.images')}>
          <NavItem pageKey={pages.UPLOAD_IMAGE} icon={FiUpload} label={t('sidebar.uploadImages')} />
          <NavItem pageKey={pages.VIEW_IMAGES} icon={FiGrid} label={t('sidebar.gallery')} />
          <NavItem pageKey={pages.ANNOTATION} icon={FiEdit} label={t('sidebar.annotate')} />
        </NavSection>

        <NavSection title={t('sidebar.documents')}>
          <NavItem pageKey={pages.VIEW_PDFS} icon={FiFileText} label={t('sidebar.viewPdfs')} />
          <NavItem pageKey={pages.UPLOAD_PDF} icon={FiUpload} label={t('sidebar.uploadPdf')} />
        </NavSection>

        <NavSection title={t('sidebar.tools')}>
          <NavItem pageKey={pages.CBIR_SEARCH} icon={FiSearch} label={t('sidebar.findSimilar')} />
          <NavItem pageKey={pages.IMAGE_ANALYSIS} icon={FiCpu} label={t('sidebar.imageAnalysis') || 'Image Analysis'} />
          <NavItem pageKey={pages.PROVENANCE} icon={FiShare2} label={t('sidebar.provenance') || 'Provenance'} />
          <DisabledItem icon={FiTag} label={t('sidebar.tags')} />
          <DisabledItem icon={FiLayers} label={t('sidebar.categories')} />
        </NavSection>

        <NavSection title={t('sidebar.settings')}>
          <DisabledItem icon={FiSettings} label={t('sidebar.general')} />
          <NavItem pageKey={pages.PROFILE} icon={FiUser} label={t('sidebar.profile')} />
        </NavSection>
      </div>

      {/* Footer */}
      <div className={`${isCollapsed ? 'px-2' : 'px-6'} py-4 border-t border-gray-100 dark:border-gray-800/50`}>
        {!isCollapsed && (
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>v1.0.0</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t('sidebar.online')}
            </span>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title={t('sidebar.online')} />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;

