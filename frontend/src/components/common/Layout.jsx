import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon, BookOpenIcon, AcademicCapIcon, UserGroupIcon, BellIcon,
  MegaphoneIcon, UserCircleIcon, ChevronLeftIcon, Bars3Icon, ArrowRightOnRectangleIcon,
  UsersIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const NAV_ITEMS = {
  admin: [
    { to: '/dashboard', icon: HomeIcon, label: 'Tổng quan' },
    { to: '/courses', icon: BookOpenIcon, label: 'Khóa học' },
    { to: '/classes', icon: AcademicCapIcon, label: 'Lớp học' },
    { to: '/users', icon: UsersIcon, label: 'Người dùng' },
    { to: '/announcements', icon: MegaphoneIcon, label: 'Thông báo' },
    { to: '/notifications', icon: BellIcon, label: 'Thông báo hệ thống' },
  ],
  teacher: [
    { to: '/dashboard', icon: HomeIcon, label: 'Tổng quan' },
    { to: '/courses', icon: BookOpenIcon, label: 'Môn học của tôi' },
    { to: '/classes', icon: AcademicCapIcon, label: 'Lớp học' },
    { to: '/announcements', icon: MegaphoneIcon, label: 'Thông báo' },
    { to: '/notifications', icon: BellIcon, label: 'Thông báo' },
  ],
  student: [
    { to: '/dashboard', icon: HomeIcon, label: 'Tổng quan' },
    { to: '/courses', icon: BookOpenIcon, label: 'Môn học' },
    { to: '/announcements', icon: MegaphoneIcon, label: 'Thông báo' },
    { to: '/notifications', icon: BellIcon, label: 'Thông báo' },
  ],
};

const ROLE_LABELS = { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh' };
const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', teacher: 'bg-blue-100 text-blue-700', student: 'bg-green-100 text-green-700' };

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Đăng xuất thành công');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-800 text-lg">EduLMS</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-lg hover:bg-gray-100">
            {collapsed ? <Bars3Icon className="w-5 h-5 text-gray-600" /> : <ChevronLeftIcon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                  ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-3">
          <Link to="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100">
            {user?.avatar ? (
              <img src={`http://localhost:5000${user.avatar}`} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{user?.fullName?.[0]}</span>
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user?.role]}`}>{ROLE_LABELS[user?.role]}</span>
              </div>
            )}
          </Link>
          <button onClick={handleLogout}
            className={`mt-1 flex items-center gap-3 w-full px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-sm transition-all`}>
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
