// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css'; // Importa o novo CSS

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true); // Controla se é Login ou Cadastro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Apenas para cadastro

  // Pegando as funções e estados do nosso Contexto
  const { login, register, loading, error } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      login(email, password);
    } else {
      register(name, email, password);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Título mais clean */}
        <h2 style={{ color: 'var(--color-text-light)' }}>
          {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
        </h2>
        <p>Acesse a plataforma ELIS</p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label htmlFor="name">Nome Completo</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name" // Adiciona autocomplete para navegadores
                placeholder="Seu nome" // Placeholder para indicar o que digitar
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email" // Adiciona autocomplete
              placeholder="seu.email@exemplo.com" // Placeholder
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
              autoComplete={isLogin ? "current-password" : "new-password"} // Autocomplete inteligente
              placeholder="••••••••" // Placeholder
            />
          </div>

          {error && <p className="error-message">{error}</p>}

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