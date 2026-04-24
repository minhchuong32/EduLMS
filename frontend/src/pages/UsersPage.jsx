import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  UserGroupIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  UserIcon,
  FunnelIcon,
  CheckBadgeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS = {
  admin: "Quản trị",
  teacher: "Giáo viên",
  student: "Học sinh",
};
const ROLE_COLORS = {
  admin: "bg-slate-100 text-slate-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-emerald-100 text-emerald-700",
};

const emptyCreateForm = {
  fullName: "",
  email: "",
  role: "student",
  password: "School@123",
};
const PAGE_SIZE = 7;

const roleOptions = [
  { value: "", label: "Tất cả vai trò" },
  { value: "admin", label: "Quản trị" },
  { value: "teacher", label: "Giáo viên" },
  { value: "student", label: "Học sinh" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("vi-VN");
};

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

  const pageStats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const locked = users.length - active;
    const admins = users.filter((u) => u.role === "admin").length;
    const teachers = users.filter((u) => u.role === "teacher").length;
    const students = users.filter((u) => u.role === "student").length;

    return { active, locked, admins, teachers, students };
  }, [users]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 md:px-6">
      <section className="hero-card mb-5 overflow-hidden p-5 md:p-7">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
              <ShieldCheckIcon className="h-4 w-4" />
              Admin Console
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Quản lý người dùng
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
              Kiểm soát tài khoản hệ thống, phân quyền nhanh và theo dõi trạng
              thái hoạt động theo thời gian thực.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Tổng tài khoản
              </p>
              <p className="mt-1 text-xl font-bold text-white">{total}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Đang hoạt động
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {pageStats.active}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Giáo viên
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {pageStats.teachers}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
                Học sinh
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {pageStats.students}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="grid grid-cols-12 gap-5">
        <section className="col-span-12 space-y-4 lg:col-span-9">
          <div className="panel-card p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo họ tên hoặc email..."
                  className="soft-input pl-9"
                />
              </div>

              <div className="flex w-full items-center gap-2 md:w-auto">
                <div className="relative w-full md:w-56">
                  <FunnelIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setPage(1);
                    }}
                    className="soft-select pl-9"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="soft-button-primary whitespace-nowrap"
                >
                  <PlusIcon className="h-4 w-4" />
                  Tạo tài khoản
                </button>
              </div>
            </div>
          </div>

          <div className="panel-card overflow-hidden">
            <div className="border-b border-slate-200/70 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900 md:text-lg">
                    Danh sách tài khoản
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Hiển thị {rangeStart}-{rangeEnd} trên tổng {total} tài khoản
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Trang {page}/{totalPages}
                </div>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px]">
                <thead className="bg-surface-container-low border-b border-slate-200/70">
                  <tr>
                    {[
                      "Tên",
                      "Email",
                      "Vai trò",
                      "Trạng thái",
                      "Ngày tạo",
                      "Thao tác",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="bg-white/70 transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {u.fullName?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {u.fullName}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {u.id?.slice?.(0, 8) || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {u.email}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[u.role]}`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                        >
                          {u.isActive ? (
                            <CheckBadgeIcon className="h-3.5 w-3.5" />
                          ) : (
                            <LockClosedIcon className="h-3.5 w-3.5" />
                          )}
                          {u.isActive ? "Hoạt động" : "Bị khóa"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleActive(u.id, u.isActive)}
                            className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${u.isActive ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                          >
                            {u.isActive ? "Khóa" : "Kích hoạt"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(u.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={isSelf(u.id)}
                            onClick={() => setDeleteTarget(u)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-40"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-4 md:hidden">
              {users.map((u) => (
                <div key={u.id} className="section-card p-3">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {u.fullName?.[0] || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {u.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {u.email}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span
                      className={`${u.isActive ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {u.isActive ? "Hoạt động" : "Bị khóa"}
                    </span>
                    <span className="text-slate-500">
                      {formatDate(u.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(u.id, u.isActive)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${u.isActive ? "border-rose-200 text-rose-700" : "border-emerald-200 text-emerald-700"}`}
                    >
                      {u.isActive ? "Khóa" : "Kích hoạt"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(u.id)}
                      className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={isSelf(u.id)}
                      onClick={() => setDeleteTarget(u)}
                      className="rounded-xl border border-rose-200 px-2 py-2 text-xs font-semibold text-rose-700 disabled:pointer-events-none disabled:opacity-40"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                Đang tải dữ liệu...
              </div>
            )}

            {!loading && users.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Không tìm thấy người dùng phù hợp bộ lọc hiện tại.
              </div>
            )}

            {!loading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Hiển thị{" "}
                  <span className="font-semibold text-slate-700">
                    {rangeStart}
                  </span>
                  -
                  <span className="font-semibold text-slate-700">
                    {rangeEnd}
                  </span>{" "}
                  trên{" "}
                  <span className="font-semibold text-slate-700">{total}</span>
                </p>
                <div className="flex items-center justify-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Trước
                  </button>
                  <span className="px-2 text-sm font-semibold text-slate-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Sau
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="col-span-12 flex flex-col gap-4 lg:col-span-3">
          <section className="panel-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
              Phân bổ vai trò (trang hiện tại)
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Admin
                </p>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {pageStats.admins}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase text-blue-500">
                  Teacher
                </p>
                <p className="mt-1 text-lg font-bold text-blue-700">
                  {pageStats.teachers}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase text-emerald-500">
                  Student
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-700">
                  {pageStats.students}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500"
                style={{
                  width: `${total > 0 ? Math.max(8, Math.round((users.length / total) * 100)) : 8}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Mức hiển thị dữ liệu:{" "}
              {total > 0 ? Math.round((users.length / total) * 100) : 0}%
            </p>
          </section>

          <section className="panel-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
              Trạng thái hệ thống
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <UserGroupIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold">Đang hoạt động</span>
                </div>
                <span className="text-sm font-bold text-emerald-700">
                  {pageStats.active}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2">
                <div className="flex items-center gap-2 text-rose-700">
                  <LockClosedIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold">Bị khóa</span>
                </div>
                <span className="text-sm font-bold text-rose-700">
                  {pageStats.locked}
                </span>
              </div>
            </div>
          </section>

          <section className="panel-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
              Hướng dẫn nhanh
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <AcademicCapIcon className="mt-0.5 h-4 w-4 text-blue-600" />
                Ưu tiên tài khoản giáo viên có email trường để dễ quản trị lớp.
              </li>
              <li className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <UserIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                Dùng tìm kiếm + lọc vai trò trước khi chỉnh sửa hàng loạt.
              </li>
            </ul>
          </section>
        </aside>
      </main>

      {/* Modal tạo tài khoản */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Tạo tài khoản mới
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
              >
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Họ tên *
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  required
                  className="soft-input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="soft-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Vai trò
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="soft-select"
                  >
                    <option value="student">Học sinh</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="admin">Quản trị</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="soft-input"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1.5">
                <button type="submit" className="soft-button-primary flex-1">
                  Tạo tài khoản
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="soft-button-secondary flex-1"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Chỉnh sửa tài khoản
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
              >
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            {editLoading && (
              <div className="py-12 text-center text-sm text-slate-500">
                Đang tải...
              </div>
            )}
            {!editLoading && editForm && (
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Họ tên *
                  </label>
                  <input
                    value={editForm.fullName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullName: e.target.value })
                    }
                    required
                    className="soft-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    required
                    className="soft-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Số điện thoại
                  </label>
                  <input
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="soft-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Vai trò
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm({ ...editForm, role: e.target.value })
                      }
                      className="soft-select"
                    >
                      <option value="student">Học sinh</option>
                      <option value="teacher">Giáo viên</option>
                      <option value="admin">Quản trị</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                      className="soft-select"
                    >
                      <option value="1">Hoạt động</option>
                      <option value="0">Bị khóa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="soft-input"
                  />
                </div>
                <div className="flex gap-3 pt-1.5">
                  <button type="submit" className="soft-button-primary flex-1">
                    Lưu thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="soft-button-secondary flex-1"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="mb-2 font-bold text-slate-900">Xóa tài khoản?</h3>
            <p className="mb-4 text-sm text-slate-600">
              Xóa vĩnh viễn{" "}
              <span className="font-medium text-slate-800">
                {deleteTarget.fullName}
              </span>{" "}
              ({deleteTarget.email}). Thao tác không hoàn tác nếu hệ thống cho
              phép xóa.
            </p>
            <div className="flex gap-3">
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
