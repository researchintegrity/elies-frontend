import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';

// Default page size for gallery pagination
const DEFAULT_PER_PAGE = 24;

export const useImages = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: DEFAULT_PER_PAGE,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
    });

    const fetchImages = useCallback(async (params = {}) => {
        const { page = 1, per_page = DEFAULT_PER_PAGE, ...otherParams } = params;
        
        setLoading(true);
        setError(null);
        try {
            const data = await api.get('/images', { page, per_page, ...otherParams });

            // Handle both array response (legacy) and paginated response object
            let imageList = [];
            let paginationData = {
                page: page,
                perPage: per_page,
                total: 0,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
            };

            if (Array.isArray(data)) {
                // Legacy array response
                imageList = data;
                paginationData.total = data.length;
                paginationData.totalPages = 1;
            } else if (data && typeof data === 'object') {
                // New paginated response: { items: [], total, page, per_page, total_pages, has_next, has_prev }
                imageList = data.items || data.images || [];
                paginationData = {
                    page: data.page || page,
                    perPage: data.per_page || per_page,
                    total: data.total || imageList.length,
                    totalPages: data.total_pages || Math.ceil((data.total || imageList.length) / per_page),
                    hasNext: data.has_next ?? false,
                    hasPrev: data.has_prev ?? (page > 1)
                };
            }

            const transformed = imageList.map(img => ({
                id: img._id,
                imageId: img._id,
                filename: img.filename,
                uploadedDate: img.uploaded_date,
                fileSize: img.file_size,
                sourceType: img.source_type,
                imageType: img.image_type || []
            }));
            
            setImages(transformed);
            setPagination(paginationData);
        } catch (err) {
            console.error('Error fetching images:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadImage = useCallback(async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            await api.post('/images/upload', formData, true);
            return { success: true };
        } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            return { success: false, error: err.message };
        }
    }, []);

    const deleteImage = useCallback(async (image) => {
        const confirmed = await showConfirm(
            'Tem certeza?',
            `Deseja realmente excluir a imagem "${image.filename}"?`
        );

        if (!confirmed) return false;

        try {
            await api.delete(`/images/${image.id}`);
            setImages(prev => prev.filter(img => img.id !== image.id));
            showToast('Imagem deletada com sucesso!', 'success');
            return true;
        } catch (err) {
            showAlert('Erro', `Erro ao deletar: ${err.message}`, 'error');
            return false;
        }
    }, []);

    const addImageTypes = useCallback(async (image, types) => {
        try {
            const updatedImage = await api.addImageTypes(image.id, types);
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, imageType: updatedImage.image_type } : img
            ));
            showToast('Tags adicionadas com sucesso!', 'success');
            return true;
        } catch (err) {
            showAlert('Erro', `Erro ao adicionar tags: ${err.message}`, 'error');
            return false;
        }
    }, []);

    const removeImageType = useCallback(async (image, typeName) => {
        try {
            const updatedImage = await api.removeImageType(image.id, typeName);
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, imageType: updatedImage.image_type } : img
            ));
            showToast('Tag removida com sucesso.', 'success');
            return true;
        } catch (err) {
            showAlert('Erro', `Erro ao remover tag: ${err.message}`, 'error');
            return false;
        }
    }, []);

    return {
        images,
        loading,
        error,
        pagination,
        fetchImages,
        uploadImage,
        deleteImage,
        addImageTypes,
        removeImageType
    };
};
