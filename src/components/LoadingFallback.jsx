// src/components/LoadingFallback.jsx
import React from 'react';
import { FiShield } from 'react-icons/fi';

/**
 * Premium loading component for Suspense fallback
 * Displayed while lazy-loaded pages are loading
 */
const LoadingFallback = ({ message = 'Carregando...' }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            {/* Animated logo container */}
            <div className="relative mb-8">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 blur-xl opacity-40 animate-pulse-slow" />

                {/* Logo container */}
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 flex items-center justify-center">
                    <FiShield className="w-10 h-10 text-white" />
                </div>

                {/* Animated ring */}
                <div className="absolute -inset-3 rounded-3xl border-2 border-primary-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            {/* Loading text */}
            <div className="text-center">
                <p className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{message}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Aguarde um momento...</p>
            </div>

            {/* Loading bar */}
            <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-6 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 rounded-full animate-shimmer"
                    style={{ width: '50%', backgroundSize: '200% 100%' }} />
            </div>
        </div>
    );
};

export default LoadingFallback;
