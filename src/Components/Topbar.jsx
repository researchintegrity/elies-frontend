// src/components/Topbar.jsx
import React from 'react';
import './Topbar.css';
import { FiEdit, FiUser, FiLogOut } from 'react-icons/fi'; // 1. Adicione FiLogOut
import './Toggle.css';
import { useAuth } from '../context/AuthContext'; // 2. Importe o useAuth

const Topbar = () => {
  const { logout } = useAuth(); // 3. Pegue a função de logout

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
          <input type="checkbox" defaultChecked />
          <span className="slider round"></span>
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