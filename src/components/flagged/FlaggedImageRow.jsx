import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiFlag } from 'react-icons/fi';
import { API_BASE_URL } from '../../config/api';

const FlaggedImageRow = ({ image, isActive, isSelected, onClick, onSelect, isSelectionMode }) => {
    const [loading, setLoading] = useState(true);

    const getThumbnailUrl = (imageId) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
    };

    const handleSelectClick = (e) => {
        e.stopPropagation();
        if (onSelect) onSelect(image.id, e);
    };

    return (
        <div
            onClick={(e) => {
                // If shift key is held or in selection mode, toggle selection instead of opening detail
                if (e.shiftKey || isSelectionMode) {
                    if (onSelect) onSelect(image.id, e);
                } else {
                    onClick(image);
                }
            }}
            className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150
        ${isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 ring-1 ring-indigo-300 dark:ring-indigo-700'
                    : isActive
                        ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                }`}
        >
            {/* Selection Checkbox */}
            <div
                className={`flex-shrink-0 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={handleSelectClick}
            >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
                    }`}>
                    {isSelected && <FiCheck size={12} strokeWidth={3} />}
                </div>
            </div>

            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {loading && (
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                )}
                <img
                    src={getThumbnailUrl(image.imageId)}
                    alt={image.filename}
                    className={`w-full h-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setLoading(false)}
                    onError={() => setLoading(false)}
                    loading="lazy"
                />
                {/* Flag indicator */}
                <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <FiFlag size={8} className="text-white fill-current" />
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : isActive ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                    {image.filename}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {image.uploadedDate && !isNaN(new Date(image.uploadedDate).getTime()) ? new Date(image.uploadedDate).toLocaleDateString() : ''}
                </p>
            </div>
        </div>
    );
};

FlaggedImageRow.propTypes = {
    image: PropTypes.object.isRequired,
    isActive: PropTypes.bool,
    isSelected: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    onSelect: PropTypes.func,
    isSelectionMode: PropTypes.bool
};

export default FlaggedImageRow;
