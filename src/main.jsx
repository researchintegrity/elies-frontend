// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'react-image-crop/dist/ReactCrop.css';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext'; // 1. Importe o Provedor

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Envolva o <App /> com o <AuthProvider /> */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);