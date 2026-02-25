import React, { useState } from 'react';
import { lessonApi } from '../../services/api';
import { toast } from 'react-toastify';
import { XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline';

export default function CreateLessonModal({ courseId, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', content: '', videoUrl: '', orderIndex: 0 });
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
      toast.success('Tạo bài giảng thành công!');
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Tạo bài giảng mới</h2>
          <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung bài giảng</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6}
              placeholder="Nội dung bài học..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link video (YouTube/Vimeo)</label>
            <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://youtube.com/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tài liệu đính kèm</label>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
              <PaperClipIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">{file ? file.name : 'Chọn file PDF, Word, PowerPoint...'}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Thứ tự</label>
            <input type="number" min="0" value={form.orderIndex} onChange={e => setForm({ ...form, orderIndex: parseInt(e.target.value) })}
              className="w-24 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo bài giảng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
