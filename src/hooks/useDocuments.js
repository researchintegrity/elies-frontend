// src/hooks/useDocuments.js
import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';

export const useDocuments = () => {
    const { t } = useLanguage();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchDocuments = useCallback(async (params = { limit: 100, offset: 0 }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get('/documents', params);

            // Transform data to match component expectations
            // The backend returns a direct list of documents
            if (Array.isArray(data)) {
                const transformedDocs = data.map(doc => ({
                    id: doc._id,
                    filename: doc.filename,
                    uploadedDate: doc.uploaded_date,
                    fileSize: doc.file_size,
                    extractionStatus: doc.extraction_status || 'pending',
                    extractedImageCount: doc.extracted_image_count || 0
                }));
                setDocuments(transformedDocs);
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (err) {
            console.error('Error fetching documents:', err);
            setError(err.message);
            // Optional: showToast(t('document.fetchError'), 'error');
        } finally {
            setLoading(false);
        }
    }, [t]);

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

    const deleteDocument = useCallback(async (doc) => {
        const confirmed = await showConfirm(
            t('document.confirmDeleteTitle'),
            t('document.confirmDeleteMessage').replace('{filename}', doc.filename)
        );

        if (!confirmed) return false;

        try {
            await api.delete(`/documents/${doc.id}`);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
            showToast(t('document.deleteSuccess'), 'success');
            return true;
        } catch (err) {
            showAlert(t('common.error'), `${t('document.deleteError')}: ${err.message}`, 'error');
            return false;
        }
    }, [t]);

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

    return {
        documents,
        loading,
        error,
        fetchDocuments,
        uploadDocument,
        deleteDocument,
        downloadDocument
    };
};
