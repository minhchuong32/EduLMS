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
  QuestionMarkCircleIcon,
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
  Cog6ToothIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import { classApi, courseApi, notificationApi } from "../../services/api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { enUS } from "date-fns/locale";

const FILE_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const NAV_ITEMS = {
  vi: {
    admin: [
      { to: "/dashboard", icon: HomeIcon, label: "Tổng quan" },
      { to: "/courses", icon: BookOpenIcon, label: "Khóa học" },
      { to: "/classes", icon: AcademicCapIcon, label: "Lớp học" },
      { to: "/users", icon: UsersIcon, label: "Người dùng" },
      {
        to: "/announcements",
        icon: MegaphoneIcon,
        label: "Thông báo hệ thống",
      },
    ],
    teacher: [
      { to: "/dashboard", icon: HomeIcon, label: "Tổng quan" },
      { to: "/courses", icon: BookOpenIcon, label: "Môn học" },
      { to: "/classes", icon: AcademicCapIcon, label: "Lớp học" },
      {
        to: "/announcements",
        icon: MegaphoneIcon,
        label: "Thông báo hệ thống",
      },
    ],
    student: [
      { to: "/dashboard", icon: HomeIcon, label: "Tổng quan" },
      { to: "/courses", icon: BookOpenIcon, label: "Môn học" },
    ],
  },
  en: {
    admin: [
      { to: "/dashboard", icon: HomeIcon, label: "Dashboard" },
      { to: "/courses", icon: BookOpenIcon, label: "Courses" },
      { to: "/classes", icon: AcademicCapIcon, label: "Classes" },
      { to: "/users", icon: UsersIcon, label: "Users" },
      {
        to: "/announcements",
        icon: MegaphoneIcon,
        label: "System Announcements",
      },
    ],
    teacher: [
      { to: "/dashboard", icon: HomeIcon, label: "Dashboard" },
      { to: "/courses", icon: BookOpenIcon, label: "Courses" },
      { to: "/classes", icon: AcademicCapIcon, label: "Classes" },
      {
        to: "/announcements",
        icon: MegaphoneIcon,
        label: "System Announcements",
      },
    ],
    student: [
      { to: "/dashboard", icon: HomeIcon, label: "Dashboard" },
      { to: "/courses", icon: BookOpenIcon, label: "Courses" },
    ],
  },
};

const ROLE_LABELS = {
  vi: {
    admin: "Quản trị viên",
    teacher: "Giáo viên",
    student: "Học sinh",
  },
  en: {
    admin: "Administrator",
    teacher: "Teacher",
    student: "Student",
  },
};

const UI_TEXT = {
  vi: {
    search: "Tìm kiếm",
    searchPlaceholder: "Tìm trang: bảng điều khiển, môn học, thông báo...",
    mobileSearchPlaceholder: "Tìm nhanh trang...",
    noSearchResult: "Không có kết quả phù hợp",
    loadingSearch: "Đang tải dữ liệu tìm kiếm...",
    goToPage: "Đi đến trang",
    profile: "Hồ sơ",
    logout: "Đăng xuất",
    notificationTitle: "Tất cả thông báo",
    notificationPageLink: "Xem trang thông báo",
    noNotifications: "Không có thông báo",
    support: "Hỗ trợ",
    language: "Ngôn ngữ",
    appearance: "Giao diện",
    vietnamese: "Tiếng Việt",
    english: "English",
    light: "Sáng",
    dark: "Tối",
    appSubtitle: "Nền tảng học tập số",
  },
  en: {
    search: "Search",
    searchPlaceholder: "Search pages: dashboard, courses, announcements...",
    mobileSearchPlaceholder: "Quick search...",
    noSearchResult: "No matching results",
    loadingSearch: "Loading search data...",
    goToPage: "Go to page",
    profile: "Profile",
    logout: "Sign out",
    notificationTitle: "All notifications",
    notificationPageLink: "Open notifications page",
    noNotifications: "No notifications",
    support: "Support",
    language: "Language",
    appearance: "Appearance",
    vietnamese: "Tiếng Việt",
    english: "English",
    light: "Light",
    dark: "Dark",
    appSubtitle: "Digital learning platform",
  },
};

const ROLE_COLORS = {
  admin: "bg-violet-100 text-violet-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-emerald-100 text-emerald-700",
};

