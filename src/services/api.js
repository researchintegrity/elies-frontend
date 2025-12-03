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
    }
};
