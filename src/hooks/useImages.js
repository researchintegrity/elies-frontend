import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';

export const useImages = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchImages = useCallback(async (params = { page: 1, per_page: 100 }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get('/images', params);

            if (Array.isArray(data)) {
                const transformed = data.map(img => ({
                    id: img._id,
                    imageId: img._id,
                    filename: img.filename,
                    uploadedDate: img.uploaded_date,
                    fileSize: img.file_size,
                    sourceType: img.source_type,
                    imageType: img.image_type || []
                }));
                setImages(transformed);
            } else {
                throw new Error('Formato de dados inválido');
            }
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

    const deleteImage = useCallback(async (image, options = {}) => {
        if (image.sourceType === 'extracted') {
            showAlert(
                'Ação Bloqueada',
                'Imagens extraídas não podem ser excluídas individualmente. Para remover esta imagem, você deve excluir o PDF original na aba "Documentos".',
                'warning'
            );
            return false;
        }

        const { skipConfirm = false } = options;

        if (!skipConfirm) {
            const confirmed = await showConfirm(
                'Tem certeza?',
                `Deseja realmente excluir a imagem "${image.filename}"?`
            );
            if (!confirmed) return false;
        }

        try {
            await api.delete(`/images/${image.id}`);
            // Optimistic update
            setImages(prev => prev.filter(img => img.id !== image.id));

            // Only show toast if individual action (otherwise batch handler manages toast)
            if (!skipConfirm) {
                showToast('Imagem deletada com sucesso!', 'success');
            }
            return true;
        } catch (err) {
            // Only show alert if individual action
            if (!skipConfirm) {
                showAlert('Erro', `Erro ao deletar: ${err.message}`, 'error');
            }
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
        fetchImages,
        uploadImage,
        deleteImage,
        addImageTypes,
        removeImageType
    };
};
