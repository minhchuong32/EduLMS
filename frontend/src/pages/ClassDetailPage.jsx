import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { classApi, userApi, announcementApi } from "../services/api";
import { toast } from "react-toastify";
import {
  UserPlusIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

export default function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [search, setSearch] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    gradeLevel: "10",
    academicYear: "2024-2025",
    description: "",
    teacherId: "",
  });
  const [editingClass, setEditingClass] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  const role = user?.role;
  const isAdmin = role === "admin";

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([classApi.getById(id), announcementApi.getAll({ classId: id })])
      .then(([classRes, annRes]) => {
        setCls(classRes.data);
        setStudents(classRes.data.students || []);
        setAnnouncements(annRes.data);
      })
      .catch((err) => {
        setError(
          err.response?.status === 403
            ? "Bạn không có quyền truy cập lớp học này"
            : "Không thể tải thông tin lớp học",
        );
      })
      .finally(() => setLoading(false));

    if (role !== "student") {
      userApi
        .getAll({ role: "student", limit: 200 })
        .then((r) => setAllStudents(r.data.data || []));
    }

    if (role === "admin") {
      userApi
        .getAll({ role: "teacher", limit: 100 })
        .then((r) => setTeachers(r.data.data || []))
        .catch(() => {
          toast.error("Không tải được danh sách giáo viên");
        });
    }
  }, [id, role]);

  useEffect(() => {
    if (!cls) return;

    setEditForm({
      name: cls.name || "",
      gradeLevel: cls.gradeLevel || "10",
      academicYear: cls.academicYear || "2024-2025",
      description: cls.description || "",
      teacherId:
        cls.homeroomTeacherId || cls.homeroomteacherid || teachers[0]?.id || "",
    });
  }, [cls, teachers]);

  const handleUpdateClass = async (e) => {
    e.preventDefault();

    if (!editForm.teacherId) {
      toast.error("Vui lòng chọn giáo viên đảm nhiệm");
      return;
    }

    setEditingClass(true);
    try {
      await classApi.update(id, editForm);
      const { data } = await classApi.getById(id);
      setCls(data);
      setStudents(data.students || []);
      setShowEditModal(false);
      toast.success("Đã cập nhật lớp học");
    } catch (err) {
      toast.error(err.response?.data?.error || "Cập nhật lớp học thất bại");
    } finally {
      setEditingClass(false);
    }
  };

  const handleDeleteClass = async () => {
    if (
      !window.confirm("Xóa lớp học này? Toàn bộ khóa học của lớp sẽ bị ẩn.")
    ) {
      return;
    }

    try {
      await classApi.delete(id);
      toast.success("Đã xóa lớp học");
      navigate("/classes");
    } catch (err) {
      toast.error(err.response?.data?.error || "Xóa lớp học thất bại");
    }
  };

  const handleAdd = async () => {
    if (!selectedStudent) return;
    try {
      await classApi.addStudent(id, selectedStudent);
      const { data } = await classApi.getById(id);
      setStudents(data.students);
      setSelectedStudent("");
      setShowAddSheet(false);
      toast.success("Thêm học sinh thành công");
    } catch (err) {
      toast.error(err.response?.data?.error || "Lỗi");
    }
  };

  const handleRemove = async (studentId) => {
    if (!window.confirm("Xóa học sinh khỏi lớp?")) return;
    try {
      await classApi.removeStudent(id, studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      toast.success("Đã xóa");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể xóa học sinh");
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setSubmittingAnnouncement(true);
    try {
      const { data } = await announcementApi.create({
        classId: id,
        title: announcementForm.title,
        content: announcementForm.content,
      });
      setAnnouncements((prev) => [data, ...prev]);
      setAnnouncementForm({ title: "", content: "" });
      setShowAnnouncementModal(false);
      toast.success("Đã thêm thông báo lớp học");
    } catch (err) {
      toast.error(err.response?.data?.error || "Thêm thông báo thất bại");
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcement) => {
    if (!window.confirm("Xóa thông báo này?")) return;
    try {
      await announcementApi.delete(announcement.id);
      setAnnouncements((prev) =>
        prev.filter((item) => item.id !== announcement.id),
      );
      toast.success("Đã xóa thông báo");
    } catch (err) {
      toast.error(err.response?.data?.error || "Xóa thông báo thất bại");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!cls)
    return (
      <div className="p-6 text-center text-gray-500">
        Không tìm thấy lớp học
      </div>
    );

  const enrolled = new Set(students.map((s) => s.id));
  const available = allStudents.filter((s) => !enrolled.has(s.id));
  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Lớp {cls.name}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Khối {cls.gradeLevel} • {cls.academicYear} • {students.length} học
              sinh
            </p>
          </div>
          {/* Nút thêm học sinh — admin và giáo viên */}
          {role !== "student" && (
            <button
              onClick={() => setShowAddSheet(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 flex-shrink-0"
            >
              <UserPlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm học sinh</span>
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-800">Quản trị lớp học</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sửa thông tin lớp hoặc xóa lớp nếu cần dọn dữ liệu.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Sửa lớp
              </button>
              <button
                onClick={handleDeleteClass}
                className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-50"
              >
                <TrashIcon className="w-4 h-4" />
                Xóa lớp
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-gray-800">Thông báo lớp học</h2>
          {role !== "student" && (
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 flex-shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm thông báo</span>
            </button>
          )}
        </div>

        {announcements.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">
            Chưa có thông báo nào
          </p>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {ann.title}
                  </h3>
                  {role !== "student" && (
                    <button
                      onClick={() => handleDeleteAnnouncement(ann)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0 -mt-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">
                  {ann.content}
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  {ann.authorName} •{" "}
                  {new Date(ann.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danh sách học sinh */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-bold text-gray-800">Danh sách học sinh</h2>
          {/* Search nhỏ */}
          {students.length > 5 && (
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm học sinh..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            {students.length === 0
              ? "Chưa có học sinh nào"
              : "Không tìm thấy học sinh"}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filteredStudents.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                  {s.fullName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {s.fullName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
                {role !== "student" && (
                  <button
                    onClick={() => handleRemove(s.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet thêm học sinh */}
      {showAddSheet && role !== "student" && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Thêm học sinh vào lớp</h3>
              <button
                onClick={() => setShowAddSheet(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {available.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                Không có học sinh nào để thêm
              </p>
            ) : (
              <>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email})
                    </option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={handleAdd}
                    disabled={!selectedStudent}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <UserPlusIcon className="w-4 h-4" /> Thêm vào lớp
                  </button>
                  <button
                    onClick={() => setShowAddSheet(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAnnouncementModal && role !== "student" && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">
                Thêm thông báo lớp học
              </h3>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <input
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                required
                placeholder="Tiêu đề thông báo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={announcementForm.content}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                required
                rows={5}
                placeholder="Nội dung thông báo..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {submittingAnnouncement ? "Đang đăng..." : "Đăng thông báo"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && isAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Sửa lớp học</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateClass} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Giáo viên đảm nhiệm *
                </label>
                <select
                  value={editForm.teacherId}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      teacherId: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên lớp *
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Khối lớp
                  </label>
                  <select
                    value={editForm.gradeLevel}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        gradeLevel: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {["10", "11", "12"].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Năm học
                  </label>
                  <input
                    value={editForm.academicYear}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        academicYear: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={editingClass}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {editingClass ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
