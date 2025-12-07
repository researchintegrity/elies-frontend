// src/hooks/useProfile.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

/**
 * Custom Hook para gerenciar perfil do usuário
 * 
 * @returns {Object} - { user, loading, error, updateProfile, deleteAccount, refreshProfile }
 */
export const useProfile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(false);

    /**
     * Buscar informações do usuário atual
     */
    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.get('/users/me');
            console.log('Profile API Response:', response); // Debug

            // A resposta pode vir direto ou em response.data
            const userData = response.data || response;
            console.log('User Data:', userData); // Debug

            if (userData && (userData._id || userData.username)) {
                setUser(userData);
            } else {
                console.error('Invalid user data structure:', userData);
                throw new Error('Dados do usuário inválidos');
            }
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
            const errorMessage = err.response?.data?.detail ||
                (Array.isArray(err.response?.data?.detail) ? err.response.data.detail[0]?.msg : null) ||
                err.message ||
                'Erro ao carregar perfil';
            setError(errorMessage);
            showAlert('Erro', errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Atualizar informações do usuário
     * @param {Object} data - { full_name, email }
     */
    const updateProfile = useCallback(async (data) => {
        setUpdating(true);
        setError(null);

        try {
            // Enviar apenas campos não vazios
            const payload = {};
            if (data.full_name && data.full_name.trim()) payload.full_name = data.full_name.trim();
            if (data.email && data.email.trim()) payload.email = data.email.trim();

            // Se não houver nada para atualizar
            if (Object.keys(payload).length === 0) {
                showAlert('Aviso', 'Nenhuma alteração para salvar', 'info');
                setUpdating(false);
                return false;
            }

            const response = await api.put('/users/me', payload);

            if (response && response.data) {
                setUser(response.data);
                showAlert('Sucesso', 'Perfil atualizado com sucesso!', 'success');
                return true;
            }
        } catch (err) {
            console.error('Erro ao atualizar perfil:', err);

            // Lidar com erro 422 de validação
            let errorMessage = 'Erro ao atualizar perfil';

            if (err.response?.status === 422 && err.response?.data?.detail) {
                const details = err.response.data.detail;
                if (Array.isArray(details) && details.length > 0) {
                    errorMessage = details.map(d => d.msg).join(', ');
                } else if (typeof details === 'string') {
                    errorMessage = details;
                }
            } else {
                errorMessage = err.response?.data?.detail || err.message || errorMessage;
            }

            setError(errorMessage);
            showAlert('Erro', errorMessage, 'error');
            return false;
        } finally {
            setUpdating(false);
        }
    }, []);

    /**
     * Deletar conta do usuário (permanente!)
     */
    const deleteAccount = useCallback(async () => {
        try {
            await api.delete('/users/me');
            showAlert('Conta Deletada', 'Sua conta foi removida permanentemente.', 'success');
            // Logout automático após deletar
            localStorage.removeItem('token');
            window.location.href = '/';
            return true;
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message || 'Erro ao deletar conta';
            showAlert('Erro', errorMessage, 'error');
            return false;
        }
    }, []);

    // Carregar perfil ao montar o componente
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        user,
        loading,
        error,
        updating,
        updateProfile,
        deleteAccount,
        refreshProfile: fetchProfile
    };
};
