// src/components/LoadingFallback.jsx
import React from 'react';
import { FiLoader } from 'react-icons/fi';

/**
 * Componente de Loading para Suspense fallback
 * Exibido enquanto páginas lazy-loaded estão carregando
 */
const LoadingFallback = ({ message = 'Carregando...' }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <FiLoader className="text-5xl text-gray-600 dark:text-gray-400 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Aguarde um momento...</p>
        </div>
    );
};

export default LoadingFallback;
