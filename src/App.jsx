// src/App.jsx
import React from 'react';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import AppLayout from './AppLayout';
import './App.css';

function App() {
  // Pega o estado de autenticação do nosso Contexto
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Este é o "Roteador" principal.
        Se está autenticado, mostra o layout da plataforma.
        Se não, mostra a página de login/cadastro.
      */}
      {isAuthenticated ? <AppLayout /> : <AuthPage />}
    </>
  );
}

export default App;