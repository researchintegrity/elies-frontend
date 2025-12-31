import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiImage } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';

const QueryImageThumbnail = ({ image, isSelected, onSelect, isSelectionMode }) => {
    const token = localStorage.getItem('authToken');
    const imageUrl = useMemo(() => {
        if (!image) return null;
        return `${API_BASE_URL}/images/${image.imageId || image.id}/thumbnail${token ? `?token=${token}` : ''}`;
    }, [image, token]);

    if (!image) return null;

    const handleClick = (e) => {
        if (onSelect) onSelect(image.id, e);
    };

    return (
        <div
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(e);
                }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            className={`group relative flex items-center gap-3 p-2 pr-4 rounded-xl shadow-md cursor-pointer transition-all duration-200 ${isSelected
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-white dark:bg-gray-800 border-2 border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400'
                }`}
        >
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                {/* Selection Checkbox - inside the thumbnail */}
                <div
                    className={`absolute top-1 left-1 z-10 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => { e.stopPropagation(); handleClick(e); }}
                >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white/90 dark:bg-gray-800/90 border-white dark:border-gray-400 hover:border-indigo-500'
                        }`}>
                        {isSelected && <FiCheck size={12} strokeWidth={3} />}
                    </div>
                </div>

                {imageUrl ? (
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiImage size={20} />
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Query</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]" title={image.filename}>
                    {image.filename}
                </p>
            </div>
        </div>
    );
};

QueryImageThumbnail.propTypes = {
    image: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        imageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        filename: PropTypes.string
    }),
    isSelected: PropTypes.bool,
    onSelect: PropTypes.func,
    isSelectionMode: PropTypes.bool
};

export default QueryImageThumbnail;
