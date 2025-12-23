// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import { FiAlertTriangle, FiMail, FiLock, FiUser, FiArrowRight, FiShield, FiGlobe, FiSun, FiMoon } from 'react-icons/fi';

// Animated floating orb component
const FloatingOrb = ({ className, delay = 0 }) => (
  <div
    className={`absolute rounded-full blur-3xl opacity-30 animate-pulse-slow ${className}`}
    style={{ animationDelay: `${delay}s` }}
  />
);

// Error Alert Component with modern styling
const ErrorAlert = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex items-center px-4 py-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium animate-fade-in-down">
      <FiAlertTriangle className="text-lg mr-3 flex-shrink-0 text-red-500" />
      <span>{message}</span>
    </div>
  );
};

// Modern input component with icon
const InputField = ({ icon: Icon, label, id, ...props }) => (
  <div className="group">
    <label
      htmlFor={id}
      className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-focus-within:text-primary-500"
    >
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
      </div>
      <input
        id={id}
        className="w-full pl-11 pr-4 py-3.5 rounded-xl
                   bg-gray-50 dark:bg-dark-card/50
                   border border-gray-200 dark:border-gray-700/50
                   text-text-primary dark:text-white text-base
                   placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
                   transition-all duration-300 outline-none"
        {...props}
      />
    </div>
  </div>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const { login, register, loading, error } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      login(email, password);
    } else {
      register(username, name, email, password);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-dark-deep dark:via-[#12121f] dark:to-dark-deep">

      {/* Settings Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="group flex items-center justify-center w-11 h-11 rounded-xl 
                     bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl
                     border border-gray-200/50 dark:border-gray-700/50
                     text-gray-600 dark:text-gray-300
                     hover:bg-white dark:hover:bg-dark-card hover:border-gray-300 dark:hover:border-gray-600
                     shadow-lg shadow-black/5 hover:shadow-xl
                     transition-all duration-300"
          title={theme === 'dark' ? (language === 'pt' ? 'Mudar para modo claro' : 'Switch to light mode') : (language === 'pt' ? 'Mudar para modo escuro' : 'Switch to dark mode')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <FiSun className="w-5 h-5 text-amber-400" />
          ) : (
            <FiMoon className="w-5 h-5 text-primary-500" />
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl 
                     bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl
                     border border-gray-200/50 dark:border-gray-700/50
                     text-gray-600 dark:text-gray-300
                     hover:bg-white dark:hover:bg-dark-card hover:border-gray-300 dark:hover:border-gray-600
                     shadow-lg shadow-black/5 hover:shadow-xl
                     transition-all duration-300"
          title={language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
        >
          <FiGlobe className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            {language === 'pt' ? 'PT' : 'EN'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
            {language === 'pt' ? 'English' : 'Português'}
          </span>
        </button>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb
          className="w-[600px] h-[600px] bg-primary-500/30 dark:bg-primary-500/20 -top-48 -left-48"
          delay={0}
        />
        <FloatingOrb
          className="w-[500px] h-[500px] bg-accent-500/20 dark:bg-accent-500/15 top-1/2 -right-32"
          delay={2}
        />
        <FloatingOrb
          className="w-[400px] h-[400px] bg-primary-400/20 dark:bg-primary-400/10 bottom-0 left-1/3"
          delay={4}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Logo/Brand Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 shadow-lg shadow-primary-500/30 mb-6">
              <FiShield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isLogin ? t('auth.welcome') : t('auth.createAccount')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('auth.platformAccess')}
            </p>
          </div>

          {/* Auth Card */}
          <div className="relative">
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 rounded-3xl blur-xl opacity-20 dark:opacity-30 animate-pulse-slow" />

            {/* Card content */}
            <div className="relative bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-8">

              <form onSubmit={handleSubmit} className="space-y-5">
                <ErrorAlert message={error} />

                {!isLogin && (
                  <>
                    <InputField
                      icon={FiUser}
                      label={t('auth.username')}
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder={t('auth.usernamePlaceholder')}
                    />

                    <InputField
                      icon={FiUser}
                      label={t('auth.fullName')}
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      placeholder={t('auth.fullNamePlaceholder')}
                    />
                  </>
                )}

                <InputField
                  icon={FiMail}
                  label={isLogin ? t('auth.usernameOrEmail') : t('auth.email')}
                  id="email"
                  type={isLogin ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete={isLogin ? 'username' : 'email'}
                  placeholder={t('auth.emailPlaceholder')}
                />

                <InputField
                  icon={FiLock}
                  label={t('auth.password')}
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={t('auth.passwordPlaceholder')}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-3 px-6 py-4 mt-8
                           bg-gradient-to-r from-primary-500 to-primary-600 
                           hover:from-primary-600 hover:to-primary-700
                           text-white text-lg font-semibold rounded-xl
                           shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30
                           transition-all duration-300 hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                           focus:ring-4 focus:ring-primary-500/20"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isLogin ? t('auth.login') : t('auth.register')}</span>
                      <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
              </div>

              {/* Toggle Login/Register */}
              <p className="text-center text-gray-600 dark:text-gray-400">
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-semibold transition-colors"
                >
                  {isLogin ? t('auth.signupHere') : t('auth.loginHere')}
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
            {t('auth.copyright')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
