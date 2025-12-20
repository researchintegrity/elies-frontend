// src/hooks/useWatermarkRemoval.js
import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

/**
 * Custom Hook para gerenciar remoção de watermark em documentos
 * 
 * @param {Function} onSuccess - Callback executado após remoção bem-sucedida
 * @returns {Object} - { removeWatermark, isRemoving, error }
 */
export const useWatermarkRemoval = (onSuccess) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Remove watermark de um documento
     * @param {Object} document - Documento alvo
     * @param {number} aggressivenessLevel - Nível de agressividade (0-3)
     */
    const removeWatermark = useCallback(async (document, aggressivenessLevel) => {
        // Validação
        if (!document || !document.id) {
            showAlert('Erro', 'Documento inválido.', 'error');
            return false;
        }

        if (aggressivenessLevel < 0 || aggressivenessLevel > 3) {
            showAlert('Erro', 'Nível de agressividade inválido (0-3).', 'error');
            return false;
        }

        setIsRemoving(true);
        setError(null);

        try {
            await api.post(`/documents/${document.id}/remove-watermark`, {
                aggressiveness_mode: aggressivenessLevel
            });

            // Status inicial
            showAlert('Sucesso', 'Remoção de marca d\'água iniciada. Aguarde...', 'success');

            // Polling function
            const checkStatus = async () => {
                try {
                    const statusData = await api.getWatermarkRemovalStatus(document.id);
                    console.log('Watermark Status:', statusData.status);

                    if (statusData.status === 'completed') {
                        setIsRemoving(false);
                        showAlert('Concluído', `Marca d'água removida! Novo arquivo: ${statusData.output_filename}`, 'success');

                        if (onSuccess && typeof onSuccess === 'function') {
                            onSuccess(document, aggressivenessLevel);
                        }
                    } else if (statusData.status === 'failed') {
                        setIsRemoving(false);
                        const errorMsg = statusData.error || statusData.message || 'Erro desconhecido.';
                        setError(errorMsg);
                        showAlert('Erro', `Falha na remoção: ${errorMsg}`, 'error');
                    } else {
                        // Continua polling (queued ou processing)
                        setTimeout(checkStatus, 2000);
                    }
                } catch (pollErr) {
                    console.error('Polling error:', pollErr);
                    setIsRemoving(false);
                    setError('Erro ao verificar status.');
                }
            };

            // Inicia o polling
            setTimeout(checkStatus, 1000);

        } catch (err) {
            setIsRemoving(false);
            const errorMessage = err.response?.data?.message || err.message || 'Falha ao processar solicitação.';
            setError(errorMessage);
            showAlert('Erro', `Não foi possível iniciar: ${errorMessage}`, 'error');
        }
    }, [onSuccess]);

    return {
        removeWatermark,
        isRemoving,
        error
    };
};
