// src/pages/CopyMove/utils.js
import { API_BASE_URL } from '../../config/api';

export const getThumbnailUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};
