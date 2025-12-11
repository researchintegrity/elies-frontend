// src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { FiUser, FiMail, FiCalendar, FiHardDrive, FiSave, FiTrash2, FiLoader, FiAlertTriangle } from 'react-icons/fi';
import { useProfile } from '../hooks/useProfile';
import { showAlert } from '../utils/alert';

const ProfilePage = () => {
    const { user, loading, error, updating, updateProfile, deleteAccount } = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: ''
    });

    // Preencher formulário quando user carregar
    React.useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await updateProfile(formData);
        if (success) {
            setIsEditing(false);
        }
    };

    const handleDeleteAccount = () => {
        const confirmText = prompt(
            'ATENÇÃO: Esta ação é IRREVERSÍVEL!\\n\\nTodos os seus documentos e dados serão PERMANENTEMENTE deletados.\\n\\nDigite seu nome de usuário para confirmar:'
        );

        if (confirmText === user?.username) {
            deleteAccount();
        } else if (confirmText !== null) {
            showAlert('Cancelado', 'Nome de usuário incorreto. Ação cancelada.', 'info');
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const storagePercentage = user ? (user.storage_used_bytes / user.storage_limit_bytes) * 100 : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <FiLoader className="text-4xl animate-spin text-gray-600 dark:text-gray-400" />
            </div>
        );
    }

    if (error && !user) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <FiAlertTriangle className="text-5xl mb-4" />
                <h3 className="text-xl font-semibold">Erro ao carregar perfil</h3>
                <p className="text-sm text-gray-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-6 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Meu Perfil</h1>
                    <p className="text-gray-600 dark:text-gray-400">Gerencie suas informações pessoais e configurações</p>
                </div>

                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

                    {/* Avatar & Username Section - SEM GRADIENTE */}
                    <div className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 px-8 py-12 text-center">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-gray-300 dark:border-gray-500">
                            <FiUser className="text-5xl text-gray-600 dark:text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{user?.full_name || 'Usuário'}</h2>
                        <p className="text-gray-600 dark:text-gray-400">@{user?.username}</p>
                    </div>

                    {/* Info Form */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Nome Completo
                                </label>
                                <div className="relative">
                                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 dark:text-white transition-colors"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 dark:text-white transition-colors"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                {!isEditing ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Editar Perfil
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors dark:bg-gray-600 dark:hover:bg-gray-500"
                                        >
                                            {updating ? <FiLoader className="animate-spin" /> : <FiSave />}
                                            {updating ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData({ full_name: user.full_name || '', email: user.email || '' });
                                            }}
                                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Storage Card */}
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <FiHardDrive className="text-2xl text-gray-600 dark:text-gray-400" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Armazenamento</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>{formatBytes(user?.storage_used_bytes || 0)} usado</span>
                            <span>{formatBytes(user?.storage_limit_bytes || 0)} total</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${storagePercentage > 90 ? 'bg-red-500' :
                                    storagePercentage > 70 ? 'bg-amber-500' :
                                        'bg-gray-600 dark:bg-gray-400'
                                    }`}
                                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                            />
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {storagePercentage.toFixed(1)}% do espaço utilizado
                        </p>
                    </div>
                </div>

                {/* Account Info */}
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Informações da Conta</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <FiCalendar className="text-xl" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">Criada em</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    }) : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <FiCalendar className="text-xl" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">Última atualização</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user?.updated_at ? new Date(user.updated_at).toLocaleDateString('pt-BR', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    }) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-6 bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-900/50 rounded-xl p-8">
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Zona de Perigo</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        A exclusão da conta é permanente e não pode ser desfeita. Todos os seus documentos serão deletados.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <FiTrash2 />
                        Deletar Conta Permanentemente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
