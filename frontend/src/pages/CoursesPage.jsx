import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { classApi, courseApi, subjectApi, userApi } from "../services/api";
import { toast } from "react-toastify";
import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {title}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {courses.length} môn học
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm khóa học</span>
              <span className="sm:hidden">Thêm</span>
            </button>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <BookOpenIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có môn học nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {courses.map((course, i) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className={`${COLORS[i % COLORS.length]} h-1.5`} />
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Link to={`/courses/${course.id}`} className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {course.subjectCode}
                    </span>
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors leading-snug truncate">
                      {course.subjectName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Lớp {course.className}
                    </p>
                  </Link>
                  <div
                    className={`w-9 h-9 md:w-10 md:h-10 ${COLORS[i % COLORS.length]} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white font-bold text-sm">
                      {course.subjectName?.[0] || "?"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(course.teacherName)}&size=24&background=3b82f6&color=fff`}
                    alt="teacher"
                    className="w-5 h-5 rounded-full flex-shrink-0"
                  />
                  <span className="text-xs text-gray-500 truncate">
                    {course.teacherName}
                  </span>
                </div>

                <div className="flex gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpenIcon className="w-3.5 h-3.5" />
                    {course.lessonCount} bài giảng
                  </span>
                  <span className="flex items-center gap-1">
                    <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                    {course.assignmentCount} bài tập
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openEdit(course)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(course)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-red-600 text-xs font-medium hover:bg-red-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">
                  {formMode === "create" ? "Thêm khóa học" : "Sửa khóa học"}
                </h2>
                <p className="text-sm text-gray-500">
                  {formMode === "create"
                    ? "Tạo một khóa học mới cho giáo viên và lớp học"
                    : "Cập nhật thông tin khóa học hiện tại"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {optionsLoading ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  Đang tải dữ liệu cấu hình...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Giáo viên
                      </label>
                      <select
                        value={form.teacherId}
                        onChange={(e) =>
                          setForm({ ...form, teacherId: e.target.value })
                        }
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Môn học
                      </label>
                      <select
                        value={form.subjectId}
                        onChange={(e) =>
                          setForm({ ...form, subjectId: e.target.value })
                        }
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Lớp học
                      </label>
                      <select
                        value={form.classId}
                        onChange={(e) =>
                          setForm({ ...form, classId: e.target.value })
                        }
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Học kỳ
                      </label>
                      <input
                        value={form.semester}
                        onChange={(e) =>
                          setForm({ ...form, semester: e.target.value })
                        }
                        placeholder="VD: Học kỳ 1"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Năm học
                    </label>
                    <input
                      value={form.academicYear}
                      onChange={(e) =>
                        setForm({ ...form, academicYear: e.target.value })
                      }
                      required
                      placeholder="2024-2025"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
                      className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5">
            <h2 className="font-bold text-gray-900 mb-2">Xóa khóa học</h2>
            <p className="text-sm text-gray-600">
              Bạn có chắc muốn xóa khóa học {deleteTarget.subjectName} - lớp{" "}
              {deleteTarget.className}?
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Khóa học sẽ được ẩn khỏi danh sách nhưng dữ liệu bài giảng và bài
              tập liên quan vẫn được giữ lại.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
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
