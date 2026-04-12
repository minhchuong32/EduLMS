import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { classApi, userApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  PlusIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

export function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gradeLevel: "10",
    academicYear: "2024-2025",
    description: "",
    teacherId: "",
  });
  const { user } = useAuth();

  useEffect(() => {
    classApi
      .getAll()
      .then((r) => setClasses(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;

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
  }, [user?.role]);

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
      setClasses((prev) => [...prev, data]);
      setShowForm(false);
      toast.success("Tạo lớp học thành công!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Lớp học</h1>
        {user.role === "admin" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Tạo lớp mới</span>
            <span className="sm:hidden">Tạo</span>
          </button>
        )}
      </div>

      {/* Form tạo lớp — bottom sheet trên mobile */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Tạo lớp học mới</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {optionsLoading ? (
                <div className="py-4 text-center text-sm text-gray-400">
                  Đang tải giáo viên...
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Giáo viên đảm nhiệm *
                  </label>
                  <select
                    value={form.teacherId}
                    onChange={(e) =>
                      setForm({ ...form, teacherId: e.target.value })
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
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên lớp *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="VD: 10A1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Khối lớp
                  </label>
                  <select
                    value={form.gradeLevel}
                    onChange={(e) =>
                      setForm({ ...form, gradeLevel: e.target.value })
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
                    value={form.academicYear}
                    onChange={(e) =>
                      setForm({ ...form, academicYear: e.target.value })
                    }
                    required
                    placeholder="2024-2025"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={optionsLoading || !form.teacherId}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Tạo lớp
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid lớp học */}
      {classes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <UserGroupIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Chưa có lớp học nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              to={`/classes/${cls.id}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md active:scale-[0.97] transition-all"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
                <span className="text-white font-bold text-base md:text-lg">
                  {cls.gradeLevel}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">
                {cls.name}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{cls.academicYear}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <UserGroupIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{cls.studentCount} HS</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClassesPage;
