import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { toast } from "react-toastify";
import {
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Đăng nhập thành công!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen overflow-hidden flex items-center justify-center px-4 py-8 ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.22),_transparent_24%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(15,23,42,0.96))]"
            : "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.08),_transparent_24%),linear-gradient(180deg,_#f8fbff,_#eef4ff_55%,_#f8fafc)]"
        }`}
      />
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
        className={`absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur transition-all ${
          isDark
            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {isDark ? (
          <SunIcon className="h-4 w-4 text-amber-300" />
        ) : (
          <MoonIcon className="h-4 w-4 text-slate-600" />
        )}
        {isDark ? "Sáng" : "Tối"}
      </button>
      <div className="relative w-full max-w-md">
        <div
          className={`mb-4 flex items-center justify-center gap-3 ${
            isDark ? "text-white" : "text-slate-800"
          }`}
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-lg shadow-blue-500/25">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">EduLMS</p>
            <p
              className={`text-xs ${
                isDark ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Hệ thống quản lý học tập
            </p>
          </div>
        </div>

        <div
          className={`panel-card p-6 md:p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] ${
            isDark ? "border-white/10" : "border-slate-200/80"
          }`}
        >
          <div className="mb-6">
            <h1
              className={`text-2xl font-extrabold tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Đăng nhập
            </h1>
            <p
              className={`mt-1 text-sm leading-6 ${
                isDark ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Nhập email và mật khẩu để truy cập hệ thống.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`mb-1.5 block text-sm font-medium ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@school.edu.vn"
                required
                autoComplete="email"
                inputMode="email"
                className="soft-input"
              />
            </div>

            <div>
              <label
                className={`mb-1.5 block text-sm font-medium ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="soft-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className={`absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                    isDark
                      ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  }`}
                >
                  {showPwd ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="soft-button-primary w-full py-3.5"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div
            className={`mt-6 rounded-2xl border p-4 ${
              isDark
                ? "border-slate-700 bg-slate-900/70"
                : "border-slate-200/80 bg-slate-50/80"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Tài khoản demo
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                {
                  label: "Admin",
                  email: "admin@school.edu.vn",
                  pwd: "Admin@123",
                  style: "border-violet-200 text-violet-700 hover:bg-violet-50",
                },
                {
                  label: "Giáo viên",
                  email: "teacher.toan@school.edu.vn",
                  pwd: "Teacher@123",
                  style: "border-blue-200 text-blue-700 hover:bg-blue-50",
                },
                {
                  label: "Học sinh",
                  email: "student1@school.edu.vn",
                  pwd: "Student@123",
                  style:
                    "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() =>
                    setForm({ email: acc.email, password: acc.pwd })
                  }
                  className={`soft-button border ${acc.style} justify-center px-3 py-2.5 text-xs font-semibold ${
                    isDark ? "bg-slate-800/80" : "bg-white/90"
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p
          className={`mt-4 text-center text-xs ${
            isDark ? "text-white/45" : "text-slate-500"
          }`}
        >
          © 2025 EduLMS
        </p>
      </div>
    </div>
  );
}
