import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';

// Default page size for gallery pagination
const DEFAULT_PER_PAGE = 24;

export const useImages = () => {
    const { t } = useLanguage();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: DEFAULT_PER_PAGE,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
    });

    const fetchImages = useCallback(async (params = {}) => {
        const {
            page = 1,
            per_page = DEFAULT_PER_PAGE,
            imageType = [],
            dateFrom = null,
            dateTo = null,
            search = '',
            sourceType = null,
            ...otherParams
        } = params;

        // Build query params - only include non-empty values
        const queryParams = { page, per_page, ...otherParams };
        if (imageType && imageType.length > 0) queryParams.image_type = imageType.join(',');
        if (dateFrom) queryParams.date_from = dateFrom;
        if (dateTo) queryParams.date_to = dateTo;
        if (search) queryParams.search = search;
        if (sourceType && sourceType !== 'all') queryParams.source_type = sourceType;

        setLoading(true);
        setError(null);
        try {
            const data = await api.get('/images', queryParams);

            // Handle both array response (legacy) and paginated response object
            let imageList = [];
            let paginationData = {
                page: page,
                perPage: per_page,
                total: 0,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
            };

            if (Array.isArray(data)) {
                // Legacy array response
                imageList = data;
                paginationData.total = data.length;
                paginationData.totalPages = 1;
            } else if (data && typeof data === 'object') {
                // New paginated response: { items: [], total, page, per_page, total_pages, has_next, has_prev }
                imageList = data.items || data.images || [];
                paginationData = {
                    page: data.page || page,
                    perPage: data.per_page || per_page,
                    total: data.total || imageList.length,
                    totalPages: data.total_pages || Math.ceil((data.total || imageList.length) / per_page),
                    hasNext: data.has_next ?? false,
                    hasPrev: data.has_prev ?? (page > 1)
                };
            }

            const transformed = imageList.map(img => ({
                id: img._id,
                imageId: img._id,
                filename: img.filename,
                uploadedDate: img.uploaded_date,
                fileSize: img.file_size,
                sourceType: img.source_type,
                imageType: img.image_type || [],
                isFlagged: img.is_flagged || false,
                analysisStatus: img.analysis_status || {},
                analysisResults: img.analysis_results || {}
            }));

            setImages(transformed);
            setPagination(paginationData);
        } catch (err) {
            console.error('Error fetching images:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadImage = useCallback(async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            await api.post('/images/upload', formData, true);
            return { success: true };
        } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            return { success: false, error: err.message };
        }
    }, []);

    const deleteImage = useCallback(async (image, options = {}) => {
        if (image.sourceType === 'extracted') {
            showAlert(
                t('images.actionBlocked'),
                t('images.extractedCannotDelete'),
                'warning'
            );
            return false;
        }

        const { skipConfirm = false } = options;

        if (!skipConfirm) {
            const confirmed = await showConfirm(
                t('images.confirmDeleteTitle'),
                t('images.confirmDeleteMessage').replace('{filename}', image.filename)
            );
            if (!confirmed) return false;
        }

        try {
            await api.delete(`/images/${image.id}`);
            // Optimistic update
            setImages(prev => prev.filter(img => img.id !== image.id));

            // Only show toast if individual action (otherwise batch handler manages toast)
            if (!skipConfirm) {
                showToast(t('images.deleteSuccess'), 'success');
            }
            return true;
        } catch (err) {
            // Only show alert if individual action
            if (!skipConfirm) {
                showAlert(t('common.error'), `${t('images.deleteError')}: ${err.message}`, 'error');
            }
            return false;
        }
    }, [t]);

    const addImageTypes = useCallback(async (image, types) => {
        try {
            const updatedImage = await api.addImageTypes(image.id, types);
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, imageType: updatedImage.image_type } : img
            ));
            showToast(t('images.tagsAddedSuccess'), 'success');
            return true;
        } catch (err) {
            showAlert(t('common.error'), `${t('images.tagsAddError')}: ${err.message}`, 'error');
            return false;
        }
    }, [t]);

    const removeImageType = useCallback(async (image, typeName) => {
        try {
            const updatedImage = await api.removeImageType(image.id, typeName);
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, imageType: updatedImage.image_type } : img
            ));
            showToast(t('images.tagRemovedSuccess'), 'success');
            return true;
        } catch (err) {
            showAlert(t('common.error'), `${t('images.tagRemoveError')}: ${err.message}`, 'error');
            return false;
        }
    }, [t]);

    /**
     * Toggle the flagged status of an image (optimistic update)
     * @param {Object} image - Image object with id and is_flagged properties
     * @returns {Promise<boolean>} Success status
     */
    const toggleFlag = useCallback(async (image) => {
        // Optimistic update
        const newFlagStatus = !image.isFlagged;
        setImages(prev => prev.map(img =>
            img.id === image.id ? { ...img, isFlagged: newFlagStatus } : img
        ));

        try {
            const updatedImage = await api.toggleImageFlag(image.id);
            // Update with server response to ensure consistency
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, isFlagged: updatedImage.is_flagged } : img
            ));
            return true;
        } catch (err) {
            // Revert optimistic update on error
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, isFlagged: image.isFlagged } : img
            ));
            showToast(t('images.flagError') || 'Failed to update flag status', 'error');
            return false;
        }
    }, [t]);

    return {
        images,
        loading,
        error,
        pagination,
        fetchImages,
        uploadImage,
        deleteImage,
        addImageTypes,
        removeImageType,
        toggleFlag,
    };
};

export default useImages;
