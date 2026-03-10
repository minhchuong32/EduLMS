import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl shadow-lg mb-3 md:mb-4">
            <AcademicCapIcon className="w-8 h-8 md:w-9 md:h-9 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            EduLMS
          </h1>
          <p className="text-gray-500 text-sm mt-1">Hệ thống quản lý học tập</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-5">
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-0 top-0 h-full px-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-3 text-center">
              Tài khoản demo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "Admin",
                  email: "admin@school.edu.vn",
                  pwd: "Admin@123",
                  color: "purple",
                },
                {
                  label: "Giáo viên",
                  email: "teacher.toan@school.edu.vn",
                  pwd: "Teacher@123",
                  color: "blue",
                },
                {
                  label: "Học sinh",
                  email: "student1@school.edu.vn",
                  pwd: "Student@123",
                  color: "green",
                },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() =>
                    setForm({ email: acc.email, password: acc.pwd })
                  }
                  className={`text-xs py-2.5 rounded-xl border font-medium transition-all active:scale-95
                    ${
                      acc.color === "purple"
                        ? "border-purple-200 text-purple-700 hover:bg-purple-50 active:bg-purple-100"
                        : acc.color === "blue"
                          ? "border-blue-200 text-blue-700 hover:bg-blue-50 active:bg-blue-100"
                          : "border-green-200 text-green-700 hover:bg-green-50 active:bg-green-100"
                    }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© 2025 EduLMS</p>
      </div>
    </div>
  );
}
