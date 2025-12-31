import React from 'react';
import { FiImage, FiX } from 'react-icons/fi';
import { getThumbnailUrl } from '../utils';

const CompactImagePreview = ({ image, label, color, onRemove, t }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    if (!image) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FiImage className="text-gray-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold uppercase ${color === 'amber' ? 'text-amber-500' : 'text-indigo-500'}`}>{label}</span>
                    <p className="text-xs text-gray-400 italic truncate">{t('copyMove.notSelected')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${color === 'amber' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20'}`}>
            <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {imageUrl ? (
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-bold uppercase ${color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{label}</span>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{image.filename}</p>
            </div>
            <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                <FiX size={14} />
            </button>
        </div>
    );
};

export default CompactImagePreview;
