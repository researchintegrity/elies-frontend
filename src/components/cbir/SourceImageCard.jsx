import React from 'react';
import { FiAlertTriangle, FiCheck } from 'react-icons/fi';
import PropTypes from 'prop-types';

const SourceImageCard = ({ image, isSelected, onClick, imageUrl, loading, error }) => (
    <div
        onClick={onClick}
        className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected
            ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg scale-[1.02]'
            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
    >
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {loading ? (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : error ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiAlertTriangle size={24} />
                </div>
            ) : (
                <img
                    src={imageUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
            )}
        </div>

        {isSelected && (
            <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
                <FiCheck size={14} strokeWidth={3} />
            </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">{image.filename}</p>
            {image.imageType?.length > 0 && (
                <div className="flex gap-1 mt-1 overflow-hidden">
                    {image.imageType.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/20 text-white rounded">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    </div>
);

SourceImageCard.propTypes = {
    image: PropTypes.shape({
        filename: PropTypes.string,
        imageType: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    isSelected: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    imageUrl: PropTypes.string,
    loading: PropTypes.bool,
    error: PropTypes.bool,
};

export default SourceImageCard;
