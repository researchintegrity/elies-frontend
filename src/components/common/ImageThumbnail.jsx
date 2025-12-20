// src/components/common/ImageThumbnail.jsx
// Reusable image thumbnail with loading/error states and selection support
import React, { useState, useEffect, useCallback } from 'react';
import { FiImage, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import { api } from '../../services/api';

/**
 * useImageLoader - Custom hook for loading image blobs
 * @param {string} imageId - Image ID to load
 * @returns {Object} { imageUrl, loading, error, retry }
 */
export const useImageLoader = (imageId) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadImage = useCallback(async () => {
        if (!imageId) {
            setLoading(false);
            setError(true);
            return;
        }

        setLoading(true);
        setError(false);

        try {
            const blob = await api.download(`/images/${imageId}/download`);
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
            setError(false);
        } catch (err) {
            console.error(`Error loading image ${imageId}:`, err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [imageId]);

    useEffect(() => {
        loadImage();

        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageId]); // Only depend on imageId, not loadImage

    const retry = useCallback(() => {
        loadImage();
    }, [loadImage]);

    return { imageUrl, loading, error, retry };
};

/**
 * ImageThumbnail - A responsive image thumbnail with loading and selection states
 * @param {Object} props
 * @param {string} props.imageId - Image ID to load (uses API)
 * @param {string} props.imageUrl - Direct URL (alternative to imageId)
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.aspectRatio - Aspect ratio class (default: 'aspect-square')
 * @param {boolean} props.isSelected - Whether the image is selected
 * @param {boolean} props.isSelectionMode - Whether selection mode is active
 * @param {Function} props.onSelect - Selection handler
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.lazy - Whether to use lazy loading (default: true)
 * @param {boolean} props.showHoverEffect - Whether to show zoom on hover
 */
const ImageThumbnail = ({
    imageId,
    imageUrl: directUrl,
    alt = 'Image',
    aspectRatio = 'aspect-square',
    isSelected = false,
    isSelectionMode = false,
    onSelect,
    onClick,
    className = '',
    lazy = true,
    showHoverEffect = true
}) => {
    // Use hook if imageId provided, otherwise use directUrl
    const { imageUrl: loadedUrl, loading, error, retry } = useImageLoader(imageId || null);
    const imageUrl = directUrl || loadedUrl;

    const handleClick = (e) => {
        if (isSelectionMode || e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            onSelect?.();
        } else {
            onClick?.();
        }
    };

    const handleSelectClick = (e) => {
        e.stopPropagation();
        onSelect?.();
    };

    return (
        <div
            className={`group relative ${aspectRatio} bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-lg cursor-pointer ${className}`}
            onClick={handleClick}
        >
            {/* Selection checkbox - visible on hover or when selected */}
            {onSelect && (
                <div
                    className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    onClick={handleSelectClick}
                >
                    <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white/80 dark:bg-black/50 border-white/50 dark:border-gray-400 hover:border-indigo-500'
                            }`}
                    >
                        {isSelected && <FiCheck size={14} strokeWidth={3} />}
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}

            {/* Error state */}
            {error && !loading && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800"
                    onClick={(e) => { e.stopPropagation(); retry?.(); }}
                >
                    <FiAlertTriangle size={24} className="mb-2 text-amber-500" />
                    <span className="text-xs">Error</span>
                </div>
            )}

            {/* Image */}
            {imageUrl && !error && (
                <img
                    src={imageUrl}
                    alt={alt}
                    className={`w-full h-full object-cover transition-transform duration-300 ${showHoverEffect ? 'group-hover:scale-105' : ''
                        } ${loading ? 'opacity-0' : 'opacity-100'}`}
                    loading={lazy ? 'lazy' : 'eager'}
                />
            )}

            {/* Placeholder when no image */}
            {!imageUrl && !loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <FiImage size={24} />
                </div>
            )}

            {/* Hover overlay for non-selection clicks */}
            {onClick && !isSelectionMode && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            )}
        </div>
    );
};

export default ImageThumbnail;
