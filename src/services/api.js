import { API_BASE_URL } from '../config/api';
import { translate } from '../context/LanguageContext';

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
    // Handle 401 Unauthorized globally - clear auth and redirect to login
    if (response.status === 401) {
        // Clear authentication data from localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Force page reload which will redirect to login screen
        // (App.jsx renders AuthPage when isAuthenticated is false)
        window.location.reload();

        // Throw error to prevent further processing
        throw new Error(translate('api.sessionExpired'));
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
        let errorMessage = data?.detail || data?.message || translate('api.requestError');
        if (typeof errorMessage === 'object') {
            errorMessage = JSON.stringify(errorMessage);
        }
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

    patch: async (endpoint, body) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(body),
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
            throw new Error(translate('api.downloadError'));
        }

        return response.blob();
    },

    // --- Image Type Management ---

    addImageTypes: async (imageId, types) => {
        // Ensure types is an array
        const typesArray = Array.isArray(types) ? types : [types];
        return api.post(`/images/${imageId}/types`, { types: typesArray });
    },

    removeImageType: async (imageId, typeName) => {
        return api.delete(`/images/${imageId}/types/${typeName}`);
    },

    // --- Annotations ---

    getAnnotations: async (imageId) => {
        // Query param image_id style seems consistent with startProvenanceAnalysis etc.
        return api.get('/annotations', { image_id: imageId });
    },

    createAnnotation: async (annotationData) => {
        return api.post('/annotations', annotationData);
    },

    updateAnnotation: async (annotationId, annotationData) => {
        return api.put(`/annotations/${annotationId}`, annotationData);
    },

    deleteAnnotation: async (annotationId) => {
        return api.delete(`/annotations/${annotationId}`);
    },

    /**
     * Bulk save/sync annotations for an image
     * @param {string} imageId - Image ID
     * @param {Array} annotations - Array of annotation objects
     * @returns {Promise<{success: boolean, annotations: Array}>}
     */
    saveAnnotations: async (imageId, annotations) => {
        return api.post(`/images/${imageId}/annotations/sync`, { annotations });
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
    },

    // --- Manipulation Detection (TruFor) ---

    /**
     * Start manipulation detection analysis using TruFor
     * @param {string} imageId - Image ID to analyze
     * @param {Object} options - Analysis options
     * @param {boolean} options.save_noiseprint - Whether to save Noiseprint++ output (default: false)
     * @returns {Promise<{message: string, analysis_id: string}>}
     */
    startManipulationAnalysis: async (imageId, options = {}) => {
        return api.post('/analyses/trufor', {
            image_id: imageId,
            save_noiseprint: options.save_noiseprint || false
        });
    },

    // --- Analysis Dashboard ---

    /**
     * List all analyses with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.per_page - Items per page (default: 10)
     * @param {string} params.type - Filter by analysis type
     * @param {string} params.status - Filter by status (pending, processing, completed, failed)
     * @param {string} params.source_image_id - Filter by source image ID
     * @param {string} params.date_from - Filter by start date (ISO string)
     * @param {string} params.date_to - Filter by end date (ISO string)
     * @returns {Promise<{success: boolean, data: Array, pagination: Object}>}
     */
    listAnalyses: async (params = {}) => {
        return api.get('/analyses', params);
    },

    /**
     * Get all analyses associated with a specific image
     * Returns analyses where the image is either source or target
     * @param {string} imageId - Image ID to get analyses for
     * @param {number} limit - Maximum number of analyses to return (default: 50)
     * @returns {Promise<Array>} Array of analysis objects
     */
    getAnalysesByImage: async (imageId, limit = 50) => {
        return api.get(`/analyses/by-image/${imageId}`, { limit });
    },

    /**
     * Save a screening tool analysis result
     * Allows storing results from screening tools with optional file upload
     * @param {Object} data - Analysis data
     * @param{string} data.source_image_id - Source image ID (required)
     * @param {string} data.tool_name - Name of the screening tool (required)
     * @param {string} data.tool_version - Version of the screening tool
     * @param {string} data.description - Description of the analysis
     * @param {Object} data.parameters - Parameters used for the analysis
     * @param {Object} data.metrics - Analysis metrics/results
     * @param {File} data.result_file - Optional result file to upload
     * @returns {Promise<{success: boolean, message: string, analysis_id: string}>}
     */
    saveScreeningToolAnalysis: async (data) => {
        const formData = new FormData();
        formData.append('source_image_id', data.source_image_id);
        formData.append('tool_name', data.tool_name);

        if (data.tool_version) {
            formData.append('tool_version', data.tool_version);
        }
        if (data.description) {
            formData.append('description', data.description);
        }
        if (data.parameters) {
            formData.append('parameters', JSON.stringify(data.parameters));
        }
        if (data.metrics) {
            formData.append('metrics', JSON.stringify(data.metrics));
        }
        if (data.result_file) {
            formData.append('result_file', data.result_file);
        }

        // Use getHeaders(true) for multipart form data (no Content-Type header)
        const headers = getHeaders(true);

        const response = await fetch(`${API_BASE_URL}/analyses/screening-tool`, {
            method: 'POST',
            headers,
            body: formData
        });

        return response.json();
    },

    /**
     * Save an image analysis result (from ImageAnalysisPage client-side tools)
     * @param {Object} data - Analysis data
     * @param {string} data.image_id - Image ID that was analyzed
     * @param {string} data.analysis_subtype - Subtype/tool name (e.g., 'ela', 'noise', 'gradient')
     * @param {Object} data.parameters - Parameters used for the analysis
     * @param {string} data.notes - Optional notes about the analysis
     * @param {Blob|File} data.result_image - Optional result image blob to upload
     * @returns {Promise<Object>} The created analysis document
     */
    saveImageAnalysis: async (data) => {
        const formData = new FormData();
        formData.append('image_id', data.image_id);
        formData.append('analysis_subtype', data.analysis_subtype);
        formData.append('parameters', JSON.stringify(data.parameters || {}));

        if (data.notes) {
            formData.append('notes', data.notes);
        }
        if (data.result_image) {
            // Convert blob to file if needed
            const filename = `${data.analysis_subtype}_result.png`;
            const file = data.result_image instanceof File
                ? data.result_image
                : new File([data.result_image], filename, { type: 'image/png' });
            formData.append('result_image', file);
        }

        // Use getHeaders(true) for multipart form data (no Content-Type header)
        const headers = getHeaders(true);

        const response = await fetch(`${API_BASE_URL}/analyses/screening-tool`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to save analysis' }));
            throw new Error(error.detail || 'Failed to save analysis');
        }

        return response.json();
    },

    /**
     * Download analysis result image
     * @param {string} analysisId - Analysis ID
     * @param {string} resultType - Result type (pred_map, conf_map, noiseprint, matches, clusters, result)
     * @returns {Promise<Blob>} Result image blob
     */
    downloadAnalysisResult: async (analysisId, resultType) => {
        return api.download(`/analyses/${analysisId}/results/${resultType}/download`);
    },

    // --- Flagged Images ---

    /**
     * Toggle the flagged status of an image
     * @param {string} imageId - Image ID to toggle flag status
     * @returns {Promise<Object>} Updated image object
     */
    toggleImageFlag: async (imageId) => {
        return api.patch(`/images/${imageId}/flag`, {});
    },

    /**
     * Get flagged images only
     * @param {Object} params - Query params (page, per_page, etc.)
     * @returns {Promise<Object>} Paginated response with flagged images
     */
    getFlaggedImages: async (params = {}) => {
        return api.get('/images', { ...params, flagged: true });
    },
};

export { API_BASE_URL };
export default api;
