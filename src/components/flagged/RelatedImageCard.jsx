import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiFlag } from 'react-icons/fi';
import { API_BASE_URL } from '../../config/api';

const RelatedImageCard = ({ image, isSelected, onClick, onSelect, onToggleFlag, isSelectionMode, t }) => {
    const [loading, setLoading] = useState(true);
    const [isFlagged, setIsFlagged] = useState(image.isFlagged || false);

    const getThumbnailUrl = (imageId) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
    };

    const handleFlagClick = async (e) => {
        e.stopPropagation(); // Prevent card click
        try {
            await onToggleFlag(image);
            setIsFlagged(!isFlagged);
        } catch {
            // ignore
        }
    };

    const handleSelectClick = (e) => {
        e.stopPropagation();
        // Pass image data as third param so handleSelect can store it
        if (onSelect) onSelect(image.imageId || image.id, e, image);
    };

    return (
        <div
            className={`group relative rounded-lg overflow-hidden border transition-all ${isSelected
                ? 'border-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-700'
                : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                }`}
        >
            <div
                onClick={(e) => {
                    if (e.shiftKey || isSelectionMode) {
                        // Pass image data as third param
                        if (onSelect) onSelect(image.imageId || image.id, e, image);
                    } else {
                        onClick(image);
                    }
                }}
                className="aspect-square bg-gray-100 dark:bg-gray-800 relative cursor-pointer"
            >
                {/* Selection Checkbox */}
                <div
                    className={`absolute top-1.5 left-1.5 z-10 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={handleSelectClick}
                >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white/90 dark:bg-gray-800/90 border-white dark:border-gray-400 hover:border-indigo-500'
                        }`}>
                        {isSelected && <FiCheck size={10} strokeWidth={3} />}
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                )}
                <img
                    src={getThumbnailUrl(image.imageId || image.id)}
                    alt={image.filename}
                    className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setLoading(false)}
                    loading="lazy"
                />
            </div>
            <div className="p-2 flex items-center justify-between gap-1">
                <p className={`text-xs font-medium truncate flex-1 ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>{image.filename}</p>
                <button
                    onClick={handleFlagClick}
                    className={`flex-shrink-0 p-1 rounded transition-colors ${isFlagged
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/30'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                        }`}
                    title={isFlagged ? (t('flagged.unflag') || 'Unflag') : (t('flagged.flag') || 'Flag')}
                >
                    <FiFlag size={12} className={isFlagged ? 'fill-current' : ''} />
                </button>
            </div>
        </div>
    );
};

RelatedImageCard.propTypes = {
    image: PropTypes.object.isRequired,
    isSelected: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    onSelect: PropTypes.func,
    onToggleFlag: PropTypes.func.isRequired,
    isSelectionMode: PropTypes.bool,
    t: PropTypes.func.isRequired
};

export default RelatedImageCard;
