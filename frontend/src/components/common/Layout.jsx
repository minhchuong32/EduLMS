import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HomeIcon,
  BookOpenIcon,
  AcademicCapIcon,
  MegaphoneIcon,
  ChevronLeftIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

const FILE_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const NAV_ITEMS = {
  admin: [
    { to: "/dashboard", icon: HomeIcon, label: "Tổng quan" },
    { to: "/courses", icon: BookOpenIcon, label: "Khóa học" },
    { to: "/classes", icon: AcademicCapIcon, label: "Lớp học" },
    { to: "/users", icon: UsersIcon, label: "Người dùng" },
    { to: "/announcements", icon: MegaphoneIcon, label: "Thông báo hệ thống" },
  ],
  teacher: [
    { to: "/dashboard", icon: HomeIcon, label: "Tổng quan" },
    { to: "/courses", icon: BookOpenIcon, label: "Môn học" },
    { to: "/classes", icon: AcademicCapIcon, label: "Lớp học" },
    { to: "/announcements", icon: MegaphoneIcon, label: "Thông báo hệ thống" },
  ],
  student: [
    { to: "/dashboard", icon: HomeIcon, label: "Tổng quan" },
    { to: "/courses", icon: BookOpenIcon, label: "Môn học" },
  ],
};

const ROLE_LABELS = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  student: "Học sinh",
};
const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-green-100 text-green-700",
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || [];
  // Bottom nav chỉ hiện 4 mục đầu trên mobile
  const bottomNavItems = navItems.slice(0, 4);
  const isQuizRoute = /^\/assignments\/[^/]+\/quiz$/.test(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Đăng xuất thành công");
    setMobileOpen(false);
  };

  const NavLink = ({ to, icon: Icon, label, onClick }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        key={to}
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all
          ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex ${collapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 flex-col transition-all duration-300 shadow-sm`}
      >
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
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            {collapsed ? (
              <Bars3Icon className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                  ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100"
          >
            {user?.avatar ? (
              <img
                src={`${FILE_BASE_URL}${user.avatar}`}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {user?.fullName?.[0]}
                </span>
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user?.fullName}
                </p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user?.role]}`}
                >
                  {ROLE_LABELS[user?.role]}
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 flex items-center gap-3 w-full px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-sm transition-all"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile: Top bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {!isQuizRoute && (
          <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 py-3 shadow-sm z-20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-800">EduLMS</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {user?.fullName?.[0]}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <Bars3Icon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </header>
        )}

        {/* ── Mobile: Drawer menu ─────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <div className="relative ml-auto w-72 bg-white h-full flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {user?.fullName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.fullName}
                    </p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user?.role]}`}
                    >
                      {ROLE_LABELS[user?.role]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map(({ to, icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    icon={icon}
                    label={label}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </nav>

              <div className="border-t border-gray-100 p-3 space-y-1">
                <NavLink
                  to="/profile"
                  icon={({ className }) => (
                    <div
                      className={`w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ${className}`}
                    >
                      <span className="text-white text-xs font-bold">
                        {user?.fullName?.[0]}
                      </span>
                    </div>
                  )}
                  label="Hồ sơ"
                  onClick={() => setMobileOpen(false)}
                />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main
          className={`flex-1 overflow-auto md:pb-0 ${isQuizRoute ? "pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"}`}
        >
          <Outlet />
        </main>

        {/* ── Mobile: Bottom nav ──────────────────────────────────────────── */}
        {!isQuizRoute && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex pb-[env(safe-area-inset-bottom)]">
            {bottomNavItems.map(({ to, icon: Icon, label }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors
                  ${active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "text-blue-600" : "text-gray-400"}`}
                  />
                  <span className="leading-tight truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
