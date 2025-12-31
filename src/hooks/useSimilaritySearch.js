import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { showToast, showAlert } from '../utils/alert';

export const useSimilaritySearch = (t) => {
    const [isActive, setIsActive] = useState(false);
    const [queryImage, setQueryImage] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [topK, setTopK] = useState(20);
    const [threshold, setThreshold] = useState(0.5);
    const [page, setPage] = useState(1);
    const PER_PAGE = 12;

    const search = useCallback(async (image) => {
        if (!image) return;

        setIsActive(true);
        setQueryImage(image);
        setLoading(true);
        setResults([]);

        try {
            const payload = {
                image_id: image.imageId || image.id,
                top_k: topK + 1,
                labels: null
            };

            const response = await api.post('/cbir/search/sync', payload);

            const filteredMatches = response.matches
                .filter(match => match.image_id !== (image.imageId || image.id) && match.similarity_score >= threshold)
                .slice(0, topK);

            setResults(filteredMatches);
            setPage(1);

            if (filteredMatches.length === 0) {
                showToast(t('similarity.noResults') || 'No similar images found', 'info');
            } else {
                showToast(`${t('similarity.found') || 'Found'} ${filteredMatches.length} ${t('similarity.similarImages') || 'similar images'}`, 'success');
            }
        } catch (err) {
            console.error('Similarity search error:', err);
            showAlert(t('similarity.searchError') || 'Search Error', err.message || t('similarity.searchErrorMessage') || 'Failed to search for similar images', 'error');
            setIsActive(false);
            setQueryImage(null);
        } finally {
            setLoading(false);
        }
    }, [topK, threshold, t]);

    const exit = useCallback(() => {
        setIsActive(false);
        setQueryImage(null);
        setResults([]);
    }, []);

    // Pagination logic
    const totalPages = Math.ceil(results.length / PER_PAGE);
    const paginatedResults = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return {
        isActive,
        queryImage,
        results,
        paginatedResults,
        loading,
        topK,
        setTopK,
        threshold,
        setThreshold,
        page,
        setPage,
        totalPages,
        search,
        exit,
        PER_PAGE
    };
};
