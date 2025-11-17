/**
 * API Configuration
 * Centralized configuration for all API endpoints
 * 
 * Uses Vite environment variables for different environments:
 * - VITE_API_BASE_URL: Base URL for API server
 * 
 * Default: http://localhost:8000 (development)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export { API_BASE_URL };
