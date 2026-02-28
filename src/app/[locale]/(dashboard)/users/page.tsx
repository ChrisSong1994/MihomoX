'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/Toast';
import { Users, Plus, Pencil, Trash2, Shield, User, X, Check } from 'lucide-react';

interface UserInfo {
  id: number;
  username: string;
  role: 'administrator' | 'customer';
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const t = useTranslations('Users');
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('customer');
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'customer' as 'administrator' | 'customer',
  });

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        showToast(data.message || 'Failed to fetch users', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUserRole(data.user.role);
        setCurrentUserId(data.user.id);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'customer' });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (user: UserInfo) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setShowModal(true);
  };

  // 删除用户
  const handleDelete = async (user: UserInfo) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showToast('User deleted successfully', 'success');
        fetchUsers();
      } else {
        showToast(data.message || 'Failed to delete user', 'error');
      }
    } catch (error) {
      showToast('Failed to delete user', 'error');
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        showToast(editingUser ? 'User updated successfully' : 'User created successfully', 'success');
        setShowModal(false);
        fetchUsers();
      } else {
        showToast(data.message || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const isAdmin = currentUserRole === 'administrator';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500 mt-1">{t('description')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            {t('addUser')}
          </button>
        )}
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('username')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('role')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('createdAt')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('updatedAt')}</th>
              {isAdmin && <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{t('actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="font-medium text-slate-800">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'administrator' 
                      ? 'bg-violet-100 text-violet-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'administrator' ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    {user.role === 'administrator' ? t('admin') : t('customer')}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(user.updated_at).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t('edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>{t('noUsers')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 添加/编辑用户弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingUser ? t('editUser') : t('addUser')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('username')} *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={t('usernamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('password')} {editingUser ? `(${t('optional')})` : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={editingUser ? t('passwordPlaceholder') : t('passwordRequired')}
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('role')} *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'administrator' | 'customer' })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="customer">{t('customer')}</option>
                  <option value="administrator">{t('admin')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  {editingUser ? t('save') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
