import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  BellIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import { notificationApi } from "../../services/api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationPanelRef = useRef(null);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || [];
  const bottomNavItems = navItems.slice(0, 4);
  const isQuizRoute = /^\/assignments\/[^/]+\/quiz$/.test(location.pathname);

  const searchableRoutes = useMemo(
    () => [
      ...navItems.map((item) => ({ keyword: item.label, to: item.to })),
      { keyword: "thong bao", to: "/announcements" },
      { keyword: "thong bao chi tiet", to: "/announcements" },
      {
        keyword: "noti",
        to: user?.role === "admin" ? "/noti" : "/announcements",
      },
      { keyword: "ho so", to: "/profile" },
      { keyword: "profile", to: "/profile" },
      { keyword: "dashboard", to: "/dashboard" },
      { keyword: "trang chu", to: "/dashboard" },
    ],
    [navItems, user?.role],
  );

  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationApi.getAll();
      const items = Array.isArray(response.data) ? response.data : [];
      setNotifications(items);
      const unread = items.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const safeLoad = async () => {
      if (!alive) return;
      await loadNotifications();
    };

    safeLoad();
    const timer = setInterval(safeLoad, 15000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleRefresh = () => {
      loadNotifications();
    };

    window.addEventListener("notifications:refresh", handleRefresh);
    return () =>
      window.removeEventListener("notifications:refresh", handleRefresh);
  }, [loadNotifications]);

  useEffect(() => {
    if (!showNotifications) return undefined;

    const handleClickOutside = (event) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const normalizeText = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Đăng xuất thành công");
    setMobileOpen(false);
  };

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const keyword = normalizeText(searchTerm);
    if (!keyword) return;

    const exactMatch = searchableRoutes.find(
      (item) => normalizeText(item.keyword) === keyword,
    );
    const fuzzyMatch = searchableRoutes.find((item) =>
      normalizeText(item.keyword).includes(keyword),
    );

    const destination = (exactMatch || fuzzyMatch)?.to;
    if (!destination) {
      toast.info("Không tìm thấy trang phù hợp");
      return;
    }

    navigate(destination);
    setMobileOpen(false);
  };

  const handleNotificationsClick = () => {
    if (user?.role === "admin") {
      setShowNotifications((prev) => !prev);
      return;
    }

    navigate("/announcements");
    setMobileOpen(false);
  };

  const handleNotificationItemClick = () => {
    setShowNotifications(false);
    setMobileOpen(false);
  };

  const handleOpenNotification = async (item) => {
    if (!item?.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationApi.markRead(item.id);
      } catch {
        loadNotifications();
      }
    }

    handleNotificationItemClick();
    navigate(`/noti/${item.id}`);
  };

  const handleDeleteNotification = async (event, id) => {
    event.stopPropagation();
    event.preventDefault();

    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationApi.delete(id);
    } catch {
      loadNotifications();
    }
  };

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
          <header className="md:hidden z-20 border-b border-slate-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-sm">
                  <AcademicCapIcon className="h-4 w-4 text-white" />
                </div>
                <span className="font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
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
                <button
                  onClick={() => {
                    if (user?.role === "admin") {
                      navigate("/noti");
                      return;
                    }
                    handleNotificationsClick();
                  }}
                  className="relative rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Xem thông báo"
                >
                  <BellIcon className="h-5 w-5 text-slate-600 dark:text-slate-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
                <Link to="/profile">
                  {user?.avatar ? (
                    <img
                      src={`${FILE_BASE_URL}${user.avatar}`}
                      alt="avatar"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                      <span className="text-xs font-bold text-white">
                        {user?.fullName?.[0]}
                      </span>
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl p-1.5 hover:bg-slate-100"
                >
                  <Bars3Icon className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="mt-3">
              <label className="sr-only" htmlFor="mobile-search">
                Tìm kiếm
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="mobile-search"
                  type="text"
                  placeholder="Tìm nhanh trang..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </form>
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

        {!isQuizRoute && (
          <header className="hidden md:flex sticky top-0 z-20 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/90 px-6 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
              <label className="sr-only" htmlFor="desktop-search">
                Tìm kiếm
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="desktop-search"
                  type="text"
                  placeholder="Tìm trang: bảng điều khiển, môn học, thông báo..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </form>

            <div className="flex items-center gap-2" ref={notificationPanelRef}>
              <button
                onClick={handleNotificationsClick}
                className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label="Xem thông báo"
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {user?.role === "admin" && showNotifications && (
                <div className="absolute right-20 top-full z-30 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Tất cả thông báo
                    </p>
                    <Link
                      to="/noti"
                      onClick={handleNotificationItemClick}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Xem trang thông báo
                    </Link>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="rounded-xl p-4 text-center text-sm text-slate-400">
                        Không có thông báo
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleOpenNotification(item)}
                          className={`group block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition-colors ${
                            item.isRead
                              ? "hover:bg-slate-50 dark:hover:bg-slate-800"
                              : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30"
                          }`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleOpenNotification(item);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {item.title}
                              </p>
                              {item.message && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">
                                  {item.message}
                                </p>
                              )}
                              <p className="mt-1 text-[11px] text-slate-400">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                  locale: vi,
                                })}
                              </p>
                            </div>
                            <button
                              onClick={(event) =>
                                handleDeleteNotification(event, item.id)
                              }
                              className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                              aria-label="Xóa thông báo"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-3 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                {user?.avatar ? (
                  <img
                    src={`${FILE_BASE_URL}${user.avatar}`}
                    alt="avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600">
                    <span className="text-xs font-bold text-white">
                      {user?.fullName?.[0]}
                    </span>
                  </div>
                )}
                <span className="max-w-28 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {user?.fullName}
                </span>
              </Link>
            </div>
          </header>
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
