import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const IMAGES_PER_PAGE = 24;

export const useFlaggedImages = (initialPage = 1) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasPrev: false, hasNext: false });

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedTag, setSelectedTag] = useState('');

    const fetchFlaggedImages = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                per_page: IMAGES_PER_PAGE,
                flagged: true,
                include_annotated: true,
            };
            if (searchQuery) params.search = searchQuery;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            if (selectedTag) params.image_type = selectedTag;

            const response = await api.get('/images', params);

            // Transform response
            const imageList = Array.isArray(response) ? response : (response.items || response.images || []);
            const transformedImages = imageList.map(img => ({
                id: img._id || img.id,
                imageId: img._id || img.id,
                filename: img.filename,
                imageType: img.image_type || [],
                uploadedDate: img.uploaded_at || img.uploadedDate,
                sourceType: img.source_type || 'uploaded',
                isFlagged: img.is_flagged || false,
                analysisStatus: img.analysis_status,
                analysisResults: img.analysis_results,
                fileSize: img.file_size,
            }));

            setImages(transformedImages);

            // Set pagination
            const totalImages = response.total ?? transformedImages.length;
            const totalPages = response.total_pages ?? Math.ceil(totalImages / IMAGES_PER_PAGE);

            setPagination({
                total: totalImages,
                totalPages: totalPages,
                hasPrev: response.has_prev ?? (currentPage > 1),
                hasNext: response.has_next ?? (currentPage < totalPages),
            });
        } catch (err) {
            console.error('Error fetching flagged images:', err);
            setError(err.message || 'Failed to fetch flagged images');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, dateFrom, dateTo, selectedTag]);

    // Initial fetch and fetch on dependencies change
    useEffect(() => {
        fetchFlaggedImages();
    }, [fetchFlaggedImages]);

    // Reset to page 1 on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, dateFrom, dateTo, selectedTag]);

    const setPage = (page) => {
        const maxPage = Math.max(1, pagination.totalPages);
        const boundedPage = Math.min(Math.max(1, page), maxPage);
        if (boundedPage !== currentPage) {
            setCurrentPage(boundedPage);
        }
    };

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setSelectedTag('');
        setSearchQuery('');
    };

    return {
        images,
        setImages,
        loading,
        error,
        pagination,
        currentPage,
        setPage,
        refetch: fetchFlaggedImages,
        filters: {
            searchQuery, setSearchQuery,
            dateFrom, setDateFrom,
            dateTo, setDateTo,
            selectedTag, setSelectedTag,
            clear: clearFilters,
            hasActive: !!(dateFrom || dateTo || selectedTag)
        }
    };
};
