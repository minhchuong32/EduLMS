import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { classApi, userApi } from '../services/api';
import { toast } from 'react-toastify';
import { UserPlusIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

export default function ClassDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    classApi.getById(id).then(r => {
      setCls(r.data);
      setStudents(r.data.students || []);
    }).finally(() => setLoading(false));
    if (user.role === 'admin') {
      userApi.getAll({ role: 'student', limit: 200 }).then(r => setAllStudents(r.data.data || []));
    }
  }, [id, user.role]);

  const handleAdd = async () => {
    if (!selectedStudent) return;
    try {
      await classApi.addStudent(id, selectedStudent);
      const { data } = await classApi.getById(id);
      setStudents(data.students);
      setSelectedStudent('');
      setShowAddSheet(false);
      toast.success('Thêm học sinh thành công');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const handleRemove = async (studentId) => {
    if (!window.confirm('Xóa học sinh khỏi lớp?')) return;
    await classApi.removeStudent(id, studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    toast.success('Đã xóa');
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
  if (!cls) return <div className="p-6 text-center text-gray-500">Không tìm thấy lớp học</div>;

  const enrolled = new Set(students.map(s => s.id));
  const available = allStudents.filter(s => !enrolled.has(s.id));
  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Lớp {cls.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Khối {cls.gradeLevel} • {cls.academicYear} • {students.length} học sinh
            </p>
          </div>
          {/* Nút thêm học sinh — chỉ admin */}
          {user.role === 'admin' && (
            <button onClick={() => setShowAddSheet(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 flex-shrink-0">
              <UserPlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm học sinh</span>
            </button>
          )}
        </div>
      </div>

      {/* Danh sách học sinh */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-bold text-gray-800">Danh sách học sinh</h2>
          {/* Search nhỏ */}
          {students.length > 5 && (
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm học sinh..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            {students.length === 0 ? 'Chưa có học sinh nào' : 'Không tìm thấy học sinh'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filteredStudents.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                  {s.fullName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
                {user.role === 'admin' && (
                  <button onClick={() => handleRemove(s.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet thêm học sinh */}
      {showAddSheet && user.role === 'admin' && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Thêm học sinh vào lớp</h3>
              <button onClick={() => setShowAddSheet(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {available.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">Không có học sinh nào để thêm</p>
            ) : (
              <>
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
                  <option value="">-- Chọn học sinh --</option>
                  {available.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button onClick={handleAdd} disabled={!selectedStudent}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    <UserPlusIcon className="w-4 h-4" /> Thêm vào lớp
                  </button>
                  <button onClick={() => setShowAddSheet(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50">
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}