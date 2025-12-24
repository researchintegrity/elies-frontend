// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  FiUsers,
  FiUserCheck,
  FiShield,
  FiHardDrive,
  FiRefreshCw,
  FiAlertCircle,
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

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'primary' }) => {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const StorageBar = ({ used, total }) => {
  const percentage = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  let barColor = 'bg-green-500';
  if (percentage > 90) barColor = 'bg-red-500';
  else if (percentage > 70) barColor = 'bg-amber-500';

  return (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(total)} total</span>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
        <FiAlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-red-700 dark:text-red-400">{error}</span>
        <button
          onClick={loadStats}
          className="ml-auto px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.dashboard') || 'Admin Dashboard'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.dashboardSubtitle') || 'System overview and statistics'}
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          {t('common.refresh') || 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={FiUsers}
              title={t('admin.totalUsers') || 'Total Users'}
              value={stats.total_users}
              color="primary"
            />
            <StatCard
              icon={FiUserCheck}
              title={t('admin.activeUsers') || 'Active Users'}
              value={stats.active_users}
              color="green"
            />
            <StatCard
              icon={FiShield}
              title={t('admin.adminUsers') || 'Admin Users'}
              value={stats.admin_count}
              color="purple"
            />
            <StatCard
              icon={FiHardDrive}
              title={t('admin.storageUsed') || 'Storage Used'}
              value={formatBytes(stats.total_storage_used_bytes)}
              subtitle={`of ${formatBytes(stats.total_storage_allocated_bytes)} allocated`}
              color="amber"
            />
          </div>

          {/* Storage Overview */}
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('admin.storageOverview') || 'Storage Overview'}
            </h2>
            <StorageBar
              used={stats.total_storage_used_bytes}
              total={stats.total_storage_allocated_bytes}
            />
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('admin.userBreakdown') || 'User Breakdown'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Active Users</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {stats.active_users}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Inactive Users</span>
                  <span className="font-semibold text-gray-500">
                    {stats.total_users - stats.active_users}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Administrators</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {stats.admin_count}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('admin.storageStats') || 'Storage Statistics'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Used</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatBytes(stats.total_storage_used_bytes)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Allocated</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatBytes(stats.total_storage_allocated_bytes)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Avg per User</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.total_users > 0
                      ? formatBytes(stats.total_storage_used_bytes / stats.total_users)
                      : '0 Bytes'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
