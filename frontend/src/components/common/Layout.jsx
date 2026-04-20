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
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

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
  admin: "bg-violet-100 text-violet-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-emerald-100 text-emerald-700",
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || [];
  const bottomNavItems = navItems.slice(0, 4);
  const isQuizRoute = /^\/assignments\/[^/]+\/quiz$/.test(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Đăng xuất thành công");
    setMobileOpen(false);
  };

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const NavLink = ({ to, icon: Icon, label, onClick }) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all ${
          active
            ? "border-blue-100 bg-blue-50/80 text-blue-700 shadow-sm"
            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-transparent">
      <aside
        className={`hidden md:flex ${collapsed ? "w-20" : "w-72"} flex-col border-r border-white/70 bg-white/85 shadow-[0_14px_45px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/85`}
      >
        <div className="flex items-center justify-between border-b border-slate-100/80 px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/25">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="block text-lg font-extrabold tracking-tight text-slate-900">
                  EduLMS
                </span>
                <span className="block text-xs text-slate-500">
                  Nền tảng học tập số
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"
              }
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {collapsed ? (
                <Bars3Icon className="w-5 h-5 text-slate-600 dark:text-slate-200" />
              ) : (
                <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-200" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "border-blue-100 bg-blue-50/80 text-blue-700 shadow-sm"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100/80 p-3 dark:border-slate-800/80">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-50"
          >
            {user?.avatar ? (
              <img
                src={`${FILE_BASE_URL}${user.avatar}`}
                alt="avatar"
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                <span className="text-xs font-bold text-white">
                  {user?.fullName?.[0]}
                </span>
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.fullName}
                </p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[user?.role]}`}
                >
                  {ROLE_LABELS[user?.role]}
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-red-600 transition-all hover:bg-red-50"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex flex-1 flex-col">
        {!isQuizRoute && (
          <header className="md:hidden z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-sm">
                <AcademicCapIcon className="h-4 w-4 text-white" />
              </div>
              <span className="font-extrabold tracking-tight text-slate-900">
                EduLMS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label={
                  theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"
                }
                className="rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5 text-slate-200" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-slate-600" />
                )}
              </button>
              <Link to="/profile">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                  <span className="text-xs font-bold text-white">
                    {user?.fullName?.[0]}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-1.5 hover:bg-slate-100"
              >
                <Bars3Icon className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </header>
        )}

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative ml-auto flex h-full w-72 flex-col bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {user?.fullName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {user?.fullName}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[user?.role]}`}
                    >
                      {ROLE_LABELS[user?.role]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <XMarkIcon className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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

              <div className="border-t border-slate-100 p-3 space-y-1 dark:border-slate-800">
                <NavLink
                  to="/profile"
                  icon={({ className }) => (
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 ${className}`}
                    >
                      <span className="text-[10px] font-bold text-white">
                        {user?.fullName?.[0]}
                      </span>
                    </div>
                  )}
                  label="Hồ sơ"
                  onClick={() => setMobileOpen(false)}
                />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}

        <main
          className={`flex-1 overflow-auto md:pb-0 ${isQuizRoute ? "pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"}`}
        >
          <div className="relative min-h-full">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-100/35 via-transparent to-transparent dark:from-blue-950/45" />
            <Outlet />
          </div>
        </main>

        {!isQuizRoute && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white/95 shadow-[0_-10px_30px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900/95">
            {bottomNavItems.map(({ to, icon: Icon, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                    active
                      ? "text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="truncate leading-tight">{label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
