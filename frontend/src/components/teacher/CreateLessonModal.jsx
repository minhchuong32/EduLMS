import React, { useState } from "react";
import { lessonApi } from "../../services/api";
import { toast } from "react-toastify";
import { XMarkIcon, PaperClipIcon } from "@heroicons/react/24/outline";

export default function CreateLessonModal({ courseId, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    videoUrl: "",
    orderIndex: 0,
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await lessonApi.create({
        courseEnrollmentId: courseId,
        ...form,
        file,
      });
      toast.success("Tạo bài giảng thành công!");
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Bottom sheet on mobile, centered modal on desktop */
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base md:text-lg font-bold text-gray-800">
            Tạo bài giảng mới
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Tiêu đề */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tiêu đề *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Nhập tiêu đề bài giảng..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nội dung bài giảng
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              placeholder="Nội dung bài học..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Link video */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Link video (YouTube/Vimeo)
            </label>
            <input
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://youtube.com/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tài liệu + thứ tự: 2 cols trên desktop, stacked trên mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tài liệu đính kèm
              </label>
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
                <PaperClipIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate">
                  {file ? file.name : "Chọn file PDF, Word, PPT..."}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3"
                />
              </label>
            </div>
            <div className="sm:w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Thứ tự
              </label>
              <input
                type="number"
                min="0"
                value={form.orderIndex}
                onChange={(e) =>
                  setForm({ ...form, orderIndex: parseInt(e.target.value) })
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo bài giảng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
