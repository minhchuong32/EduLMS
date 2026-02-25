// ClassesPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { classApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

export function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', gradeLevel: '10', academicYear: '2024-2025', description: '' });
  const { user } = useAuth();

  useEffect(() => {
    classApi.getAll().then(r => setClasses(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await classApi.create(form);
      setClasses(prev => [...prev, data]);
      setShowForm(false);
      toast.success('Tạo lớp học thành công!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý lớp học</h1>
        {user.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" /> Tạo lớp mới
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Tạo lớp học mới</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp *</label>
              <select value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['10', '11', '12'].map(g => <option key={g} value={g}>Lớp {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Năm học *</label>
              <input value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Tạo lớp</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <Link key={cls.id} to={`/classes/${cls.id}`}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">{cls.gradeLevel}</span>
              </div>
              <span className="text-xs text-gray-400">{cls.academicYear}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{cls.name}</h3>
            <p className="text-sm text-gray-500">Khối {cls.gradeLevel}</p>
            <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
              <UserGroupIcon className="w-4 h-4" />
              <span>{cls.studentCount} học sinh</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ClassesPage;
