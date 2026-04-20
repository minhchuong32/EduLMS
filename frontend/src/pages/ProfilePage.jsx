import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { userApi, authApi } from "../services/api";
import { toast } from "react-toastify";

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
  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone || "",
    address: user.address || "",
  });
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userApi.updateProfile(form);
      updateUser(data);
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

  return (
    <div className="page-shell max-w-4xl">
      <div className="page-heading">
        <h1 className="page-title">Hồ sơ cá nhân</h1>
        <p className="page-subtitle">
          Cập nhật thông tin cơ bản và đổi mật khẩu trong cùng một chỗ.
        </p>
      </div>

      {/* Avatar + info */}
      <div className="panel-card p-4 md:p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-2xl font-extrabold text-white shadow-lg shadow-blue-500/20">
            {user.fullName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 truncate">
              {user.fullName}
            </h2>
            <p className="text-slate-500 text-sm truncate">{user.email}</p>
            <span
              className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[user.role]}`}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-card overflow-hidden">
        <div className="flex border-b border-slate-200/80 bg-white/70">
          {["Thông tin", "Đổi mật khẩu"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2
                ${activeTab === i ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 0 && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Họ tên
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  className="soft-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Số điện thoại
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912 345 678"
                  className="soft-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Địa chỉ
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Địa chỉ của bạn"
                  className="soft-input"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="soft-button-primary w-full md:w-auto px-6 py-3 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          )}

          {activeTab === 1 && (
            <form onSubmit={handleChangePwd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                  placeholder="Tối thiểu 8 ký tự"
                  className="soft-input"
                />
              </div>
              <button
                type="submit"
                className="soft-button-primary w-full md:w-auto px-6 py-3"
              >
                Đổi mật khẩu
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
