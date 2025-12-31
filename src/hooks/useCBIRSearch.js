import { useState } from 'react';
import { api } from '../services/api';

export const useCBIRSearch = () => {
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [error, setError] = useState(null);

    // Search Parameters
    const [topK, setTopK] = useState(10);
    const [minSimilarity, setMinSimilarity] = useState(0.8);
    const [categoryFilter, setCategoryFilter] = useState('all');

    const search = async (selectedImageId) => {
        if (!selectedImageId) return;

        setSearching(true);
        setSearchResults(null);
        setError(null);

        try {
            const payload = {
                image_id: selectedImageId,
                top_k: topK,
                labels: categoryFilter !== 'all' ? [categoryFilter] : null
            };

            const response = await api.post('/cbir/search/sync', payload);

            const filteredMatches = response.matches.filter(
                match => match.image_id !== selectedImageId && match.similarity_score >= minSimilarity
            );

            setSearchResults({
                ...response,
                matches: filteredMatches,
                originalCount: response.matches_count,
                filteredCount: filteredMatches.length
            });
            return filteredMatches;
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message || 'Search failed');
            throw err;
        } finally {
            setSearching(false);
        }
    };

    const clearResults = () => {
        setSearchResults(null);
        setError(null);
    };

    return {
        searching,
        searchResults,
        error,
        topK,
        minSimilarity,
        categoryFilter,
        setTopK,
        setMinSimilarity,
        setCategoryFilter,
        search,
        clearResults
    };
};
