import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, authApi } from '../services/api';
import { toast } from 'react-toastify';

const ROLE_LABELS = { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh' };
const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', teacher: 'bg-blue-100 text-blue-700', student: 'bg-green-100 text-green-700' };

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '', address: user.address || '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userApi.updateProfile(form);
      updateUser(data);
      toast.success('Cập nhật thành công!');
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    try {
      await authApi.changePassword(pwdForm);
      toast.success('Đổi mật khẩu thành công!');
      setPwdForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">Hồ sơ cá nhân</h1>

      {/* Avatar + info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user.fullName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">{user.fullName}</h2>
            <p className="text-gray-500 text-sm truncate">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {['Thông tin', 'Đổi mật khẩu'].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2
                ${activeTab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 0 && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ tên</label>
                <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912 345 678"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Địa chỉ của bạn"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          )}

          {activeTab === 1 && (
            <form onSubmit={handleChangePwd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
                <input type="password" value={pwdForm.currentPassword}
                  onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                <input type="password" value={pwdForm.newPassword}
                  onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required minLength={8}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit"
                className="w-full md:w-auto bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-purple-700">
                Đổi mật khẩu
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;