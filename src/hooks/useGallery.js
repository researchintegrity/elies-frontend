import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';

const IMAGES_PER_PAGE = 24;

// Helper to get thumbnail URL with auth token
export const getThumbnailUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

export const useGallery = () => {
    // Gallery State
    const [images, setImages] = useState([]);
    const [imageUrls, setImageUrls] = useState({});
    const [loadingImages, setLoadingImages] = useState(true);

    // Pagination
    const [galleryPage, setGalleryPage] = useState(1);
    const [totalImages, setTotalImages] = useState(0);

    // Filter State
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterImageType, setFilterImageType] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);

    // Fetch images when page or filters change
    const fetchImages = useCallback(async (page = 1) => {
        setLoadingImages(true);
        try {
            // Build query params with filters
            const queryParams = { page, per_page: IMAGES_PER_PAGE };
            if (filterSearch) queryParams.search = filterSearch;
            if (filterDateFrom) queryParams.date_from = filterDateFrom;
            if (filterDateTo) queryParams.date_to = filterDateTo;
            if (filterImageType) queryParams.image_type = filterImageType;

            const data = await api.get('/images', queryParams);

            let imageList = [];
            let total = 0;

            if (Array.isArray(data)) {
                imageList = data;
                total = data.length >= IMAGES_PER_PAGE ? page * IMAGES_PER_PAGE + 1 : (page - 1) * IMAGES_PER_PAGE + data.length;
            } else if (data && typeof data === 'object') {
                imageList = data.items || data.images || [];
                total = data.total || data.total_count || imageList.length;
            }

            const transformed = imageList.slice(0, IMAGES_PER_PAGE).map(img => ({
                id: img._id,
                filename: img.filename,
                fileSize: img.file_size,
                sourceType: img.source_type,
                mimeType: img.mime_type || 'image/jpeg',
                // Include EXIF metadata from API (try both naming conventions)
                exifMetadata: img.exifMetadata || img.exif_metadata || null
            }));

            setImages(transformed);
            setTotalImages(total);
        } catch (err) {
            console.error('Error fetching images:', err);
        } finally {
            setLoadingImages(false);
        }
    }, [filterSearch, filterDateFrom, filterDateTo, filterImageType]);

    // Initial fetch and on page/filter change
    useEffect(() => {
        fetchImages(galleryPage);
    }, [galleryPage, fetchImages]);

    // Fetch categories
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

    // Load image URLs - use thumbnail URLs directly for gallery display
    useEffect(() => {
        const newUrls = {};
        let hasNew = false;

        for (const img of images) {
            if (!imageUrls[img.id]) {
                newUrls[img.id] = getThumbnailUrl(img.id);
                hasNew = true;
            }
        }

        if (hasNew) {
            setImageUrls(prev => ({ ...prev, ...newUrls }));
        }
    }, [images, imageUrls]);

    const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

    return useMemo(() => ({
        images,
        imageUrls,
        setImageUrls, // Exposed in case we need to update Manually
        loadingImages,
        totalImages,
        galleryPage,
        setGalleryPage,
        totalPages,
        filters: {
            search: filterSearch,
            dateFrom: filterDateFrom,
            dateTo: filterDateTo,
            imageType: filterImageType
        },
        setFilters: {
            setSearch: setFilterSearch,
            setDateFrom: setFilterDateFrom,
            setDateTo: setFilterDateTo,
            setImageType: setFilterImageType
        },
        availableCategories,
        refresh: () => fetchImages(galleryPage)
    }), [
        images,
        imageUrls,
        loadingImages,
        totalImages,
        galleryPage,
        totalPages,
        filterSearch,
        filterDateFrom,
        filterDateTo,
        filterImageType,
        availableCategories,
        fetchImages
    ]);
};
