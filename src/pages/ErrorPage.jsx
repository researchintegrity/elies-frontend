// src/pages/ErrorPage.jsx
import React, { useState } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiChevronDown, FiChevronUp, FiCopy, FiCheck } from 'react-icons/fi';

/**
 * Error page component displayed when an uncaught error occurs
 * Provides options to retry, go home, or view error details
 */
const ErrorPage = ({ error, errorInfo, onReset, onReload }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [copied, setCopied] = useState(false);

    const errorMessage = error?.message || 'An unexpected error occurred';
    const errorStack = error?.stack || '';
    const componentStack = errorInfo?.componentStack || '';

    const handleCopyError = async () => {
        const errorText = `Error: ${errorMessage}\n\nStack Trace:\n${errorStack}\n\nComponent Stack:\n${componentStack}`;
        
        try {
            await navigator.clipboard.writeText(errorText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy error details:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-deep flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                {/* Error Card */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-8 text-center">
                    {/* Error Icon */}
                    <div className="relative mx-auto mb-6 w-20 h-20">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
                        
                        {/* Icon container */}
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30 flex items-center justify-center">
                            <FiAlertTriangle className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    {/* Error Title */}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Oops! Something went wrong
                    </h1>

                    {/* Error Description */}
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        We encountered an unexpected error. Don't worry, your data is safe.
                    </p>

                    {/* Error Message Preview */}
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-mono text-red-700 dark:text-red-400 break-words">
                            {errorMessage}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <button
                            onClick={onReset}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                        
                        <button
                            onClick={onReload}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                        >
                            <FiHome className="w-4 h-4" />
                            Reload Page
                        </button>
                    </div>

                    {/* Show Details Toggle */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        {showDetails ? (
                            <>
                                <FiChevronUp className="w-4 h-4" />
                                Hide technical details
                            </>
                        ) : (
                            <>
                                <FiChevronDown className="w-4 h-4" />
                                Show technical details
                            </>
                        )}
                    </button>

                    {/* Technical Details */}
                    {showDetails && (
                        <div className="mt-4 text-left animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Stack Trace
                                </span>
                                <button
                                    onClick={handleCopyError}
                                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <FiCheck className="w-3 h-3 text-green-500" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <FiCopy className="w-3 h-3" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-auto scrollbar-custom">
                                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-words">
                                    {errorStack || 'No stack trace available'}
                                </pre>
                            </div>

                            {componentStack && (
                                <>
                                    <span className="block mt-4 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Component Stack
                                    </span>
                                    <div className="bg-gray-900 rounded-lg p-4 max-h-32 overflow-auto scrollbar-custom">
                                        <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-words">
                                            {componentStack}
                                        </pre>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Help Text */}
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
                    If this problem persists, please contact support with the error details.
                </p>
            </div>
        </div>
    );
};

export default ErrorPage;
