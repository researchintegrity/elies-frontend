
// src/components/Topbar.jsx
import React from 'react';
import './Topbar.css';
import { FiEdit, FiUser, FiLogOut, FiSun, FiMoon } from 'react-icons/fi'; // 1. Adicione FiLogOut
import './Toggle.css';
import { useAuth } from '../context/AuthContext'; // 2. Importe o useAuth
import { useTheme } from '../hooks/useTheme';

const Topbar = () => {
  const { logout } = useAuth(); // 3. Pegue a função de logout
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h2>ELIS - Scientific Integrity Toolkit</h2>
      </div>

      <div className="topbar-actions">
        <button className="icon-button">
          <FiEdit />
        </button>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
          <span className="slider round">
            <span className="icon-sun"><FiSun /></span>
            <span className="icon-moon"><FiMoon /></span>
          </span>
        </label>

        <button className="icon-button">
          <FiUser />
        </button>

        {/* 4. Adicione o botão de Logout */}
        <button className="icon-button" onClick={logout}>
          <FiLogOut />
        </button>
      </div>
    </header>
  );
};

export default Topbar;