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


            // MOCK temporário - simula delay de API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mensagens contextuais por nível
            const messages = {
                0: 'Documento mantido original.',
                1: 'Remoção leve iniciada com sucesso.',
                2: 'Remoção média iniciada com sucesso.',
                3: 'Remoção agressiva iniciada com sucesso.'
            };

            showAlert(
                'Sucesso',
                `${messages[aggressivenessLevel]} (${document.filename})`,
                'success'
            );

            // Callback de sucesso (ex: atualizar lista de documentos)
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(document, aggressivenessLevel);
            }

            return true;
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Falha ao processar solicitação.';
            setError(errorMessage);
            showAlert('Erro', `Não foi possível remover watermark: ${errorMessage}`, 'error');
            return false;
        } finally {
            setIsRemoving(false);
        }
    }, [onSuccess]);

    return {
        removeWatermark,
        isRemoving,
        error
    };
};
