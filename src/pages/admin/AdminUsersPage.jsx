// src/pages/admin/AdminUsersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiMoreVertical,
  FiUserCheck,
  FiUserX,
  FiShield,
  FiKey,
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import UserEditModal from './UserEditModal';

// Utility to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Utility to format date
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
    <div className="w-24">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className={`${barColor} h-1.5 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {formatBytes(used)}
      </div>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${isAdmin
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}
    >
      {role}
    </span>
  );
};

const StatusBadge = ({ isActive }) => (
  <span
    className={`px-2 py-0.5 text-xs font-medium rounded-full ${isActive
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      }`}
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const AdminUsersPage = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  // State
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { page: currentPage, page_size: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== '') params.is_active = statusFilter === 'true';

      const data = await api.get('/admin/users', params);
      setUsers(data.users);
      setTotalUsers(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setModalOpen(true);
    setDropdownOpen(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUsers(users.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
    setSelectedUser(updatedUser);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const toggleDropdown = (userId) => {
    setDropdownOpen(dropdownOpen === userId ? null : userId);
  };

  // Quick actions
  const handleToggleStatus = async (user) => {
    try {
      const updatedUser = await api.patch(`/admin/users/${user._id}/status`, {
        is_active: !user.is_active,
      });
      handleUserUpdate(updatedUser);
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
    setDropdownOpen(null);
  };

  const handleToggleAdmin = async (user) => {
    const isAdmin = user.roles?.includes('admin');
    const newRoles = isAdmin
      ? user.roles.filter((r) => r !== 'admin')
      : [...(user.roles || ['user']), 'admin'];

    try {
      const updatedUser = await api.patch(`/admin/users/${user._id}/role`, {
        roles: newRoles,
      });
      handleUserUpdate(updatedUser);
    } catch (err) {
      alert(err.message || 'Failed to update user role');
    }
    setDropdownOpen(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.userManagement') || 'User Management'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.userManagementSubtitle') || 'Manage user accounts and permissions'}
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          {t('common.refresh') || 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.searchUsers') || 'Search by username, email, or name...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 bg-gray-50 dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('admin.allRoles') || 'All Roles'}</option>
            <option value="admin">{t('admin.admins') || 'Admins'}</option>
            <option value="user">{t('admin.users') || 'Users'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 bg-gray-50 dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('admin.allStatus') || 'All Status'}</option>
            <option value="true">{t('admin.active') || 'Active'}</option>
            <option value="false">{t('admin.inactive') || 'Inactive'}</option>
          </select>

          <button
            type="submit"
            className="px-6 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
          >
            {t('common.search') || 'Search'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.showingUsers', { showing: users.length, total: totalUsers }) ||
              `Showing ${users.length} of ${totalUsers} users`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-deep">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.user') || 'User'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.status') || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.role') || 'Role'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.storage') || 'Storage'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.lastLogin') || 'Last Login'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.actions') || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user, index) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-deep/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-sm">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge isActive={user.is_active} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {user.roles?.map((role) => (
                          <RoleBadge key={role} role={role} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StorageBar
                        used={user.storage_used_bytes}
                        limit={user.storage_limit_bytes}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.last_login_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(user._id);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <FiMoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen === user._id && (
                          <div
                            className={`absolute right-0 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-1 z-50 ${index >= users.length - 2 && users.length > 2
                                ? 'bottom-full mb-2'
                                : 'mt-2'
                              }`}
                          >
                            <button
                              onClick={() => handleUserClick(user)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <FiEdit2 className="w-4 h-4" />
                              {t('admin.editUser') || 'Edit User'}
                            </button>

                            {currentUser?._id !== user._id && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  {user.is_active ? (
                                    <>
                                      <FiUserX className="w-4 h-4" />
                                      {t('admin.deactivate') || 'Deactivate'}
                                    </>
                                  ) : (
                                    <>
                                      <FiUserCheck className="w-4 h-4" />
                                      {t('admin.activate') || 'Activate'}
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleToggleAdmin(user)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <FiShield className="w-4 h-4" />
                                  {user.roles?.includes('admin')
                                    ? t('admin.removeAdmin') || 'Remove Admin'
                                    : t('admin.makeAdmin') || 'Make Admin'}
                                </button>

                                {!user.roles?.includes('admin') && (
                                  <button
                                    onClick={() => {
                                      handleUserClick(user);
                                      // Tab will be set in modal
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  >
                                    <FiKey className="w-4 h-4" />
                                    {t('admin.resetPassword') || 'Reset Password'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
              {t('common.previous') || 'Previous'}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.pageInfo', { current: currentPage, total: totalPages }) ||
                `Page ${currentPage} of ${totalPages}`}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.next') || 'Next'}
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {selectedUser && (
        <UserEditModal
          user={selectedUser}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onUpdate={handleUserUpdate}
        />
      )}

      {/* Close dropdown when clicking outside */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(null)}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;