export default function Layout() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(
    localStorage.getItem("layoutLang") === "en" ? "en" : "vi",
  );
  const [searchCatalog, setSearchCatalog] = useState({
    courses: [],
    classes: [],
  });
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const notificationPanelRef = useRef(null);
  const mobileSettingsPanelRef = useRef(null);
  const desktopSettingsPanelRef = useRef(null);
  const searchPanelRef = useRef(null);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[language][user?.role] || [];
  const bottomNavItems = navItems.slice(0, 4);
  const isQuizRoute = /^\/assignments\/[^/]+\/quiz$/.test(location.pathname);
  const t = UI_TEXT[language];
  const roleLabels = ROLE_LABELS[language];
  const dateLocale = language === "en" ? enUS : vi;
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    localStorage.setItem("layoutLang", language);
  }, [language]);

  const searchableRoutes = useMemo(
    () => [
      ...navItems.map((item) => ({
        keyword: item.label,
        title: item.label,
        description: t.goToPage,
        to: item.to,
      })),
      { keyword: "thong bao announcements", to: "/announcements" },
      {
        keyword: "thong bao chi tiet announcement details",
        to: "/announcements",
      },
      {
        keyword: "noti notification",
        to: user?.role === "admin" ? "/noti" : "/announcements",
      },
      { keyword: "ho so profile", to: "/profile" },
      { keyword: "profile", to: "/profile" },
      { keyword: "dashboard tong quan", to: "/dashboard" },
      { keyword: "trang chu home", to: "/dashboard" },
    ],
    [navItems, t.goToPage, user?.role],
  );

  useEffect(() => {
    let alive = true;

    const loadSearchCatalog = async () => {
      setSearchLoading(true);
      try {
        const [coursesRes, classesRes] = await Promise.all([
          courseApi.getAll(),
          user?.role === "admin" || user?.role === "teacher"
            ? classApi.getAll()
            : Promise.resolve({ data: [] }),
        ]);

        if (!alive) return;

        setSearchCatalog({
          courses: Array.isArray(coursesRes.data) ? coursesRes.data : [],
          classes: Array.isArray(classesRes.data) ? classesRes.data : [],
        });
      } catch {
        if (alive) {
          setSearchCatalog({ courses: [], classes: [] });
        }
      } finally {
        if (alive) setSearchLoading(false);
      }
    };

    loadSearchCatalog();

    return () => {
      alive = false;
    };
  }, [user?.role]);

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

  useEffect(() => {
    if (!showSettings) return undefined;

    const handleClickOutside = (event) => {
      const inMobilePanel = mobileSettingsPanelRef.current?.contains(
        event.target,
      );
      const inDesktopPanel = desktopSettingsPanelRef.current?.contains(
        event.target,
      );
      if (!inMobilePanel && !inDesktopPanel) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  useEffect(() => {
    if (!showSearchSuggestions) return undefined;

    const handleClickOutside = (event) => {
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(event.target)
      ) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearchSuggestions]);

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

    const firstMatch = searchSuggestions[0];

    if (!firstMatch) {
      toast.info(t.noSearchResult);
      return;
    }

    navigate(firstMatch.to);
    setSearchTerm("");
    setShowSearchSuggestions(false);
    setMobileOpen(false);
  };

  const searchCandidates = useMemo(() => {
    const routeCandidates = searchableRoutes.map((item) => ({
      key: `route-${item.to}-${item.keyword}`,
      title: item.title || item.keyword,
      description: item.description || "Đi đến trang",
      keyword: item.keyword,
      to: item.to,
    }));

    const courseCandidates = searchCatalog.courses.map((course) => ({
      key: `course-${course.id}`,
      title: course.subjectName || (language === "en" ? "Course" : "Khóa học"),
      description: course.className
        ? `${language === "en" ? "Class" : "Lớp"} ${course.className}`
        : language === "en"
          ? "Course"
          : "Khóa học",
      keyword: `${course.subjectName || ""} ${course.subjectCode || ""} ${course.className || ""}`,
      to: `/courses/${course.id}`,
    }));

    const classCandidates = searchCatalog.classes.map((cls) => ({
      key: `class-${cls.id}`,
      title: cls.name || (language === "en" ? "Class" : "Lớp học"),
      description: cls.academicYear
        ? `${language === "en" ? "Academic year" : "Năm học"} ${cls.academicYear}`
        : language === "en"
          ? "Class"
          : "Lớp học",
      keyword: `${cls.name || ""} ${cls.gradeLevel || ""} ${cls.academicYear || ""}`,
      to: `/classes/${cls.id}`,
    }));

    return [...routeCandidates, ...courseCandidates, ...classCandidates];
  }, [
    language,
    searchCatalog.classes,
    searchCatalog.courses,
    searchableRoutes,
  ]);

  const searchSuggestions = useMemo(() => {
    const keyword = normalizeText(searchTerm);
    if (!keyword) return [];

    return searchCandidates
      .filter((item) => normalizeText(item.keyword).includes(keyword))
      .slice(0, 8);
  }, [searchCandidates, searchTerm]);

  const handleSelectSearchSuggestion = (item) => {
    navigate(item.to);
    setSearchTerm("");
    setShowSearchSuggestions(false);
    setMobileOpen(false);
  };

  const handleNotificationsClick = () => {
    setShowSettings(false);
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

  const handleSettingsClick = () => {
    setShowNotifications(false);
    setShowSettings((prev) => !prev);
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
                  {t.appSubtitle}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
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

        <div className="border-t border-slate-100/80 p-3 space-y-1 dark:border-slate-800/80">
          {/* SUPPORT */}
          <button
            onClick={() => navigate("/support")} // hoặc mở modal
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
            {!collapsed && <span>{t.support}</span>}
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
                <div className="relative" ref={mobileSettingsPanelRef}>
                  <button
                    onClick={handleSettingsClick}
                    className="rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={t.settings}
                  >
                    <Cog6ToothIcon className="h-5 w-5 text-slate-600 dark:text-slate-200" />
                  </button>
                  {showSettings && (
                    <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t.language}
                      </p>
                      <button
                        type="button"
                        onClick={() => setLanguage("vi")}
                        className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>{t.vietnamese}</span>
                        {language === "vi" && (
                          <CheckIcon className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage("en")}
                        className="mb-3 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>{t.english}</span>
                        {language === "en" && (
                          <CheckIcon className="h-4 w-4 text-blue-600" />
                        )}
                      </button>

                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t.appearance}
                      </p>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>{theme === "dark" ? t.dark : t.light}</span>
                        {theme === "dark" ? (
                          <MoonIcon className="h-4 w-4" />
                        ) : (
                          <SunIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
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
                {t.search}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="mobile-search"
                  type="text"
                  placeholder={t.mobileSearchPlaceholder}
                  value={searchTerm}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              {showSearchSuggestions && searchTerm.trim() && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {searchSuggestions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {searchLoading ? t.loadingSearch : t.noSearchResult}
                    </div>
                  ) : (
                    searchSuggestions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectSearchSuggestion(item)}
                        className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
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
                      {roleLabels[user?.role]}
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
                  label={t.profile}
                  onClick={() => setMobileOpen(false)}
                />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isQuizRoute && (
          <header className="hidden md:flex sticky top-0 z-20 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/90 px-6 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full max-w-xl"
              ref={searchPanelRef}
            >
              <label className="sr-only" htmlFor="desktop-search">
                {t.search}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="desktop-search"
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              {showSearchSuggestions && searchTerm.trim() && (
                <div className="absolute mt-2 max-h-72 w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {searchSuggestions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {searchLoading ? t.loadingSearch : t.noSearchResult}
                    </div>
                  ) : (
                    searchSuggestions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectSearchSuggestion(item)}
                        className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </form>

            <div className="flex items-center gap-2">
              {/* Setting  */}
              <div className="relative" ref={desktopSettingsPanelRef}>
                <button
                  onClick={handleSettingsClick}
                  className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label={t.settings}
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>

                {showSettings && (
                  <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {t.language}
                    </p>
                    <button
                      type="button"
                      onClick={() => setLanguage("vi")}
                      className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span>{t.vietnamese}</span>
                      {language === "vi" && (
                        <CheckIcon className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className="mb-3 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span>{t.english}</span>
                      {language === "en" && (
                        <CheckIcon className="h-4 w-4 text-blue-600" />
                      )}
                    </button>

                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {t.appearance}
                    </p>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span>{theme === "dark" ? t.dark : t.light}</span>
                      {theme === "dark" ? (
                        <MoonIcon className="h-4 w-4" />
                      ) : (
                        <SunIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              {/* Noti  */}
              <div className="relative" ref={notificationPanelRef}>
                <button
                  onClick={handleNotificationsClick}
                  className="relative rounded-xl bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  <div className="absolute right-0 top-full z-30 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {t.notificationTitle}
                      </p>
                      <Link
                        to="/noti"
                        onClick={handleNotificationItemClick}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {t.notificationPageLink}
                      </Link>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <div className="rounded-xl p-4 text-center text-sm text-slate-400">
                          {t.noNotifications}
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
                                  {formatDistanceToNow(
                                    new Date(item.createdAt),
                                    {
                                      addSuffix: true,
                                      locale: dateLocale,
                                    },
                                  )}
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
              </div>
              {/* Avatar  */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex items-center justify-center rounded-full"
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
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border bg-white shadow-xl dark:bg-slate-800">
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm rounded-t-2xl hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t.profile}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 rounded-b-2xl hover:bg-red-50"
                    >
                      {t.logout}
                    </button>
                  </div>
                )}
              </div>
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
