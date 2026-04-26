import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { announcementApi, classApi, userApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AcademicCapIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  FunnelIcon,
  MegaphoneIcon,
  PlusIcon,
  RectangleStackIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

const CAPACITY = 50;
const PAGE_SIZE = 8;

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toTeacherId = (item) =>
  item?.homeroomTeacherId || item?.homeroomteacherid || item?.teacherId || "";

const toProgress = (studentCount) =>
  Math.max(
    5,
    Math.min(100, Math.round((safeNumber(studentCount) / CAPACITY) * 100)),
  );

const formatDate = (value) => {
  if (!value) return "Chưa xác định";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa xác định";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getDemoSchedule = (index = 0) => {
  const slots = [
    "Thứ Hai, 08:00 - 09:30",
    "Thứ Ba, 13:30 - 15:00",
    "Thứ Tư, 15:15 - 16:45",
    "Thứ Năm, 09:45 - 11:15",
    "Thứ Sáu, 07:30 - 09:00",
  ];
  return slots[index % slots.length];
};

const StatCard = ({ title, value, sub, icon: Icon, tone = "blue" }) => {
  const toneClass = {
    blue: "from-blue-50 to-blue-100/60 text-blue-700",
    amber: "from-amber-50 to-orange-100/70 text-amber-700",
    emerald: "from-emerald-50 to-teal-100/70 text-emerald-700",
  }[tone];

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${toneClass} p-6 shadow-sm`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.16em] font-semibold text-slate-500">
          {title}
        </p>
        <Icon className="h-6 w-6" />
      </div>
      <p className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-4xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{sub}</p>
    </div>
  );
};

const CreateClassModal = ({
  show,
  onClose,
  onSubmit,
  form,
  setForm,
  teachers,
  optionsLoading,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-2xl rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-slate-900">
            Tạo lớp học mới
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {optionsLoading ? (
            <p className="rounded-2xl bg-slate-50 py-4 text-center text-sm text-slate-500">
              Đang tải danh sách giáo viên...
            </p>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Giáo viên chủ nhiệm
              </label>
              <select
                value={form.teacherId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, teacherId: e.target.value }))
                }
                required
                className="soft-select"
              >
                <option value="">Chọn giáo viên</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Tên lớp
            </label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              className="soft-input"
              placeholder="Ví dụ: 12A1 - Vật lý nâng cao"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Khối lớp
              </label>
              <select
                value={form.gradeLevel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gradeLevel: e.target.value }))
                }
                className="soft-select"
              >
                {["10", "11", "12"].map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Năm học
              </label>
              <input
                value={form.academicYear}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, academicYear: e.target.value }))
                }
                required
                className="soft-input"
                placeholder="2025-2026"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={optionsLoading || !form.teacherId}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Tạo lớp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    name: "",
    gradeLevel: "10",
    academicYear: "2024-2025",
    description: "",
    teacherId: "",
  });
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [classRes, announcementRes] = await Promise.all([
          classApi.getAll(),
          isTeacher ? announcementApi.getAll() : Promise.resolve({ data: [] }),
        ]);

        if (!alive) return;
        setClasses(Array.isArray(classRes.data) ? classRes.data : []);
        setAnnouncements(
          Array.isArray(announcementRes.data) ? announcementRes.data : [],
        );
      } catch {
        if (alive) {
          setClasses([]);
          setAnnouncements([]);
          toast.error("Không thể tải dữ liệu lớp học");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();
    return () => {
      alive = false;
    };
  }, [isTeacher]);

  useEffect(() => {
    if (!isAdmin) return;

    setOptionsLoading(true);
    userApi
      .getAll({ role: "teacher", limit: 100 })
      .then((r) => setTeachers(r.data.data || []))
      .catch((err) => {
        toast.error(
          err.response?.data?.error || "Không tải được danh sách giáo viên",
        );
      })
      .finally(() => setOptionsLoading(false));
  }, [isAdmin]);

  const openCreate = () => {
    setForm({
      name: "",
      gradeLevel: "10",
      academicYear: "2024-2025",
      description: "",
      teacherId: teachers[0]?.id || "",
    });
    setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await classApi.create(form);
      setClasses((prev) => [data, ...prev]);
      setShowForm(false);
      toast.success("Tạo lớp học thành công!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra");
    }
  };

  const teacherMap = useMemo(() => {
    const map = new Map();
    teachers.forEach((teacher) =>
      map.set(String(teacher.id), teacher.fullName),
    );
    return map;
  }, [teachers]);

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return classes.filter((cls) => {
      const grade = String(cls.gradeLevel || "");
      const teacherId = String(toTeacherId(cls));
      const className = String(cls.name || "").toLowerCase();
      const classCode = String(cls.code || cls.classCode || "").toLowerCase();
      const isOpen = cls.isActive !== false;

      const gradePass = gradeFilter === "all" || grade === gradeFilter;
      const teacherPass =
        teacherFilter === "all" || teacherId === teacherFilter;
      const statusPass =
        statusFilter === "all" || (statusFilter === "open" ? isOpen : !isOpen);
      const keywordPass =
        !keyword || className.includes(keyword) || classCode.includes(keyword);

      return gradePass && teacherPass && statusPass && keywordPass;
    });
  }, [classes, gradeFilter, teacherFilter, statusFilter, search]);

  const pagedClasses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredClasses.slice(start, start + PAGE_SIZE);
  }, [filteredClasses, page]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, gradeFilter, teacherFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudents = classes.reduce(
      (sum, cls) => sum + safeNumber(cls.studentCount),
      0,
    );
    const completion = totalClasses
      ? Math.round(
          (classes.reduce((sum, cls) => sum + toProgress(cls.studentCount), 0) /
            totalClasses) *
            10,
        ) / 10
      : 0;

    return { totalClasses, totalStudents, completion };
  }, [classes]);

  const teacherClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return classes.filter((cls) => {
      if (!keyword) return true;
      return String(cls.name || "")
        .toLowerCase()
        .includes(keyword);
    });
  }, [classes, search]);

  const handleTeacherCreate = () => {
    toast.info(
      "Giáo viên chưa có quyền tạo lớp trực tiếp. Vui lòng liên hệ quản trị viên.",
    );
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  if (!isAdmin && !isTeacher) {
    return (
      <div className="page-shell">
        <div className="section-card p-10 text-center text-slate-500">
          Bạn không có quyền truy cập trang này.
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-[1400px]">
      {isAdmin ? (
        <>
          <CreateClassModal
            show={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleCreate}
            form={form}
            setForm={setForm}
            teachers={teachers}
            optionsLoading={optionsLoading}
          />

          <section className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-blue-100 bg-white/80 p-6 shadow-[0_20px_60px_-35px_rgba(29,78,216,0.45)] backdrop-blur md:flex-row md:items-end md:justify-between md:p-8">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Academic Curator
              </p>
              <h1 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                Quản lý lớp học hệ thống
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Điều phối lớp học, lọc theo khối và giáo viên chủ nhiệm trong
                một giao diện quản trị tập trung.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-700/25 transition hover:scale-[1.02]"
            >
              <PlusIcon className="h-5 w-5" />
              Tạo lớp học mới
            </button>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="Tổng số lớp học"
              value={stats.totalClasses}
              sub="Toàn bộ lớp đang vận hành"
              icon={RectangleStackIcon}
              tone="blue"
            />
            <StatCard
              title="Tổng số học sinh"
              value={stats.totalStudents.toLocaleString("vi-VN")}
              sub="Số lượng học sinh toàn hệ thống"
              icon={UserGroupIcon}
              tone="amber"
            />
            <StatCard
              title="Tỉ lệ hoàn thành"
              value={`${stats.completion}%`}
              sub="Dựa trên mức lấp đầy lớp"
              icon={ChartBarSquareIcon}
              tone="emerald"
            />
          </section>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Tìm lớp học
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="soft-input"
                  placeholder="Tên lớp hoặc mã lớp"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Khối lớp
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="soft-select"
                >
                  <option value="all">Tất cả khối</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Giáo viên chủ nhiệm
                </label>
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="soft-select"
                >
                  <option value="all">Tất cả giáo viên</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Trạng thái
                </label>
                <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("open")}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      statusFilter === "open"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Đang mở
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("closed")}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      statusFilter === "closed"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Đã đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      statusFilter === "all"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Tất cả
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <FunnelIcon className="h-4 w-4" />
                Bộ lọc nâng cao
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-12 gap-4 bg-slate-50 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
              <p className="col-span-4">Tên lớp và mã lớp</p>
              <p className="col-span-3">Giáo viên chủ nhiệm</p>
              <p className="col-span-2">Sĩ số</p>
              <p className="col-span-2">Ngày bắt đầu</p>
              <p className="col-span-1 text-right">Trạng thái</p>
            </div>

            {pagedClasses.length === 0 ? (
              <div className="px-6 py-14 text-center text-slate-500">
                <UserGroupIcon className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                Không có lớp học phù hợp bộ lọc.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pagedClasses.map((cls) => {
                  const teacherId = String(toTeacherId(cls));
                  const teacherName =
                    teacherMap.get(teacherId) || "Chưa phân công";
                  const progress = toProgress(cls.studentCount);
                  const isOpen = cls.isActive !== false;

                  return (
                    <Link
                      key={cls.id}
                      to={`/classes/${cls.id}`}
                      className="grid grid-cols-1 gap-3 px-6 py-5 transition hover:bg-blue-50/35 md:grid-cols-12 md:items-center"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <BookOpenIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {cls.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            CODE:{" "}
                            {cls.code ||
                              `CLASS-${String(cls.id).slice(0, 6).toUpperCase()}`}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-3 flex items-center gap-2 text-sm text-slate-700">
                        <UserCircleIcon className="h-5 w-5 text-slate-400" />
                        <span>{teacherName}</span>
                      </div>

                      <div className="col-span-2">
                        <p className="text-sm font-medium text-slate-800">
                          {safeNumber(cls.studentCount)} / {CAPACITY}
                        </p>
                        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <p className="col-span-2 text-sm text-slate-500">
                        {formatDate(cls.createdAt)}
                      </p>

                      <div className="col-span-1 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                            isOpen
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isOpen ? "Đang mở" : "Đã đóng"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 text-xs text-slate-600">
              <p>
                Hiển thị {(page - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(page * PAGE_SIZE, filteredClasses.length)} của{" "}
                {filteredClasses.length} lớp học
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-blue-600 px-3 font-bold text-white">
                  {page}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-7 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <div className="mb-8 flex flex-col justify-between gap-4 rounded-[2rem] border border-blue-100 bg-white p-6 md:flex-row md:items-end md:p-8">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Học kỳ II - 2026
                </span>
                <h1 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                  Lớp học của tôi
                </h1>
              </div>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="soft-input min-w-[240px]"
                  placeholder="Tìm lớp học của bạn"
                />
                <button
                  onClick={handleTeacherCreate}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/25 transition hover:scale-[1.01]"
                >
                  <PlusIcon className="h-5 w-5" />
                  Thêm lớp mới
                </button>
              </div>
            </div>

            {teacherClasses.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                <AcademicCapIcon className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                Chưa có lớp học nào phù hợp.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {teacherClasses.map((cls, index) => {
                  const progress = toProgress(cls.studentCount);
                  const colorSets = [
                    "bg-blue-50 text-blue-700",
                    "bg-orange-50 text-orange-700",
                    "bg-emerald-50 text-emerald-700",
                    "bg-indigo-50 text-indigo-700",
                  ];
                  const tone = colorSets[index % colorSets.length];

                  return (
                    <article
                      key={cls.id}
                      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/10"
                    >
                      <div className="absolute right-4 top-4 text-slate-300">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </div>

                      <div className="mb-5 flex items-center justify-between">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${tone}`}
                        >
                          Khối {cls.gradeLevel}
                        </span>
                        <AcademicCapIcon className="h-6 w-6 text-slate-300 group-hover:text-blue-300" />
                      </div>

                      <h3 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-slate-900">
                        {cls.name}
                      </h3>

                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <UserGroupIcon className="h-4 w-4" />
                        {safeNumber(cls.studentCount)} học sinh
                      </p>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">
                            Tiến độ giáo trình
                          </span>
                          <span className="text-blue-700">{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Lịch học tiếp theo
                        </p>
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
                          {getDemoSchedule(index)}
                        </p>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Link
                          to={`/classes/${cls.id}`}
                          className="flex-1 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:opacity-95"
                        >
                          Vào lớp
                        </Link>
                        <Link
                          to={`/classes/${cls.id}`}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-xl font-bold text-slate-900">
                  Thông báo mới
                </h2>
                <MegaphoneIcon className="h-5 w-5 text-blue-600" />
              </div>

              <div className="space-y-3">
                {announcements.slice(0, 3).map((ann) => (
                  <article
                    key={ann.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">
                      {ann.isGlobal ? "Hệ thống" : "Cập nhật"}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      {ann.title}
                    </h3>
                    <p className="mt-1 max-h-10 overflow-hidden text-xs text-slate-600">
                      {ann.content}
                    </p>
                  </article>
                ))}

                {announcements.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có thông báo mới.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-6">
              <div className="mb-5 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                <h2 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-xl font-bold text-slate-900">
                  Lịch dạy hôm nay
                </h2>
              </div>
              <div className="space-y-4">
                {teacherClasses.slice(0, 3).map((cls, index) => (
                  <div key={cls.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          index === 0 ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      />
                      {index < 2 && (
                        <span className="mt-1 h-8 w-px bg-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        {index === 0 ? "Đang diễn ra" : `Ca ${index + 1}`}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {cls.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {getDemoSchedule(index)}
                      </p>
                    </div>
                  </div>
                ))}

                {teacherClasses.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Không có lịch dạy hôm nay.
                  </p>
                )}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
              <div className="relative">
                <h3 className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-lg font-bold">
                  Công cụ giảng dạy nhanh
                </h3>
                <p className="mt-2 text-sm text-blue-100">
                  Truy cập lịch, tài liệu và lớp học chỉ với một thao tác.
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-blue-700">
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                    Mở công cụ
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white">
                    <CheckCircleIcon className="h-4 w-4" />
                    Xem checklist
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default ClassesPage;
