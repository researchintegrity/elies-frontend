import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';


const IMAGES_PER_PAGE = 24;

export const useGallery = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalImages, setTotalImages] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        sourceType: 'all',
        imageType: [],
        search: ''
    });
    const [availableCategories, setAvailableCategories] = useState([]);

    // const { token } = useAuth(); // If we need token for API calls, api service usually handles it via interceptors, but good to have if needed.

    // Fetch available tags
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const tags = await api.get('/images/tags');
                setAvailableCategories(tags);
            } catch (err) {
                console.error('Error fetching tags:', err);
            }
        };
        fetchTags();
    }, []);

    const fetchImages = useCallback(async (pageNum = page, currentFilters = filters) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = { page: pageNum, per_page: IMAGES_PER_PAGE };
            if (currentFilters.imageType && currentFilters.imageType.length > 0) {
                queryParams.image_type = currentFilters.imageType.join(',');
            }
            if (currentFilters.sourceType && currentFilters.sourceType !== 'all') {
                queryParams.source_type = currentFilters.sourceType;
            }
            if (currentFilters.search) {
                queryParams.search = currentFilters.search;
            }

            const data = await api.get('/images', queryParams);

            let imageList = [];
            let total = 0;

            if (Array.isArray(data)) {
                imageList = data;
                total = data.length >= IMAGES_PER_PAGE ? pageNum * IMAGES_PER_PAGE + 1 : (pageNum - 1) * IMAGES_PER_PAGE + data.length;
            } else if (data && typeof data === 'object') {
                imageList = data.items || data.images || [];
                total = data.total || data.total_count || imageList.length;
            }

            const limitedImageList = imageList.slice(0, IMAGES_PER_PAGE);

            const transformed = limitedImageList.map(img => ({
                id: img._id,
                imageId: img._id,
                filename: img.filename,
                uploadedDate: img.uploaded_date,
                fileSize: img.file_size,
                sourceType: img.source_type,
                imageType: img.image_type || []
            }));

            if (imageList.length > IMAGES_PER_PAGE && total < imageList.length) {
                total = Math.max(total, pageNum * IMAGES_PER_PAGE + (imageList.length - IMAGES_PER_PAGE));
            }

            setImages(transformed);
            setTotalImages(total);
        } catch (err) {
            console.error('Error fetching images:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page, filters]); // Removed specific dependencies to allow calling with explicit args

    // Trigger fetch when page or filters change
    useEffect(() => {
        fetchImages(page, filters);
    }, [page, filters, fetchImages]);

    const handlePageChange = useCallback((newPage) => {
        const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);
        const maxPage = Math.max(1, totalPages);
        const boundedPage = Math.min(Math.max(1, newPage), maxPage);
        setPage(boundedPage);
    }, [totalImages]);

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1); // Reset to page 1 on filter change
    }, []);

    return {
        images,
        loading,
        error,
        totalImages,
        page,
        totalPages: Math.ceil(totalImages / IMAGES_PER_PAGE),
        filters,
        availableCategories,
        setPage: handlePageChange,
        setFilters: handleFilterChange,
        refresh: () => fetchImages(page, filters)
    };
};
