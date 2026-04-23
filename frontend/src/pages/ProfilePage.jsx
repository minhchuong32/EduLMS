import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userApi, authApi } from "../services/api";
import { toast } from "react-toastify";
import {
  CameraIcon,
  CheckBadgeIcon,
  AcademicCapIcon,
  ChartBarSquareIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

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

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestingDelete, setRequestingDelete] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const FILE_BASE_URL = (
    process.env.REACT_APP_API_URL || "http://localhost:5000/api"
  ).replace(/\/api\/?$/, "");

  useEffect(() => {
    setForm({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const initials = useMemo(() => {
    const name = user?.fullName || "U";
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
  }, [user?.fullName]);

  const avatarSrc = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) return `${FILE_BASE_URL}${user.avatar}`;
    return "";
  }, [FILE_BASE_URL, avatarPreview, user?.avatar]);

  const handlePickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }

    setAvatarFile(file);
  };

  const resetProfileForm = () => {
    setForm({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
    setAvatarFile(null);
    toast.info("Đã hoàn tác thay đổi chưa lưu");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = { ...form };
      if (avatarFile) payload.avatar = avatarFile;

      const { data } = await userApi.updateProfile(payload);
      updateUser(data);
      setAvatarFile(null);
      toast.success("Cập nhật thành công!");
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();

    try {
      await authApi.changePassword(pwdForm);
      toast.success("Đổi mật khẩu thành công!");
      setPwdForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra");
    }
  };

  const handleRequestDelete = async () => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn gửi yêu cầu xóa tài khoản đến quản trị viên không?",
    );
    if (!confirmed) return;

    setRequestingDelete(true);
    try {
      const { data } = await userApi.requestDeleteAccount();
      toast.success(data?.message || "Đã gửi yêu cầu đến quản trị viên");
      navigate("/announcements");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể gửi yêu cầu");
    } finally {
      setRequestingDelete(false);
    }
  };

  return (
    <div className="page-shell max-w-7xl">
      <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-100 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-6 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.8)] md:p-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-4 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="h-24 w-24 rounded-full border-4 border-white/20 object-cover md:h-28 md:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-2xl font-extrabold md:h-28 md:w-28">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={handlePickAvatar}
                className="absolute -bottom-1 -right-1 rounded-full bg-blue-500 p-2 text-white shadow-lg shadow-blue-500/40 transition hover:scale-105"
              >
                <CameraIcon className="h-4 w-4" />
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {user?.fullName || "Người dùng"}
              </h1>
              <p className="mt-1 text-sm text-blue-100 md:text-base">
                {user?.email}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[user?.role]} bg-white/90`}
                >
                  {ROLE_LABELS[user?.role] || "Thành viên"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
                  <CheckBadgeIcon className="h-4 w-4" />
                  Tài khoản đã xác minh
                </span>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-3 lg:w-[360px]">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-blue-100">
                Vai trò
              </p>
              <p className="mt-1 text-lg font-bold">
                {ROLE_LABELS[user?.role]}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-blue-100">
                Trạng thái
              </p>
              <p className="mt-1 text-lg font-bold">Đang hoạt động</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-blue-100">
                Bảo mật
              </p>
              <p className="mt-1 text-lg font-bold">Đang bật</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section className="panel-card p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Thông tin cá nhân
              </h2>
              <button
                type="button"
                onClick={resetProfileForm}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Đặt lại
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Họ và tên
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  className="soft-input"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  className="soft-input cursor-not-allowed opacity-80"
                  disabled
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Số điện thoại
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912 345 678"
                  className="soft-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Vai trò
                </label>
                <input
                  value={ROLE_LABELS[user?.role] || "Thành viên"}
                  className="soft-input cursor-not-allowed opacity-80"
                  disabled
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Địa chỉ
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  rows={3}
                  placeholder="Địa chỉ của bạn"
                  className="soft-input resize-none"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>

                {avatarFile && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Ảnh mới: {avatarFile.name}
                  </span>
                )}
              </div>
            </form>
          </section>

          <section className="panel-card p-6 md:p-8">
            <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-slate-900">
              Tài khoản và bảo mật
            </h2>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                  <DocumentTextIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Địa chỉ email</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleChangePwd}
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={pwdForm.currentPassword}
                  onChange={(e) =>
                    setPwdForm({ ...pwdForm, currentPassword: e.target.value })
                  }
                  required
                  className="soft-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={pwdForm.newPassword}
                  onChange={(e) =>
                    setPwdForm({ ...pwdForm, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="soft-input"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <LockClosedIcon className="h-4 w-4" />
                  Đổi mật khẩu
                </button>

                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                  Mật khẩu tối thiểu 8 ký tự
                </span>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-7 text-white shadow-[0_28px_70px_-35px_rgba(37,99,235,0.7)]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
              Phân tích học tập
            </h3>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-extrabold">248</p>
                <p className="text-xs text-blue-100">Giờ học đã hoàn thành</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">12</p>
                <p className="text-xs text-blue-100">Thành tích</p>
              </div>
            </div>

            <div className="mt-7 border-t border-white/20 pt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Tiến độ học tập</span>
                <span className="font-bold">85%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[85%] rounded-full bg-white" />
              </div>
            </div>
          </section>

          <section className="panel-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900">
                Chứng chỉ
              </h3>
              <AcademicCapIcon className="h-6 w-6 text-slate-400" />
            </div>

            <div className="space-y-5">
              {[
                "Advanced Neural Networks",
                "Ethics in Artificial Intelligence",
              ].map((item, idx) => (
                <div key={item} className="group cursor-pointer">
                  <div className="relative mb-2 h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                      <ChartBarSquareIcon className="h-8 w-8 transition group-hover:scale-110" />
                    </div>
                    <div className="absolute inset-0 bg-slate-900/0 transition group-hover:bg-slate-900/25" />
                  </div>
                  <p className="line-clamp-1 font-bold text-slate-800">
                    {item}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cấp ngày {idx === 0 ? "10/2023" : "07/2023"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-red-100 bg-red-50/70 p-6">
            <div className="mb-3 inline-flex rounded-xl bg-red-100 p-2 text-red-700">
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-extrabold text-red-900">
              Xóa tài khoản
            </h3>
            <p className="mt-2 text-sm text-red-700">
              Hành động này là vĩnh viễn và sẽ xóa mọi lịch sử học tập của bạn.
            </p>
            <button
              type="button"
              onClick={handleRequestDelete}
              disabled={requestingDelete}
              className="mt-5 w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestingDelete
                ? "Đang gửi yêu cầu..."
                : "Yêu cầu xóa tài khoản"}
            </button>
          </section>
        </aside>
      </div>

      <div className="h-14 md:hidden" />
    </div>
  );
}

export default ProfilePage;
