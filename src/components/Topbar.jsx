// src/components/Topbar.jsx
import React from 'react';
import { FiEdit, FiUser, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

const Topbar = () => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-bg-dark dark:bg-dark-bg border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between transition-colors duration-300">
      <div>
        <h2 className="text-xl font-semibold text-text-primary dark:text-white">
          ELIS - Scientific Integrity Toolkit
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark text-text-primary dark:text-white hover:bg-hover-light dark:hover:bg-hover-dark transition-all duration-200">
          <FiEdit className="w-5 h-5" />
        </button>

        {/* Toggle de Tema */}
        <label className="relative inline-block w-[54px] h-7 cursor-pointer">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
            className="opacity-0 w-0 h-0 peer"
          />
          <span className="absolute inset-0 bg-gray-300 dark:bg-toggle-accent transition-all duration-400 rounded-[34px] flex items-center justify-between px-[5px] overflow-hidden peer-checked:bg-toggle-accent">
            <span className="flex items-center justify-center text-amber-500 text-sm z-10">
              <FiSun />
            </span>
            <span className="flex items-center justify-center text-slate-100 text-sm z-10">
              <FiMoon />
            </span>
            <span className="absolute h-5 w-5 left-1 bottom-1 bg-white rounded-full transition-transform duration-400 shadow-md peer-checked:translate-x-[26px] z-20"></span>
          </span>
        </label>

        <button className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark text-text-primary dark:text-white hover:bg-hover-light dark:hover:bg-hover-dark transition-all duration-200">
          <FiUser className="w-5 h-5" />
        </button>

        <button
          className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark text-text-primary dark:text-white hover:bg-hover-light dark:hover:bg-hover-dark transition-all duration-200"
          onClick={logout}
        >
          <FiLogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
