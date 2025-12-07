// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiAlertTriangle } from 'react-icons/fi';

// Error Alert Component with Tailwind
const ErrorAlert = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex items-center px-4 py-3 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-200 text-[0.95rem] font-medium text-left">
      <FiAlertTriangle className="text-xl mr-3 flex-shrink-0 text-red-500" />
      <span>{message}</span>
    </div>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const { login, register, loading, error } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      login(email, password);
    } else {
      register(username, name, email, password);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat bg-deep-dark dark:bg-dark-deep"
      style={{ backgroundImage: "url('/seu-wallpaper.jpg')" }}>

      <div className="w-full max-w-[480px] px-12 py-12 text-center rounded-[18px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] backdrop-blur-[10px] bg-[rgba(60,60,70,0.7)] dark:bg-[rgba(30,30,46,0.8)]">

        <h2 className="text-[2.2rem] font-bold mb-3 text-text-primary dark:text-white">
          {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
        </h2>
        <p className="text-text-secondary text-lg mb-12">
          Acesse a plataforma ELIS
        </p>

        <form onSubmit={handleSubmit}>

          <ErrorAlert message={error} />

          {!isLogin && (
            <>
              <div className="mb-7 text-left">
                <label htmlFor="username" className="block mb-2.5 font-semibold text-text-primary dark:text-white text-base">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Seu nome de usuário único"
                  className="w-full px-5 py-4 rounded-[10px] border border-primary-accent bg-deep-dark dark:bg-dark-deep text-text-primary dark:text-white text-lg transition-all duration-300 
                    placeholder:text-text-secondary placeholder:opacity-70
                    focus:outline-none focus:border-toggle-accent focus:shadow-[0_0_0_3px_rgba(138,99,210,0.3)]"
                />
              </div>

              <div className="mb-7 text-left">
                <label htmlFor="name" className="block mb-2.5 font-semibold text-text-primary dark:text-white text-base">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  className="w-full px-5 py-4 rounded-[10px] border border-primary-accent bg-deep-dark dark:bg-dark-deep text-text-primary dark:text-white text-lg transition-all duration-300 
                    placeholder:text-text-secondary placeholder:opacity-70
                    focus:outline-none focus:border-toggle-accent focus:shadow-[0_0_0_3px_rgba(138,99,210,0.3)]"
                />
              </div>
            </>
          )}

          <div className="mb-7 text-left">
            <label htmlFor="email" className="block mb-2.5 font-semibold text-text-primary dark:text-white text-base">
              {isLogin ? 'Username ou Email' : 'Email'}
            </label>
            <input
              type={isLogin ? 'text' : 'email'}
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={isLogin ? "username" : "email"}
              placeholder="seu.email@exemplo.com"
              className="w-full px-5 py-4 rounded-[10px] border border-primary-accent bg-deep-dark dark:bg-dark-deep text-text-primary dark:text-white text-lg transition-all duration-300 
                placeholder:text-text-secondary placeholder:opacity-70
                focus:outline-none focus:border-toggle-accent focus:shadow-[0_0_0_3px_rgba(138,99,210,0.3)]"
            />
          </div>

          <div className="mb-7 text-left">
            <label htmlFor="password" className="block mb-2.5 font-semibold text-text-primary dark:text-white text-base">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-[10px] border border-primary-accent bg-deep-dark dark:bg-dark-deep text-text-primary dark:text-white text-lg transition-all duration-300 
                placeholder:text-text-secondary placeholder:opacity-70
                focus:outline-none focus:border-toggle-accent focus:shadow-[0_0_0_3px_rgba(138,99,210,0.3)]"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-[1.1rem] mt-6 border-none rounded-[10px] bg-toggle-accent text-white text-xl font-bold cursor-pointer transition-all duration-300
              hover:bg-[#7a52c3] hover:-translate-y-0.5
              disabled:bg-primary-accent disabled:cursor-not-allowed disabled:translate-y-0"
            disabled={loading}
          >
            {loading ? 'Carregando...' : (isLogin ? 'Entrar na Plataforma' : 'Criar Conta')}
          </button>
        </form>

        <p className="mt-8 text-text-secondary text-base">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="bg-transparent border-none text-toggle-accent font-semibold cursor-pointer ml-2.5 text-base underline underline-offset-4 transition-colors duration-300
              hover:text-text-primary dark:hover:text-white"
          >
            {isLogin ? 'Cadastre-se aqui' : 'Faça login aqui'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
