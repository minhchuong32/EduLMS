import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, announcementApi } from '../services/api';
import { BookOpenIcon, UserGroupIcon, ClipboardDocumentListIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4`}>
    <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    dashboardApi.get().then(r => setStats(r.data)).catch(() => {});
    announcementApi.getAll().then(r => setAnnouncements(r.data.slice(0, 5))).catch(() => {});
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const renderStats = () => {
    if (!stats) return null;
    if (user.role === 'admin') {
      const byRole = {};
      (stats.usersByRole || []).forEach(r => { byRole[r.role] = r.cnt; });
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={UserGroupIcon} label="Học sinh" value={byRole.student} color="bg-blue-500" />
          <StatCard icon={AcademicCapIcon} label="Giáo viên" value={byRole.teacher} color="bg-purple-500" />
          <StatCard icon={BookOpenIcon} label="Lớp học" value={stats.totalClasses} color="bg-green-500" />
          <StatCard icon={ClipboardDocumentListIcon} label="Khóa học" value={stats.totalCourses} color="bg-orange-500" />
        </div>
      );
    }
    if (user.role === 'teacher') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpenIcon} label="Môn học" value={stats.totalCourses} color="bg-blue-500" />
          <StatCard icon={ClipboardDocumentListIcon} label="Bài giảng" value={stats.totalLessons} color="bg-purple-500" />
          <StatCard icon={AcademicCapIcon} label="Bài tập" value={stats.totalAssignments} color="bg-green-500" />
          <StatCard icon={UserGroupIcon} label="Chờ chấm" value={stats.pendingGrading} color="bg-red-500" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={BookOpenIcon} label="Môn học" value={stats.totalCourses} color="bg-blue-500" />
        <StatCard icon={ClipboardDocumentListIcon} label="Bài tập" value={stats.totalAssignments} color="bg-purple-500" />
        <StatCard icon={AcademicCapIcon} label="Đã nộp" value={stats.completedAssignments} color="bg-green-500" />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.fullName}! 👋</h1>
        <p className="text-gray-500 mt-1">Chào mừng bạn đến với hệ thống học tập EduLMS</p>
      </div>

      {/* Stats */}
      <div className="mb-8">{renderStats()}</div>

      {/* Announcements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Thông báo mới nhất</h2>
        {announcements.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Không có thông báo nào</p>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className="flex gap-3 p-3 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-700">{ann.authorName?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{ann.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{ann.content}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {ann.authorName} • {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true, locale: vi })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
