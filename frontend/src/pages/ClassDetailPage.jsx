import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { classApi, userApi } from '../services/api';
import { toast } from 'react-toastify';
import { UserPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

export default function ClassDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('');

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

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  if (!cls) return <div className="p-6 text-center text-gray-500">Không tìm thấy lớp học</div>;

  const enrolled = new Set(students.map(s => s.id));
  const available = allStudents.filter(s => !enrolled.has(s.id));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lớp {cls.name}</h1>
        <p className="text-gray-500">Khối {cls.gradeLevel} • Năm học {cls.academicYear} • {students.length} học sinh</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Danh sách học sinh</h2>
          {user.role === 'admin' && (
            <div className="flex items-center gap-2">
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Thêm học sinh --</option>
                {available.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>)}
              </select>
              <button onClick={handleAdd} disabled={!selectedStudent}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <UserPlusIcon className="w-4 h-4" /> Thêm
              </button>
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Chưa có học sinh nào</p>
        ) : (
          <div className="space-y-2">
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                <span className="text-sm text-gray-400 w-6">{i + 1}</span>
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                  {s.fullName[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.fullName}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                {user.role === 'admin' && (
                  <button onClick={() => handleRemove(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
