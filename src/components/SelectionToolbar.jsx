import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiTrash2, FiTag, FiBarChart2, FiTarget, FiInfo, FiGrid, FiChevronDown, FiActivity, FiCopy, FiGitBranch, FiImage } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

const SelectionToolbar = ({ selectedCount, onClearSelection, onDelete, onTag, onAnalyze, onFindSimilar, onViewMetadata, onExtractPanels, isExtracting }) => {
    const { t } = useLanguage();
    const [showAnalyzeMenu, setShowAnalyzeMenu] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowAnalyzeMenu(false);
            }
        };

        if (showAnalyzeMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAnalyzeMenu]);

    if (selectedCount === 0) return null;

    // Analysis menu options
    // maxImages: hide option when more images are selected
    // exactImages: require exactly this many images
    // isBatch: marks this as a batch analysis option
    const analysisOptions = [
        // Single image options
        { key: 'imageAnalysis', icon: FiImage, label: t('analyze.imageAnalysis'), minImages: 1, maxImages: 1 },
        { key: 'manipulationDetection', icon: FiActivity, label: t('analyze.manipulationDetection'), minImages: 1, maxImages: 1 },
        { key: 'copyMoveSingle', icon: FiCopy, label: t('analyze.copyMoveSingle'), minImages: 1, maxImages: 1 },
        { key: 'copyMoveCross', icon: FiCopy, label: t('analyze.copyMoveCross'), minImages: 2, exactImages: 2 },
        { key: 'provenance', icon: FiGitBranch, label: t('analyze.provenance'), minImages: 1, maxImages: 1 },
        // Batch analysis options (2+ images)
        { key: 'batchManipulation', icon: FiActivity, label: t('analyze.batchManipulation'), minImages: 2, isBatch: true },
        { key: 'batchCopyMove', icon: FiCopy, label: t('analyze.batchCopyMove'), minImages: 2, isBatch: true },
    ];

    const handleAnalysisSelect = (analysisKey) => {
        setShowAnalyzeMenu(false);
        if (onAnalyze) {
            onAnalyze(analysisKey);
        }
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 border-r border-gray-200 dark:border-gray-700 pr-6">
                <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {selectedCount} {selectedCount > 1 ? t('selection.selectedPlural') : t('selection.selected')}
                </span>
                <button
                    onClick={onClearSelection}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('selection.clearSelection')}
                >
                    <FiX />
                </button>
            </div>

            <div className="flex items-center gap-2">
                {/* View Metadata - Only shown when exactly 1 image is selected */}
                {selectedCount === 1 && onViewMetadata && (
                    <button
                        onClick={onViewMetadata}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium transition-colors"
                        title={t('selection.viewMetadataTitle')}
                    >
                        <FiInfo className="text-lg" />
                        <span>{t('selection.viewMetadata')}</span>
                    </button>
                )}

                {/* Find Similar - Only shown when exactly 1 image is selected */}
                {selectedCount === 1 && onFindSimilar && (
                    <button
                        onClick={onFindSimilar}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium transition-colors"
                        title={t('selection.findSimilarTitle')}
                    >
                        <FiTarget className="text-lg" />
                        <span>{t('selection.findSimilar')}</span>
                    </button>
                )}

                {/* Extract Panels - Works with 1+ images */}
                {onExtractPanels && (
                    <button
                        onClick={onExtractPanels}
                        disabled={isExtracting}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('selection.extractPanelsTitle')}
                    >
                        <FiGrid className={`text-lg ${isExtracting ? 'animate-pulse' : ''}`} />
                        <span>{isExtracting ? t('selection.extracting') : t('selection.extractPanels')}</span>
                    </button>
                )}

                <button
                    onClick={onTag}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
                >
                    <FiTag className="text-lg" />
                    <span>{t('selection.classify')}</span>
                </button>

                {/* Analyze Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowAnalyzeMenu(!showAnalyzeMenu)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors ${showAnalyzeMenu
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            }`}
                    >
                        <FiBarChart2 className="text-lg" />
                        <span>{t('selection.analyze')}</span>
                        <FiChevronDown className={`text-sm transition-transform ${showAnalyzeMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showAnalyzeMenu && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                {t('analyze.selectAnalysis')}
                            </div>
                            {analysisOptions.map((option) => {
                                // Check if option is available based on selection count
                                const isDisabled = (option.exactImages && selectedCount !== option.exactImages) ||
                                    (option.minImages && selectedCount < option.minImages);
                                const Icon = option.icon;

                                // Hide options based on selection count
                                // - Hide single-image-only tools (maxImages: 1) when 2+ images selected
                                // - Hide cross copy-move if not exactly 2 images
                                if (option.maxImages && selectedCount > option.maxImages) {
                                    return null;
                                }
                                if (option.key === 'copyMoveCross' && selectedCount !== 2) {
                                    return null;
                                }

                                return (
                                    <button
                                        key={option.key}
                                        onClick={() => !isDisabled && handleAnalysisSelect(option.key)}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isDisabled
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300'
                                            }`}
                                    >
                                        <Icon className="text-lg flex-shrink-0" />
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                <button
                    onClick={onDelete}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium transition-colors"
                >
                    <FiTrash2 className="text-lg" />
                    <span>{t('selection.delete')}</span>
                </button>
            </div>
        </div>
    );
};

export default SelectionToolbar;
