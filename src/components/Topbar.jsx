// src/components/Topbar.jsx
import React from 'react';
import { FiLogOut, FiSun, FiMoon, FiBell, FiGlobe } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../context/LanguageContext';

const Topbar = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="flex items-center justify-between px-1 py-4 mb-6">
      {/* Left: Title & Breadcrumb */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t('topbar.title')}
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {t('topbar.subtitle')}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2.5 rounded-xl bg-gray-100/80 dark:bg-dark-card/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
          <FiBell className="w-5 h-5" />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white dark:ring-dark-deep" />
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="group relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100/80 dark:bg-dark-card/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          aria-label="Toggle language"
          title={language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
        >
          <FiGlobe className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wide min-w-[24px]">
            {language === 'pt' ? 'PT' : 'EN'}
          </span>
          {/* Hover tooltip */}
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] bg-gray-900 dark:bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {language === 'pt' ? 'English' : 'Português'}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-gray-100/80 dark:bg-dark-card/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <FiSun className="w-5 h-5 text-amber-400" />
          ) : (
            <FiMoon className="w-5 h-5" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2" />

        {/* User dropdown */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.username || t('common.user')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('sidebar.researcher')}
            </p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-semibold shadow-sm hover:shadow-md hover:shadow-primary-500/20 transition-all duration-200">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all duration-200 border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
          aria-label={t('common.logout')}
          title={t('common.logout')}
        >
          <FiLogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
