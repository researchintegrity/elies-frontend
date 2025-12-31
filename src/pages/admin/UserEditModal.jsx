// src/pages/admin/UserEditModal.jsx
import React, { useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  FiX,
  FiUser,
  FiHardDrive,
  FiShield,
  FiKey,
  FiCheck,
  FiAlertCircle,
  FiCopy,
} from 'react-icons/fi';

// Utility to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const parseBytes = (value, unit) => {
  const num = parseFloat(value);
  const multipliers = {
    Bytes: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  return Math.round(num * (multipliers[unit] || 1));
};

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StorageBar = ({ used, limit }) => {
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  let barColor = 'bg-green-500';
  if (percentage > 90) barColor = 'bg-red-500';
  else if (percentage > 70) barColor = 'bg-amber-500';

  return (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatBytes(used)}</span>
        <span>{formatBytes(limit)}</span>
      </div>
    </div>
  );
};

const UserEditModal = ({ user, isOpen, onClose, onUpdate }) => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quota form
  const [quotaValue, setQuotaValue] = useState('1');
  const [quotaUnit, setQuotaUnit] = useState('GB');

  // Password reset
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  const isCurrentUser = currentUser?._id === user._id;
  const isTargetAdmin = user.roles?.includes('admin');

  if (!isOpen) return null;

  const tabs = [
    { id: 'info', label: t('admin.info') || 'Info', icon: FiUser },
    { id: 'quota', label: t('admin.quota') || 'Quota', icon: FiHardDrive },
    { id: 'role', label: t('admin.role') || 'Role', icon: FiShield },
    { id: 'password', label: t('admin.password') || 'Password', icon: FiKey },
  ];

  const handleUpdateQuota = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const bytes = parseBytes(quotaValue, quotaUnit);
      const updatedUser = await api.patch(`/admin/users/${user._id}/quota`, {
        storage_limit_bytes: bytes,
      });
      onUpdate(updatedUser);
      setSuccess(t('admin.quotaUpdated') || 'Quota updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update quota');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (isCurrentUser) {
      setError(t('admin.cannotModifyOwnRole') || 'Cannot modify your own admin role');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const newRoles = isTargetAdmin
        ? user.roles.filter((r) => r !== 'admin')
        : [...(user.roles || ['user']), 'admin'];

      const updatedUser = await api.patch(`/admin/users/${user._id}/role`, {
        roles: newRoles,
      });
      onUpdate(updatedUser);
      setSuccess(
        isTargetAdmin
          ? t('admin.demotedFromAdmin') || 'User demoted from admin'
          : t('admin.promotedToAdmin') || 'User promoted to admin'
      );
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (isCurrentUser) {
      setError(t('admin.cannotDeactivateSelf') || 'Cannot deactivate your own account');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await api.patch(`/admin/users/${user._id}/status`, {
        is_active: !user.is_active,
      });
      onUpdate(updatedUser);
      setSuccess(
        updatedUser.is_active
          ? t('admin.userActivated') || 'User activated'
          : t('admin.userDeactivated') || 'User deactivated'
      );
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (autoGenerate) => {
    if (isTargetAdmin && !isCurrentUser) {
      setError(t('admin.cannotResetAdminPassword') || 'Cannot reset another admin\'s password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedPassword('');

    try {
      const body = autoGenerate ? {} : { new_password: newPassword };
      
      if (!autoGenerate && (!newPassword || newPassword.length < 4)) {
        setError(t('admin.passwordTooShort') || 'Password must be at least 4 characters');
        setLoading(false);
        return;
      }

      const result = await api.post(`/admin/users/${user._id}/reset-password`, body);

      if (result.generated_password) {
        setGeneratedPassword(result.generated_password);
      }
      setSuccess(result.message || t('admin.passwordResetSuccess') || 'Password reset successfully');
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess(t('admin.copiedToClipboard') || 'Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-xl transform transition-all sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.editUser') || 'Edit User'}: {user.username}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <FiCheck className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user.full_name || user.username}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        user.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Roles:</span>
                    <span className="ml-2">
                      {user.roles?.map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-0.5 rounded-full text-xs mr-1 ${
                            role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatDate(user.last_login_at)}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.storageUsage') || 'Storage Usage'}
                  </h4>
                  <StorageBar used={user.storage_used_bytes} limit={user.storage_limit_bytes} />
                </div>

                {!isCurrentUser && (
                  <button
                    onClick={handleToggleStatus}
                    disabled={loading}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                      user.is_active
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {user.is_active
                      ? t('admin.deactivateUser') || 'Deactivate User'
                      : t('admin.activateUser') || 'Activate User'}
                  </button>
                )}
              </div>
            )}

            {/* Quota Tab */}
            {activeTab === 'quota' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.currentQuota') || 'Current Quota'}
                  </h4>
                  <StorageBar used={user.storage_used_bytes} limit={user.storage_limit_bytes} />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.newQuota') || 'Set New Quota'}
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={quotaValue}
                      onChange={(e) => setQuotaValue(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={quotaUnit}
                      onChange={(e) => setQuotaUnit(e.target.value)}
                      className="px-4 py-2.5 bg-gray-50 dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="MB">MB</option>
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  {['512 MB', '1 GB', '5 GB', '10 GB'].map((preset) => {
                    const [val, unit] = preset.split(' ');
                    return (
                      <button
                        key={preset}
                        onClick={() => {
                          setQuotaValue(val);
                          setQuotaUnit(unit);
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleUpdateQuota}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? t('common.saving') || 'Saving...'
                    : t('admin.updateQuota') || 'Update Quota'}
                </button>
              </div>
            )}

            {/* Role Tab */}
            {activeTab === 'role' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.currentRoles') || 'Current Roles'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {user.roles?.map((role) => (
                      <span
                        key={role}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                          role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {!isCurrentUser && (
                  <button
                    onClick={handleToggleAdmin}
                    disabled={loading}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                      isTargetAdmin
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                  >
                    {isTargetAdmin
                      ? t('admin.removeAdminRole') || 'Remove Admin Role'
                      : t('admin.grantAdminRole') || 'Grant Admin Role'}
                  </button>
                )}

                {isCurrentUser && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                    <FiAlertCircle className="inline w-4 h-4 mr-2" />
                    {t('admin.cannotModifyOwnRoleInfo') ||
                      'You cannot modify your own admin role to prevent lockout.'}
                  </div>
                )}
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                {isTargetAdmin && !isCurrentUser ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                    <FiAlertCircle className="inline w-4 h-4 mr-2" />
                    {t('admin.cannotResetAdminPasswordInfo') ||
                      'Cannot reset password for another admin user.'}
                  </div>
                ) : (
                  <>
                    {generatedPassword && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                        <p className="text-sm text-green-700 dark:text-green-400 mb-2">
                          {t('admin.generatedPassword') || 'Generated Password:'}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-white dark:bg-dark-deep rounded-lg font-mono text-sm">
                            {generatedPassword}
                          </code>
                          <button
                            onClick={() => copyToClipboard(generatedPassword)}
                            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            title="Copy to clipboard"
                          >
                            <FiCopy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('admin.setNewPassword') || 'Set New Password'}
                      </h4>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('admin.enterNewPassword') || 'Enter new password...'}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResetPassword(false)}
                        disabled={loading || !newPassword}
                        className="flex-1 py-2.5 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                      >
                        {t('admin.setPassword') || 'Set Password'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(true)}
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        {t('admin.generateRandom') || 'Generate Random'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;
