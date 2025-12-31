import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { showToast } from '../../../utils/alert';

export const useSimilaritySearch = (sourceImage, filterMode, setFilterMode, t) => {
    const [similarityResults, setSimilarityResults] = useState([]);
    const [loadingSimilarity, setLoadingSimilarity] = useState(false);
    const [similarityPage, setSimilarityPage] = useState(1);

    // Reset similarity results when source is deselected
    useEffect(() => {
        if (!sourceImage) {
            setSimilarityResults([]);
            setSimilarityPage(1);
            if (filterMode === 'similar') setFilterMode('all');
        }
    }, [sourceImage, filterMode, setFilterMode]);

    const handleSimilaritySearch = async () => {
        if (!sourceImage) {
            showToast(t('copyMove.selectSourceForSimilar'), 'warning');
            return;
        }
        setLoadingSimilarity(true);
        try {
            const response = await api.post('/cbir/search/sync', {
                image_id: sourceImage.id,
                top_k: 24,
                labels: null
            });
            const filtered = response.matches.filter(m => m.image_id !== sourceImage.id && m.similarity_score >= 0.3);
            setSimilarityResults(filtered);
            setFilterMode('similar');
            if (filtered.length === 0) {
                showToast(t('copyMove.noSimilarFound'), 'info');
            } else {
                showToast(`${t('similarity.found')} ${filtered.length} ${t('similarity.similarImages')}`, 'success');
            }
        } catch (err) {
            console.error('Similarity search error:', err);
            showToast(t('similarity.searchError'), 'error');
        } finally {
            setLoadingSimilarity(false);
        }
    };

    const clearSimilarity = useCallback(() => {
        setSimilarityResults([]);
        setSimilarityPage(1);
    }, []);

    return {
        similarityResults,
        loadingSimilarity,
        similarityPage,
        setSimilarityPage,
        handleSimilaritySearch,
        clearSimilarity
    };
};
