import React, { useEffect, useState } from "react";
import { announcementApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const { user } = useAuth();

  useEffect(() => {
    announcementApi
      .getAll()
      .then((r) => setAnnouncements(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await announcementApi.create({
        ...form,
        isGlobal: user.role === "admin",
      });
      setAnnouncements((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ title: "", content: "" });
      toast.success("Đăng tin thành công!");
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa tin này?")) return;
    await announcementApi.delete(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    toast.success("Đã xóa");
  };

  const canPost = user.role === "teacher" || user.role === "admin";

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Bảng tin
        </h1>
        {canPost && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-800"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng tin</span>
            <span className="sm:hidden">Đăng</span>
          </button>
        )}
      </div>

      {/* Form tạo tin — bottom sheet trên mobile */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Tin mới</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Tiêu đề tin"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                placeholder="Nội dung tin..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Đăng
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

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400">Chưa có bài đăng nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-800 text-sm md:text-base leading-snug">
                      {ann.title}
                    </h3>
                    {(ann.authorId === user.id || user.role === "admin") && (
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0 -mt-0.5"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {ann.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {ann.authorName?.[0]}
                    </div>
                    <span className="text-xs text-gray-400">
                      {ann.authorName} •{" "}
                      {format(
                        new Date(ann.createdAt),
                        "dd/MM/yyyy 'lúc' HH:mm",
                        { locale: vi },
                      )}
                    </span>
                    {ann.isGlobal && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                        Toàn trường
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnnouncementsPage;
