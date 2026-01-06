// src/hooks/useDocuments.js
/**
 * Custom hook for managing document operations with pagination support.
 * 
 * Features:
 * - Paginated document fetching (compatible with backend PaginatedDocumentResponse)
 * - Document upload, delete, and download
 * - Automatic state management
 * 
 * @module useDocuments
 */
import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';

// =============================================================================
// Constants
// =============================================================================
const DEFAULT_PAGE_SIZE = 12; // Documents per page (matches backend default)

// =============================================================================
// Hook Definition
// =============================================================================
export const useDocuments = () => {
    const { t } = useLanguage();

    // --- State ---
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Pagination State ---
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalDocuments: 0,
        pageSize: DEFAULT_PAGE_SIZE,
        hasNext: false,
        hasPrev: false
    });

    // Use ref to avoid stale closure issues in useCallback
    const paginationRef = useRef(pagination);
    paginationRef.current = pagination;

    // ==========================================================================
    // Fetch Documents (with Pagination)
    // ==========================================================================
    /**
     * Fetches documents with pagination support.
     * Backend returns PaginatedDocumentResponse with:
     *   - items: DocumentResponse[]
     *   - total: int
     *   - page: int
     *   - per_page: int
     *   - total_pages: int
     *   - has_next: bool
     *   - has_prev: bool
     * 
     * @param {Object} options - Fetch options
     * @param {number} options.page - Page number (1-indexed)
     * @param {number} options.pageSize - Items per page
     * @returns {Promise<void>}
     */
    const fetchDocuments = useCallback(async (options = {}) => {
        // Use ref to get current values without dependency issues
        const currentPagination = paginationRef.current;

        const {
            page = currentPagination.currentPage,
            pageSize = currentPagination.pageSize
        } = options;

        setLoading(true);
        setError(null);

        try {
            // Fetch with pagination params (matching backend query params)
            const response = await api.get('/documents', {
                page: page,
                per_page: pageSize
            });

            // DEBUG: Log the response to understand its structure
            console.log('useDocuments API Response:', response);

            // Backend returns PaginatedDocumentResponse structure
            if (response && response.items) {
                // Transform items to match component expectations
                const transformedDocs = response.items.map(doc => ({
                    id: doc._id,
                    filename: doc.filename,
                    uploadedDate: doc.uploaded_date,
                    fileSize: doc.file_size,
                    extractionStatus: doc.extraction_status || 'pending',
                    extractedImageCount: doc.extracted_image_count || 0
                }));

                setDocuments(transformedDocs);

                // Update pagination state from backend response
                setPagination({
                    currentPage: response.page,
                    totalPages: response.total_pages,
                    totalDocuments: response.total,
                    pageSize: response.per_page,
                    hasNext: response.has_next,
                    hasPrev: response.has_prev
                });
            } else if (Array.isArray(response)) {
                // Fallback for legacy array response (backwards compatibility)
                const transformedDocs = response.map(doc => ({
                    id: doc._id,
                    filename: doc.filename,
                    uploadedDate: doc.uploaded_date,
                    fileSize: doc.file_size,
                    extractionStatus: doc.extraction_status || 'pending',
                    extractedImageCount: doc.extracted_image_count || 0
                }));

                setDocuments(transformedDocs);

                // Estimate pagination for legacy response
                const hasMore = transformedDocs.length === pageSize;
                setPagination(prev => ({
                    ...prev,
                    currentPage: page,
                    pageSize: pageSize,
                    totalDocuments: hasMore
                        ? Math.max(prev.totalDocuments, page * pageSize + 1)
                        : (page - 1) * pageSize + transformedDocs.length,
                    totalPages: hasMore
                        ? Math.max(prev.totalPages, page + 1)
                        : page,
                    hasNext: hasMore,
                    hasPrev: page > 1
                }));
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (err) {
            console.error('Error fetching documents:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []); // No dependencies - uses ref for current pagination values

    // ==========================================================================
    // Pagination Controls
    // ==========================================================================

    /**
     * Navigate to a specific page.
     * @param {number} page - Target page number
     */
    const goToPage = useCallback((page) => {
        const currentPagination = paginationRef.current;
        if (page >= 1 && page <= currentPagination.totalPages) {
            fetchDocuments({ page });
        }
    }, [fetchDocuments]);

    /**
     * Navigate to the next page.
     */
    const nextPage = useCallback(() => {
        const currentPagination = paginationRef.current;
        if (currentPagination.hasNext) {
            fetchDocuments({ page: currentPagination.currentPage + 1 });
        }
    }, [fetchDocuments]);

    /**
     * Navigate to the previous page.
     */
    const prevPage = useCallback(() => {
        const currentPagination = paginationRef.current;
        if (currentPagination.hasPrev) {
            fetchDocuments({ page: currentPagination.currentPage - 1 });
        }
    }, [fetchDocuments]);

    /**
     * Change the number of items per page.
     * @param {number} newSize - New page size
     */
    const setPageSize = useCallback((newSize) => {
        setPagination(prev => ({ ...prev, pageSize: newSize }));
        fetchDocuments({ page: 1, pageSize: newSize });
    }, [fetchDocuments]);

    // ==========================================================================
    // Document Operations
    // ==========================================================================

    /**
     * Upload a new document.
     * @param {File} file - File to upload
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    const uploadDocument = useCallback(async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            await api.post('/documents/upload', formData, true);
            return { success: true };
        } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * Delete a document with confirmation.
     * @param {Object} doc - Document to delete
     * @returns {Promise<boolean>}
     */
    const deleteDocument = useCallback(async (doc) => {
        const confirmed = await showConfirm(
            t('document.confirmDeleteTitle'),
            t('document.confirmDeleteMessage').replace('{filename}', doc.filename)
        );

        if (!confirmed) return false;

        try {
            await api.delete(`/documents/${doc.id}`);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));

            // Update pagination count
            setPagination(prev => ({
                ...prev,
                totalDocuments: Math.max(0, prev.totalDocuments - 1)
            }));

            showToast(t('document.deleteSuccess'), 'success');
            return true;
        } catch (err) {
            showAlert(t('common.error'), `${t('document.deleteError')}: ${err.message}`, 'error');
            return false;
        }
    }, [t]);

    /**
     * Download a document.
     * @param {Object} doc - Document to download
     * @returns {Promise<boolean>}
     */
    const downloadDocument = useCallback(async (doc) => {
        try {
            const blob = await api.download(`/documents/${doc.id}/download`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast(t('document.downloadStarted'), 'success');
            return true;
        } catch (err) {
            showAlert(t('common.error'), `${t('document.downloadError')}: ${err.message}`, 'error');
            return false;
        }
    }, [t]);

    // ==========================================================================
    // Return Hook API
    // ==========================================================================
    return {
        // Data
        documents,
        loading,
        error,

        // Pagination state
        pagination,

        // Document operations
        fetchDocuments,
        uploadDocument,
        deleteDocument,
        downloadDocument,

        // Pagination controls
        goToPage,
        nextPage,
        prevPage,
        setPageSize
    };
};
