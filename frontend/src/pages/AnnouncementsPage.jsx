// AnnouncementsPage.jsx
import React, { useEffect, useState } from 'react';
import { announcementApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const { user } = useAuth();

  useEffect(() => {
    announcementApi.getAll().then(r => setAnnouncements(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await announcementApi.create({ ...form, isGlobal: user.role === 'admin' });
      setAnnouncements(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ title: '', content: '' });
      toast.success('Đăng thông báo thành công!');
    } catch (err) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa thông báo này?')) return;
    await announcementApi.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast.success('Đã xóa');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
        {(user.role === 'teacher' || user.role === 'admin') && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" /> Đăng thông báo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Thông báo mới</h2>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              placeholder="Tiêu đề thông báo"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required
              placeholder="Nội dung thông báo..." rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Đăng</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Hủy</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{ann.title}</h3>
                  <p className="text-gray-500 text-sm mt-2 whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {ann.authorName?.[0]}
                    </div>
                    <span className="text-xs text-gray-400">
                      {ann.authorName} • {format(new Date(ann.createdAt), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                    </span>
                    {ann.isGlobal && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Toàn trường</span>}
                  </div>
                </div>
                {(ann.authorId === user.id || user.role === 'admin') && (
                  <button onClick={() => handleDelete(ann.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnnouncementsPage;
