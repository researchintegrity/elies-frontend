import { API_BASE_URL } from '../config/api';

/**
 * Centralized API Client
 * Wraps the native fetch API to handle:
 * - Base URL configuration
 * - Automatic Authorization header injection
 * - Global error handling (e.g., 401 Unauthorized)
 * - Response parsing
 */

const getHeaders = (isMultipart = false) => {
    const headers = {};
    const token = localStorage.getItem('authToken');

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // For multipart/form-data (file uploads), let the browser set Content-Type
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
};

const handleResponse = async (response) => {
    // Handle 401 Unauthorized globally
    if (response.status === 401) {
        // Optional: Clear token and redirect to login
        // localStorage.removeItem('authToken');
        // localStorage.removeItem('user');
        // window.location.href = '/login'; 
        // Note: For now, we'll just throw the error and let the context/component handle the redirect if needed,
        // or we can dispatch a custom event.
        throw new Error('Sessão expirada ou inválida. Por favor, faça login novamente.');
    }

    // Handle 204 No Content (Success with no body)
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else if (contentType && contentType.includes('application/pdf')) {
        return response.blob();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const errorMessage = data?.detail || data?.message || 'Ocorreu um erro na requisição.';
        throw new Error(errorMessage);
    }

    return data;
};

export const api = {
    get: async (endpoint, params = {}) => {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: getHeaders(),
        });

        return handleResponse(response);
    },

    post: async (endpoint, body, isMultipart = false) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(isMultipart),
            body: isMultipart ? body : JSON.stringify(body),
        });

        return handleResponse(response);
    },

    put: async (endpoint, body, isMultipart = false) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(isMultipart),
            body: isMultipart ? body : JSON.stringify(body),
        });

        return handleResponse(response);
    },

    delete: async (endpoint) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        return handleResponse(response);
    },

    // Helper specifically for downloading blobs (PDFs, Images)
    download: async (endpoint) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            // Try to parse error message if possible, otherwise generic
            throw new Error('Falha no download do arquivo.');
        }

        return response.blob();
    },

    // --- Image Type Management ---

    addImageTypes: async (imageId, types) => {
        return api.post(`/images/${imageId}/types`, { types });
    },

    removeImageType: async (imageId, typeName) => {
        return api.delete(`/images/${imageId}/types/${typeName}`);
    },

    // --- Documents ---

    getWatermarkRemovalStatus: async (documentId) => {
        return api.get(`/documents/${documentId}/watermark-removal/status`);
    },

    // --- Panel Extraction ---

    /**
     * Initiate panel extraction for selected images
     * @param {string[]} imageIds - Array of image IDs to extract panels from
     * @param {string} modelType - Model type for extraction (default: 'default')
     * @returns {Promise<{task_id: string, status: string, image_ids: string[], message: string}>}
     */
    extractPanels: async (imageIds, modelType = 'default') => {
        return api.post('/images/extract-panels', {
            image_ids: imageIds,
            model_type: modelType
        });
    },

    /**
     * Get status of a panel extraction task
     * @param {string} taskId - Celery task ID from extraction initiation
     * @returns {Promise<{task_id: string, status: string, extracted_panels_count: number, extracted_panels?: Array}>}
     */
    getExtractionStatus: async (taskId) => {
        return api.get(`/images/extract-panels/status/${taskId}`);
    },

    /**
     * Get all panels extracted from a specific source image
     * @param {string} imageId - Source image ID
     * @returns {Promise<Array>} Array of panel image objects
     */
    getPanelsFromImage: async (imageId) => {
        return api.get(`/images/${imageId}/panels`);
    },

    // --- Provenance Analysis ---

    /**
     * Check provenance service health status
     * @returns {Promise<{service: string, healthy: boolean, message: string}>}
     */
    checkProvenanceHealth: async () => {
        return api.get('/provenance/health');
    },

    /**
     * Start provenance analysis for a query image
     * @param {string} imageId - Query image ID
     * @param {Object} params - Analysis parameters
     * @param {number} params.k - Top-K candidates from CBIR (default: 10)
     * @param {number} params.q - Top-Q for expansion (default: 5)
     * @param {number} params.max_depth - Max expansion depth (default: 3)
     * @param {string} params.descriptor_type - Descriptor type (default: 'cv_rsift')
     * @returns {Promise<{message: string, analysis_id: string, query_image_id: string}>}
     */
    startProvenanceAnalysis: async (imageId, params = {}) => {
        return api.post('/provenance/analyze', {
            image_id: imageId,
            search_image_ids: params.search_image_ids || null,
            k: params.k || 10,
            q: params.q || 5,
            max_depth: params.max_depth || 3,
            descriptor_type: params.descriptor_type || 'cv_rsift'
        });
    },

    /**
     * Get analysis details by ID (works for all analysis types including provenance)
     * @param {string} analysisId - Analysis ID
     * @returns {Promise<Object>} Analysis details including status and results
     */
    getAnalysisById: async (analysisId) => {
        return api.get(`/analyses/${analysisId}`);
    },

    // --- Copy-Move Detection ---

    /**
     * Start single-image copy-move detection analysis
     * Note: Single-image detection only supports 'dense' method
     * @param {string} imageId - Image ID to analyze
     * @param {string} method - Detection method (only 'dense' supported for single-image)
     * @param {number} denseMethod - Dense method variant (1-5)
     * @returns {Promise<{message: string, analysis_id: string}>}
     */
    startCopyMoveAnalysis: async (imageId, method = 'dense', denseMethod = 2) => {
        return api.post('/analyses/copy-move/single', {
            image_id: imageId,
            method: 'dense',  // Single-image only supports dense
            dense_method: denseMethod
        });
    },

    /**
     * Start cross-image copy-move detection analysis
     * @param {string} sourceImageId - Source image ID
     * @param {string} targetImageId - Target image ID
     * @param {string} method - Detection method ('keypoint' or 'dense', default: 'keypoint')
     * @param {number} denseMethod - Dense method variant (1-5), only used when method='dense'
     * @param {string} descriptor - Keypoint descriptor type, only used when method='keypoint'
     * @returns {Promise<{message: string, analysis_id: string}>}
     */
    startCrossImageCopyMoveAnalysis: async (sourceImageId, targetImageId, method = 'keypoint', denseMethod = 2, descriptor = 'cv_rsift') => {
        return api.post('/analyses/copy-move/cross', {
            source_image_id: sourceImageId,
            target_image_id: targetImageId,
            method: method,
            dense_method: denseMethod,
            descriptor: descriptor
        });
    }
};
