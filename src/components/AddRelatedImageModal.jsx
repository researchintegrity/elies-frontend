import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiSearch, FiCheck, FiLink, FiLoader, FiImage } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../services/api';
import api from '../services/api';

/**
 * AddRelatedImageModal - Modal for selecting images to create relationships
 * 
 * Allows users to search their image gallery and select one or more images
 * to link to the current image as related.
 */
const AddRelatedImageModal = ({
    isOpen,
    onClose,
    currentImageId,
    currentImageFilename,
    onRelationshipsCreated,
}) => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [creating, setCreating] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalImages, setTotalImages] = useState(0);

    const IMAGES_PER_PAGE = 20;

    // Fetch images when modal opens or search changes
    const fetchImages = useCallback(async (pageNum = 1, append = false) => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const params = {
                limit: IMAGES_PER_PAGE,
                offset: (pageNum - 1) * IMAGES_PER_PAGE,
            };
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const response = await api.get('/images', params);
            const fetchedImages = response.images || [];

            // Filter out the current image
            const filteredImages = fetchedImages.filter(img =>
                (img._id || img.id) !== currentImageId
            );

            if (append) {
                setImages(prev => [...prev, ...filteredImages]);
            } else {
                setImages(filteredImages);
            }

            setTotalImages(response.total || 0);
            setHasMore(fetchedImages.length === IMAGES_PER_PAGE);
            setPage(pageNum);
        } catch (err) {
            console.error('Error fetching images:', err);
        } finally {
            setLoading(false);
        }
    }, [isOpen, searchQuery, currentImageId]);

    // Initial fetch when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedImages([]);
            setSearchQuery('');
            setPage(1);
            fetchImages(1, false);
        }
    }, [isOpen, fetchImages]);

    // Debounced search
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            fetchImages(1, false);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchImages, isOpen]);

    // Load more images
    const loadMore = () => {
        if (!loading && hasMore) {
            fetchImages(page + 1, true);
        }
    };

    // Toggle image selection
    const toggleSelection = (imageId) => {
        setSelectedImages(prev =>
            prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]
        );
    };

    // Create relationships for selected images
    const handleCreateRelationships = async () => {
        if (selectedImages.length === 0) return;

        setCreating(true);
        try {
            const results = await Promise.all(
                selectedImages.map(imgId =>
                    api.createRelationship(currentImageId, imgId, 'manual', 1.0)
                )
            );

            onRelationshipsCreated?.(results.length);
            onClose();
        } catch (err) {
            console.error('Error creating relationships:', err);
        } finally {
            setCreating(false);
        }
    };

    // Get thumbnail URL
    const getThumbnailUrl = (imageId) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/images/${imageId}/thumbnail?token=${token}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiLink className="text-indigo-500" />
                            {t('relationship.addRelated') || 'Add Related Images'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {t('relationship.selectToLink') || 'Select images to link with'}{' '}
                            <span className="font-medium text-gray-700 dark:text-gray-300">{currentImageFilename}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <FiX className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="flex-none px-6 py-3 border-b border-gray-200 dark:border-gray-800">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('relationship.searchImages') || 'Search images by filename...'}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-gray-400"
                        />
                    </div>

                    {/* Selection info */}
                    {selectedImages.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                            <FiCheck className="w-4 h-4" />
                            <span>{selectedImages.length} {t('relationship.imagesSelected') || 'image(s) selected'}</span>
                        </div>
                    )}
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading && images.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <FiLoader className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FiImage className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm font-medium">{t('relationship.noImagesFound') || 'No images found'}</p>
                            <p className="text-xs mt-1">{t('relationship.tryDifferentSearch') || 'Try a different search term'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                {images.map(img => {
                                    const imgId = img._id || img.id;
                                    const isSelected = selectedImages.includes(imgId);

                                    return (
                                        <button
                                            key={imgId}
                                            onClick={() => toggleSelection(imgId)}
                                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 group
                                                ${isSelected
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-[0.97]'
                                                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <img
                                                src={getThumbnailUrl(imgId)}
                                                alt={img.filename}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />

                                            {/* Overlay */}
                                            <div className={`absolute inset-0 transition-opacity duration-200
                                                ${isSelected
                                                    ? 'bg-indigo-500/30'
                                                    : 'bg-black/0 group-hover:bg-black/20'
                                                }`}
                                            />

                                            {/* Checkmark */}
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <FiCheck className="w-4 h-4 text-white" />
                                                </div>
                                            )}

                                            {/* Filename on hover */}
                                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[10px] text-white truncate">{img.filename}</p>
                                            </div>

                                            {/* Flagged indicator */}
                                            {img.is_flagged && (
                                                <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Load More */}
                            {hasMore && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={loadMore}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <FiLoader className="w-5 h-5 animate-spin" />
                                        ) : (
                                            t('relationship.loadMore') || 'Load more'
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {totalImages} {t('relationship.totalImages') || 'images in gallery'}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {t('common.cancel') || 'Cancel'}
                        </button>
                        <button
                            onClick={handleCreateRelationships}
                            disabled={selectedImages.length === 0 || creating}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                    {t('relationship.linking') || 'Linking...'}
                                </>
                            ) : (
                                <>
                                    <FiLink className="w-4 h-4" />
                                    {t('relationship.linkSelected') || `Link ${selectedImages.length} Image${selectedImages.length !== 1 ? 's' : ''}`}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddRelatedImageModal;
