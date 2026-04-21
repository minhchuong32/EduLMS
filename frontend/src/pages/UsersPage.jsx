import React, { useCallback, useEffect, useState } from "react";
import { userApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS = {
  admin: "Quản trị",
  teacher: "Giáo viên",
  student: "Học sinh",
};
const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-green-100 text-green-700",
};

const emptyCreateForm = {
  fullName: "",
  email: "",
  role: "student",
  password: "School@123",
};
const PAGE_SIZE = 7;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [editId, setEditId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadUsers = useCallback(
    async (pageNum) => {
      const p = pageNum !== undefined && pageNum !== null ? pageNum : page;
      setLoading(true);
      try {
        const { data } = await userApi.getAll({
          search,
          role,
          page: p,
          limit: PAGE_SIZE,
        });
        setUsers(data.data);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    },
    [search, role, page],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await userApi.create(form);
      setShowModal(false);
      setForm(emptyCreateForm);
      toast.success("Tạo tài khoản thành công!");
      if (page !== 1) setPage(1);
      else await loadUsers(1);
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra !!!");
    }
  };

  const toggleActive = async (userId, isActive) => {
    try {
      await userApi.update(userId, { isActive: !isActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !isActive } : u)),
      );
      toast.success("Đã cập nhật trạng thái");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể cập nhật trạng thái");
    }
  };

  const openEdit = async (id) => {
    setEditId(id);
    setEditLoading(true);
    setEditForm(null);
    try {
      const { data } = await userApi.getById(id);
      setEditForm({
        fullName: data.fullName || "",
        email: data.email || "",
        role: data.role || "student",
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || "",
        gender: data.gender || "",
        address: data.address || "",
        isActive: !!data.isActive,
        password: "",
      });
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Không tải được thông tin người dùng",
      );
      setEditId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    setEditId(null);
    setEditForm(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editId || !editForm) return;
    try {
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email,
        role: editForm.role,
        phone: editForm.phone || null,
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender || null,
        address: editForm.address || null,
        isActive: editForm.isActive,
      };
      if (editForm.password?.trim())
        payload.password = editForm.password.trim();
      const { data } = await userApi.update(editId, payload);
      setUsers((prev) =>
        prev.map((u) => (u.id === editId ? { ...u, ...data } : u)),
      );
      closeEdit();
      toast.success("Đã cập nhật tài khoản");
    } catch (err) {
      toast.error(err.response?.data?.error || "Cập nhật thất bại");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Đã xóa tài khoản");
      const nextTotal = Math.max(0, total - 1);
      const maxPage = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      const nextPage = Math.min(page, maxPage);
      if (nextPage !== page) setPage(nextPage);
      else await loadUsers(nextPage);
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể xóa tài khoản");
    }
  };

  const isSelf = (id) => currentUser?.id === id;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + users.length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Người dùng
          </h1>
          <p className="text-gray-500 text-sm">
            {total} tài khoản
            {total > 0 && (
              <span className="text-gray-400">
                {" "}
                · Trang {page}/{totalPages}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo tài khoản</span>
          <span className="sm:hidden">Tạo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên, email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        >
          <option value="">Tất cả</option>
          <option value="admin">Quản trị</option>
          <option value="teacher">Giáo viên</option>
          <option value="student">Học sinh</option>
        </select>
      </div>

      <>
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  "Họ tên",
                  "Email",
                  "Vai trò",
                  "Trạng thái",
                  "Ngày tạo",
                  "Thao tác",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                        {u.fullName?.[0] || "?"}
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {u.fullName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    >
                      {u.isActive ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleActive(u.id, u.isActive)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors
                        ${u.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                      >
                        {u.isActive ? "Khóa" : "Kích hoạt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(u.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center gap-1"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={isSelf(u.id)}
                        onClick={() => setDeleteTarget(u)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 font-medium inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Đang tải...
            </div>
          )}
          {!loading && users.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Không tìm thấy người dùng
            </div>
          )}
        </div>

        <div className="md:hidden space-y-2">
          {loading && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Đang tải...
            </div>
          )}
          {!loading && users.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
              Không tìm thấy người dùng
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-gray-100 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                  {u.fullName?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {u.fullName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[u.role]}`}
                >
                  {ROLE_LABELS[u.role]}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    >
                      {u.isActive ? "Hoạt động" : "Bị khóa"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(u.id, u.isActive)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex-1 min-w-[5rem]
                    ${u.isActive ? "border-red-200 text-red-600" : "border-green-200 text-green-600"}`}
                  >
                    {u.isActive ? "Khóa" : "Kích hoạt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(u.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium flex-1 min-w-[5rem]"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={isSelf(u.id)}
                    onClick={() => setDeleteTarget(u)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-600 font-medium flex-1 min-w-[5rem] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-1">
            <p className="text-sm text-gray-500">
              Hiển thị{" "}
              <span className="font-medium text-gray-700">{rangeStart}</span>–
              <span className="font-medium text-gray-700">{rangeEnd}</span>
              {" / "}
              <span className="font-medium text-gray-700">{total}</span>
            </p>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Trước
              </button>
              <span className="text-sm text-gray-600 tabular-nums px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                Sau
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </>

      {/* Modal tạo tài khoản */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">
                Tạo tài khoản mới
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Họ tên *
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vai trò
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Học sinh</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="admin">Quản trị</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Tạo tài khoản
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sửa */}
      {editId && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">
                Chỉnh sửa tài khoản
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {editLoading && (
              <div className="py-12 text-center text-gray-400 text-sm">
                Đang tải...
              </div>
            )}
            {!editLoading && editForm && (
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Họ tên *
                  </label>
                  <input
                    value={editForm.fullName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullName: e.target.value })
                    }
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vai trò
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm({ ...editForm, role: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="student">Học sinh</option>
                      <option value="teacher">Giáo viên</option>
                      <option value="admin">Quản trị</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Trạng thái
                    </label>
                    <select
                      value={editForm.isActive ? "1" : "0"}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          isActive: e.target.value === "1",
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">Hoạt động</option>
                      <option value="0">Bị khóa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={editForm.password}
                    placeholder="Để trống nếu giữ nguyên"
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Xác nhận xóa */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-bold text-gray-900 mb-2">Xóa tài khoản?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Xóa vĩnh viễn{" "}
              <span className="font-medium text-gray-800">
                {deleteTarget.fullName}
              </span>{" "}
              ({deleteTarget.email}). Thao tác không hoàn tác nếu hệ thống cho
              phép xóa.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
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
