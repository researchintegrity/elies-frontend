// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Criar o Contexto
const AuthContext = createContext();

// 2. Criar o Provedor (o "wrapper")
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Efeito para carregar o token do localStorage ao iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // --- FUNÇÃO DE LOGIN (PRONTA PARA API) ---
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // ############ API AQUI ############
      // Substitua isso pela sua chamada fetch
      console.log("Chamando API de Login com:", email, password);
      // const response = await fetch('SUA_API/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      
      // if (!response.ok) throw new Error('Email ou senha inválidos');
      // const data = await response.json();
      
      // Simulação de sucesso
      const simulatedToken = 'fake-jwt-token-12345';
      
      // ##################################

      setToken(simulatedToken);
      localStorage.setItem('authToken', simulatedToken); // Persiste o token
      
    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO DE CADASTRO (PRONTA PARA API) ---
  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      // ############ API AQUI ############
      // const response = await fetch('SUA_API/register', { ... });
      // if (!response.ok) throw new Error('Erro ao registrar');
      // const data = await response.json();
      console.log("Chamando API de Registro com:", name, email, password);

      // Simulação: após registrar, faça o login
      // Muitas APIs retornam o token direto no registro
      const simulatedToken = 'fake-jwt-token-54321';
      // ##################################

      setToken(simulatedToken);
      localStorage.setItem('authToken', simulatedToken);

    } catch (err) {
      setError(err.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO DE LOGOUT ---
  const logout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  // 3. Montar o "value" que será provido
  const value = {
    isAuthenticated: !!token, // Converte a string do token em um booleano
    token,
    loading,
    error,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// NO FINAL DO ARQUIVO (CORRETO)

// 4. Criar o Hook customizado (para facilitar o uso)
export const useAuth = () => { // <-- Adicione a palavra 'export'
  return useContext(AuthContext);
};