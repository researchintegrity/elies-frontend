import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiImage,
    FiLayers,
    FiSearch,
    FiCalendar,
    FiArrowRight
} from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../config/api';

// Helper to format date
const formatDate = (dateString, locale) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const AnnotationLeftPanel = ({
    isOpen,
    onToggle,
    width,
    onResize,
    analysisHistory = [],
    selectedAnalysis,
    onSelectAnalysis,
    isLoadingHistory
}) => {
    const { t, locale } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef(null);

    // Resize handlers
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const newWidth = e.clientX;
            // Min 200px, Max 500px or 40% of screen
            onResize(Math.max(200, Math.min(newWidth, Math.min(500, window.innerWidth * 0.4))));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onResize]);

    // Filter history
    const filteredHistory = analysisHistory.filter(analysis => {
        if (!searchTerm) return true;
        const type = analysis.type.toLowerCase();
        const status = analysis.status.toLowerCase();
        const term = searchTerm.toLowerCase();
        return type.includes(term) || status.includes(term);
    });

    if (!isOpen) {
        return (
            <div className="w-10 flex flex-col items-center py-4 bg-gray-800 border-r border-gray-700">
                <button
                    onClick={onToggle}
                    className="p-2 rounded hover:bg-gray-700 text-gray-400"
                    title={t('common.expand') || 'Expand'}
                >
                    <FiChevronRight size={16} />
                </button>
                <div className="mt-4 flex flex-col gap-4">
                    <button
                        className="p-2 rounded hover:bg-gray-700 text-gray-400"
                        title={t('flagged.analysisHistory') || 'Analysis History'}
                    >
                        <FiClock size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            className="flex flex-col bg-gray-800 border-r border-gray-700 relative flex-shrink-0"
            style={{ width: `${width}px` }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FiClock className="text-indigo-400" />
                    {t('flagged.analysisHistory') || 'Analysis History'}
                </h3>
                <button
                    onClick={onToggle}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400"
                    title={t('common.collapse') || 'Collapse'}
                >
                    <FiChevronLeft size={16} />
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-700">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                        type="text"
                        placeholder={t('common.search') || 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">{t('common.noResults') || 'No analyses found'}</p>
                    </div>
                ) : (
                    filteredHistory.map((analysis) => {
                        const isSelected = selectedAnalysis?._id === analysis._id;
                        const date = formatDate(analysis.created_at, locale);

                        return (
                            <button
                                key={analysis._id}
                                onClick={() => onSelectAnalysis(analysis)}
                                className={`w-full text-left p-3 rounded-lg border transition-all group ${isSelected
                                        ? 'bg-indigo-900/30 border-indigo-500 mb-2'
                                        : 'bg-gray-700/30 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'
                                        }`}>
                                        {analysis.type.replace(/_/g, ' ')}
                                    </span>
                                    {analysis.status === 'completed' ? (
                                        <div className="w-2 h-2 rounded-full bg-green-500" title="Completed" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-amber-500" title={analysis.status} />
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                    <FiCalendar size={10} />
                                    <span>{date}</span>
                                </div>

                                {isSelected && analysis.results?.result_image && (
                                    <div className="relative mt-2 aspect-video bg-black/40 rounded overflow-hidden">
                                        <img
                                            src={`${API_BASE_URL}/analyses/${analysis._id}/results/result/download?token=${localStorage.getItem('authToken')}`}
                                            alt="Result preview"
                                            className="w-full h-full object-contain"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors">
                                            <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium px-2 py-1 bg-black/60 rounded backdrop-blur-sm">
                                                Click to overlay
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            {/* Resize Handle */}
            <div
                className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-indigo-500 transition-colors opacity-0 hover:opacity-100 z-10"
                onMouseDown={handleResizeStart}
            />
        </div>
    );
};

export default AnnotationLeftPanel;
