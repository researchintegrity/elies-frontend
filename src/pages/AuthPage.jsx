// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';
// 1. import an icon for the error box
import { FiAlertTriangle } from 'react-icons/fi';

// 2. new component for a nice ux/ui error message
const ErrorAlert = ({ message }) => {
  if (!message) return null;
  return (
    <div className="error-alert">
      <FiAlertTriangle className="error-icon" />
      <span>{message}</span>
    </div>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // this field will be for "username or email"
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // 1. new state for username

  const { login, register, loading, error } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      // 3. 'email' is the state holding the "username or email" value
      login(email, password); 
    } else {
      // 4. pass all the fields to the register function
      register(username, name, email, password);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <h2 style={{ color: 'var(--color-text-light)' }}>
          {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
        </h2>
        <p>Acesse a plataforma ELIS</p>

        <form onSubmit={handleSubmit}>
          
          {/* 3. use the new erroralert component */}
          <ErrorAlert message={error} />

          {!isLogin && (
            <>
              {/* 5. new field for username (api needs this) */}
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Seu nome de usuário único"
                />
              </div>

              <div className="input-group">
                <label htmlFor="name">Nome Completo</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                />
              </div>
            </>
          )}

          <div className="input-group">
            {/* 6. changed the label and type for the login screen */}
            <label htmlFor="email">{isLogin ? 'Username ou Email' : 'Email'}</label>
            <input
              type={isLogin ? 'text' : 'email'}
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={isLogin ? "username" : "email"}
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
            />
          </div>

          {/* 4. removed the old <p> tag for error */}
          {/* {error && <p className="error-message">{error}</p>} */}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Carregando...' : (isLogin ? 'Entrar na Plataforma' : 'Criar Conta')}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Cadastre-se aqui' : 'Faça login aqui'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;