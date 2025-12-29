import React from 'react';
import { FiX, FiTrash2, FiLink, FiAlertTriangle } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../services/api';

/**
 * RemoveRelationshipModal - Confirmation modal for removing a relationship
 * 
 * Displays both images involved in the relationship to ensure the user
 * is deleting the correct link.
 */
const RemoveRelationshipModal = ({
    isOpen,
    onClose,
    onConfirm,
    sourceImage, // { id, filename }
    targetNode,  // { id, label/filename }
    isRemoving = false
}) => {
    const { t } = useLanguage();

    const getThumbnailUrl = (imageId) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/images/${imageId}/thumbnail?token=${token}`;
    };

    if (!isOpen || !sourceImage || !targetNode) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col mx-4 overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-900/10">
                    <div>
                        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                            <FiTrash2 />
                            {t('relationship.removeRelationship') || 'Remove Relationship'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        {/* Source Image */}
                        <div className="flex flex-col items-center gap-2 w-32">
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                <img
                                    src={getThumbnailUrl(sourceImage.id || sourceImage.imageId)}
                                    alt={sourceImage.filename}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-2">
                                    <span className="text-[10px] text-white font-medium truncate max-w-full">
                                        {t('relationship.current') || 'Current Image'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 truncate w-full px-1">
                                {sourceImage.filename}
                            </p>
                        </div>

                        {/* Link Icon */}
                        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                            <div className="w-8 h-[2px] bg-red-300 dark:bg-red-800 mb-1"></div>
                            <FiLink className="w-5 h-5 text-red-500 dark:text-red-400" />
                            <div className="w-8 h-[2px] bg-red-300 dark:bg-red-800 mt-1"></div>
                        </div>

                        {/* Target Image */}
                        <div className="flex flex-col items-center gap-2 w-32">
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm ring-2 ring-red-500/20">
                                <img
                                    src={getThumbnailUrl(targetNode.id)}
                                    alt={targetNode.label}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-2">
                                    <span className="text-[10px] text-white font-medium truncate max-w-full">
                                        {t('relationship.related') || 'Related Image'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 truncate w-full px-1">
                                {targetNode.label || targetNode.filename}
                            </p>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 flex items-start gap-3">
                        <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                                {t('relationship.confirmUnlinkTitle') || 'Confirm Unlink'}
                            </h4>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
                                {t('relationship.confirmUnlinkMessage') || 'Are you sure you want to remove the relationship between these images? This action cannot be undone.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        disabled={isRemoving}
                    >
                        {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isRemoving}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-500/30"
                    >
                        {isRemoving ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                {t('relationship.removing') || 'Removing...'}
                            </>
                        ) : (
                            <>
                                <FiTrash2 className="w-4 h-4" />
                                {t('relationship.confirmRemove') || 'Remove Relationship'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemoveRelationshipModal;
