import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { classApi, courseApi, subjectApi, userApi } from "../services/api";
import { toast } from "react-toastify";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  BookOpenIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

const EMPTY_FORM = {
  teacherId: "",
  subjectId: "",
  classId: "",
  semester: "",
  academicYear: "2024-2025",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [keyword, setKeyword] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      try {
        const { data } = await courseApi.getAll();
        setCourses(data);
      } catch (err) {
        toast.error(
          err.response?.data?.error || "Không tải được danh sách khóa học",
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [subjectRes, classRes, teacherRes] = await Promise.all([
          subjectApi.getAll(),
          classApi.getAll(),
          userApi.getAll({ role: "teacher", limit: 100 }),
        ]);
        setSubjects(subjectRes.data);
        setClasses(classRes.data);
        setTeachers(teacherRes.data.data || []);
      } catch (err) {
        toast.error(
          err.response?.data?.error || "Không tải được dữ liệu cấu hình",
        );
      } finally {
        setOptionsLoading(false);
      }
    };

    loadOptions();
  }, [isAdmin]);

  const title =
    user.role === "student"
      ? "Môn học của tôi"
      : user.role === "teacher"
        ? "Môn học đang dạy"
        : "Tất cả khóa học";

  const semesterOptions = useMemo(() => {
    const options = new Set();
    courses.forEach((course) => {
      if (course.semester) options.add(course.semester);
    });
    return Array.from(options);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return courses.filter((course) => {
      const matchKeyword =
        !q ||
        `${course.subjectCode || ""} ${course.subjectName || ""} ${course.className || ""} ${course.teacherName || ""}`
          .toLowerCase()
          .includes(q);
      const matchSemester =
        !semesterFilter || (course.semester || "") === semesterFilter;
      return matchKeyword && matchSemester;
    });
  }, [courses, keyword, semesterFilter]);

  const stats = useMemo(() => {
    const totalLessons = filteredCourses.reduce(
      (sum, c) => sum + (Number(c.lessonCount) || 0),
      0,
    );
    const totalAssignments = filteredCourses.reduce(
      (sum, c) => sum + (Number(c.assignmentCount) || 0),
      0,
    );
    const teachersSet = new Set(
      filteredCourses.map((c) => c.teacherName).filter(Boolean),
    );
    const activeCourses = filteredCourses.filter(
      (c) =>
        (Number(c.lessonCount) || 0) + (Number(c.assignmentCount) || 0) > 0,
    ).length;

    return {
      total: filteredCourses.length,
      totalLessons,
      totalAssignments,
      teacherCount: teachersSet.size,
      activeCourses,
    };
  }, [filteredCourses]);

  const coveragePercent =
    courses.length > 0
      ? Math.round((filteredCourses.length / courses.length) * 100)
      : 0;

  const refreshCourses = async () => {
    const { data } = await courseApi.getAll();
    setCourses(data);
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingCourseId(null);
    setForm({
      teacherId: teachers[0]?.id || "",
      subjectId: subjects[0]?.id || "",
      classId: classes[0]?.id || "",
      semester: "",
      academicYear: "2024-2025",
    });
    setShowForm(true);
  };

  const openEdit = (course) => {
    setFormMode("edit");
    setEditingCourseId(course.id);
    setForm({
      teacherId: course.teacherId || "",
      subjectId: course.subjectId || "",
      classId: course.classId || "",
      semester: course.semester || "",
      academicYear: course.academicYear || "2024-2025",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCourseId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        teacherId: form.teacherId,
        subjectId: form.subjectId,
        classId: form.classId,
        semester: form.semester,
        academicYear: form.academicYear,
      };

      if (formMode === "create") {
        await courseApi.create(payload);
        toast.success("Tạo khóa học thành công!");
      } else {
        await courseApi.update(editingCourseId, payload);
        toast.success("Đã cập nhật khóa học");
      }

      closeForm();
      await refreshCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await courseApi.delete(deleteTarget.id);
      toast.success("Đã xóa khóa học");
      setDeleteTarget(null);
      await refreshCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể xóa khóa học");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 md:px-6">
      <section className="hero-card mb-5 overflow-hidden p-5 md:p-7">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
              <AcademicCapIcon className="h-4 w-4" />
              Course Studio
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
              Tổ chức môn học theo lớp, giáo viên và học kỳ. Theo dõi mức độ
              triển khai nội dung ngay trong một bảng điều khiển tập trung.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Khóa học
              </p>
              <p className="mt-1 text-xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Bài giảng
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {stats.totalLessons}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Bài tập
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {stats.totalAssignments}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Giáo viên
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {stats.teacherCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="grid grid-cols-12 gap-5">
        <section className="col-span-12 space-y-4 lg:col-span-9">
          <div className="panel-card p-4 md:p-5">
            <div className="mb-4">
              <div className="mb-2 flex items-end justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.13em] text-primary">
                  Coverage {coveragePercent}%
                </p>
                <p className="text-xs text-slate-500">
                  {filteredCourses.length}/{courses.length} khóa học hiển thị
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-cyan-400"
                  style={{ width: `${Math.max(5, coveragePercent)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo mã môn, tên môn, lớp hoặc giáo viên..."
                  className="soft-input pl-9"
                />
              </div>
              <div className="flex w-full items-center gap-2 md:w-auto">
                <div className="relative w-full md:w-52">
                  <AdjustmentsHorizontalIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="soft-select pl-9"
                  >
                    <option value="">Tất cả học kỳ</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="soft-button-primary whitespace-nowrap"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Thêm khóa học
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="section-card py-16 text-center">
              <BookOpenIcon className="mx-auto mb-3 h-14 w-14 text-slate-300" />
              <p className="text-slate-500">Không có khóa học nào phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredCourses.map((course, i) => (
                <div
                  key={course.id}
                  className="section-card group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className={`${COLORS[i % COLORS.length]} h-1.5`} />
                  <div className="p-4 md:p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <Link
                        to={`/courses/${course.id}`}
                        className="min-w-0 flex-1"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {course.subjectCode}
                        </span>
                        <h3 className="truncate text-base font-extrabold text-slate-800 transition-colors group-hover:text-primary">
                          {course.subjectName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Lớp {course.className}
                        </p>
                      </Link>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${COLORS[i % COLORS.length]} text-sm font-bold text-white`}
                      >
                        {course.subjectName?.[0] || "?"}
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(course.teacherName || "Teacher")}&size=24&background=1558db&color=fff`}
                        alt="teacher"
                        className="h-5 w-5 rounded-full"
                      />
                      <span className="truncate">
                        {course.teacherName || "Chưa gán giáo viên"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-700">
                        <p className="font-semibold">Bài giảng</p>
                        <p className="mt-0.5 text-sm font-bold">
                          {course.lessonCount || 0}
                        </p>
                      </div>
                      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-indigo-700">
                        <p className="font-semibold">Bài tập</p>
                        <p className="mt-0.5 text-sm font-bold">
                          {course.assignmentCount || 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {course.semester || "Chưa đặt học kỳ"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {course.academicYear || "Năm học chưa rõ"}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openEdit(course)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(course)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="col-span-12 flex flex-col gap-4 lg:col-span-3">
          <section className="panel-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
              Course Map
            </h3>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {filteredCourses.slice(0, 20).map((course, index) => {
                const rich =
                  (Number(course.lessonCount) || 0) +
                    (Number(course.assignmentCount) || 0) >
                  0;
                return (
                  <div
                    key={course.id}
                    className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center ${
                      rich
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                    title={course.subjectName}
                  >
                    {index + 1}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Có nội dung học tập
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
                Chưa có nội dung
              </p>
            </div>
          </section>

          <section className="panel-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
              Quick Reference
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Ưu tiên hoàn thiện các khóa học có số bài giảng thấp để cải thiện
              tiến độ triển khai chương trình theo học kỳ.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-blue-700">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <CheckCircleIcon className="h-4 w-4" />
                  Đang hoạt động
                </span>
                <span className="text-sm font-bold">{stats.activeCourses}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-indigo-700">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <UserGroupIcon className="h-4 w-4" />
                  Giáo viên phụ trách
                </span>
                <span className="text-sm font-bold">{stats.teacherCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-cyan-50 px-3 py-2 text-cyan-700">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <ChartBarSquareIcon className="h-4 w-4" />
                  Tổng nội dung
                </span>
                <span className="text-sm font-bold">
                  {stats.totalLessons + stats.totalAssignments}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </main>

      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  {formMode === "create" ? "Thêm khóa học" : "Sửa khóa học"}
                </h2>
                <p className="text-sm text-slate-500">
                  {formMode === "create"
                    ? "Tạo một khóa học mới cho giáo viên và lớp học"
                    : "Cập nhật thông tin khóa học hiện tại"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {optionsLoading ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Đang tải dữ liệu cấu hình...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Giáo viên
                      </label>
                      <select
                        value={form.teacherId}
                        onChange={(e) =>
                          setForm({ ...form, teacherId: e.target.value })
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
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Môn học
                      </label>
                      <select
                        value={form.subjectId}
                        onChange={(e) =>
                          setForm({ ...form, subjectId: e.target.value })
                        }
                        required
                        className="soft-select"
                      >
                        <option value="">Chọn môn học</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Lớp học
                      </label>
                      <select
                        value={form.classId}
                        onChange={(e) =>
                          setForm({ ...form, classId: e.target.value })
                        }
                        required
                        className="soft-select"
                      >
                        <option value="">Chọn lớp học</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} - Khối {cls.gradeLevel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Học kỳ
                      </label>
                      <input
                        value={form.semester}
                        onChange={(e) =>
                          setForm({ ...form, semester: e.target.value })
                        }
                        placeholder="VD: Học kỳ 1"
                        className="soft-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Năm học
                    </label>
                    <input
                      value={form.academicYear}
                      onChange={(e) =>
                        setForm({ ...form, academicYear: e.target.value })
                      }
                      required
                      placeholder="2024-2025"
                      className="soft-input"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="soft-button-primary flex-1 disabled:opacity-50"
                    >
                      {submitting
                        ? "Đang lưu..."
                        : formMode === "create"
                          ? "Tạo khóa học"
                          : "Cập nhật khóa học"}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="soft-button-secondary flex-1"
                    >
                      Hủy
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {deleteTarget && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="mb-2 font-bold text-slate-900">Xóa khóa học</h2>
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa khóa học {deleteTarget.subjectName} - lớp{" "}
              {deleteTarget.className}?
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Khóa học sẽ được ẩn khỏi danh sách nhưng dữ liệu bài giảng và bài
              tập liên quan vẫn được giữ lại.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="soft-button-secondary flex-1"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="soft-button flex-1 bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
