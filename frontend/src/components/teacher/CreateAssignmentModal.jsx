import React, { useState, useEffect } from 'react';
import { assignmentApi } from '../../services/api';
import { toast } from 'react-toastify';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyQuestion = () => ({
  questionText: '',
  questionType: 'single_choice',
  points: 1,
  explanation: '',
  options: [
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ],
});

const toFormData = (a) => ({
  title:                a.title || '',
  description:          a.description || '',
  type:                 a.type || 'quiz',
  dueDate:              a.dueDate   ? new Date(a.dueDate).toISOString().slice(0, 16)   : '',
  startDate:            a.startDate ? new Date(a.startDate).toISOString().slice(0, 16) : '',
  timeLimitMinutes:     a.timeLimitMinutes || '',
  totalPoints:          a.totalPoints ?? 10,
  maxAttempts:          a.maxAttempts || 1,
  shuffleQuestions:     a.shuffleQuestions || false,
  showResultImmediately: a.showResultImmediately ?? true,
});

const toQuestionsData = (questions = []) =>
  questions.length > 0
    ? questions.map(q => ({
        id:           q.id,
        questionText: q.questionText || '',
        questionType: q.questionType || 'single_choice',
        points:       q.points || 1,
        explanation:  q.explanation || '',
        options: (q.options || []).map(o => ({
          id:         o.id,
          optionText: o.optionText || '',
          isCorrect:  o.isCorrect  || false,
        })),
      }))
    : [emptyQuestion()];

// ── Component chính ───────────────────────────────────────────────────────────
export default function CreateAssignmentModal({
  courseId,
  onClose,
  onCreated,
  onUpdated,
  editData = null,   // null = tạo mới, object = chỉnh sửa
}) {
  const isEdit = !!editData;

  const [form, setForm]           = useState(isEdit ? toFormData(editData) : {
    title: '', description: '', type: 'quiz',
    dueDate: '', startDate: '', timeLimitMinutes: '', totalPoints: 10,
    maxAttempts: 1, shuffleQuestions: false, showResultImmediately: true,
  });
  const [questions, setQuestions] = useState(
    isEdit ? toQuestionsData(editData.questions) : [emptyQuestion()]
  );
  const [loading, setLoading]             = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Khi edit quiz: nếu chưa có questions thì fetch từ API
  useEffect(() => {
    if (!isEdit || editData.type !== 'quiz') return;
    if (editData.questions?.length > 0) return;

    setLoadingQuestions(true);
    assignmentApi.getById(editData.id)
      .then(({ data }) => {
        if (data.questions?.length) setQuestions(toQuestionsData(data.questions));
      })
      .catch(() => toast.error('Không tải được câu hỏi'))
      .finally(() => setLoadingQuestions(false));
  }, []);

  // ── Question handlers ───────────────────────────────────────────────────────
  const addQuestion = () =>
    setQuestions(prev => [...prev, emptyQuestion()]);

  const removeQuestion = (qi) =>
    setQuestions(prev => prev.filter((_, i) => i !== qi));

  const updateQuestion = (qi, field, value) =>
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));

  const updateOption = (qi, oi, field, value) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q;
      const options = q.options.map((opt, j) => {
        // Single choice: uncheck các option khác khi chọn 1
        if (field === 'isCorrect' && q.questionType === 'single_choice')
          return { ...opt, isCorrect: j === oi ? value : false };
        return j === oi ? { ...opt, [field]: value } : opt;
      });
      return { ...q, options };
    }));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        courseEnrollmentId: courseId,
        ...form,
        timeLimitMinutes: form.timeLimitMinutes ? parseInt(form.timeLimitMinutes) : null,
        dueDate:          form.dueDate   || null,
        startDate:        form.startDate || null,
        questions:        form.type === 'quiz' ? questions : undefined,
      };

      if (isEdit) {
        const { data } = await assignmentApi.update(editData.id, payload);
        onUpdated(data);
      } else {
        const { data } = await assignmentApi.create(payload);
        onCreated(data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {isEdit ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
            </h2>
            {isEdit && (
              <p className="text-xs text-gray-400 mt-0.5">
                Loại: {editData.type === 'quiz' ? 'Trắc nghiệm' : editData.type === 'essay' ? 'Tự luận' : 'Nộp file'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Tiêu đề */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required placeholder="Nhập tiêu đề bài tập..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="Mô tả nội dung bài tập..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Loại bài tập — disabled khi edit để tránh mất câu hỏi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Loại bài tập *
              {isEdit && <span className="ml-2 text-xs font-normal text-gray-400">(không thể thay đổi)</span>}
            </label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              disabled={isEdit}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="quiz">Trắc nghiệm</option>
              <option value="essay">Tự luận</option>
              <option value="file">Nộp file</option>
            </select>
          </div>

          {/* Ngày giờ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày bắt đầu</label>
              <input
                type="datetime-local" value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hạn nộp</label>
              <input
                type="datetime-local" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Điểm / Số lần / Thời gian */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Điểm tối đa</label>
              <input
                type="number" min="0" max="100" step="0.5" value={form.totalPoints}
                onChange={e => setForm({ ...form, totalPoints: parseFloat(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Số lần làm</label>
              <input
                type="number" min="1" max="99" value={form.maxAttempts}
                onChange={e => setForm({ ...form, maxAttempts: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {form.type === 'quiz' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Thời gian (phút)</label>
                <input
                  type="number" min="1" value={form.timeLimitMinutes}
                  onChange={e => setForm({ ...form, timeLimitMinutes: e.target.value })}
                  placeholder="Không giới hạn"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {/* Tùy chọn quiz */}
          {form.type === 'quiz' && (
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox" checked={form.shuffleQuestions}
                  onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })}
                  className="rounded text-purple-600"
                />
                Xáo trộn câu hỏi
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox" checked={form.showResultImmediately}
                  onChange={e => setForm({ ...form, showResultImmediately: e.target.checked })}
                  className="rounded text-purple-600"
                />
                Hiện kết quả ngay
              </label>
            </div>
          )}

          {/* ── Danh sách câu hỏi ── */}
          {form.type === 'quiz' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">
                  Câu hỏi
                  <span className="ml-2 text-sm font-normal text-gray-400">({questions.length} câu)</span>
                </h3>
                <button
                  type="button" onClick={addQuestion}
                  className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" /> Thêm câu hỏi
                </button>
              </div>

              {loadingQuestions ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, qi) => (
                    <div key={qi} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">

                      {/* Header câu hỏi */}
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {qi + 1}
                        </span>
                        <div className="flex-1">
                          <textarea
                            value={q.questionText}
                            onChange={e => updateQuestion(qi, 'questionText', e.target.value)}
                            placeholder="Nội dung câu hỏi..." rows={2} required
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 bg-white"
                          />
                          <div className="flex gap-3 flex-wrap">
                            <select
                              value={q.questionType}
                              onChange={e => updateQuestion(qi, 'questionType', e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            >
                              <option value="single_choice">Một đáp án</option>
                              <option value="multiple_choice">Nhiều đáp án</option>
                              <option value="true_false">Đúng/Sai</option>
                            </select>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min="0.5" step="0.5" value={q.points}
                                onChange={e => updateQuestion(qi, 'points', parseFloat(e.target.value))}
                                className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white"
                              />
                              <span className="text-xs text-gray-400">điểm</span>
                            </div>
                          </div>
                        </div>

                        {/* Nút xóa câu hỏi — chỉ hiện khi có > 1 câu */}
                        {questions.length > 1 && (
                          <button
                            type="button" onClick={() => removeQuestion(qi)}
                            title="Xóa câu hỏi này"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Đáp án */}
                      <div className="ml-10 space-y-2">
                        {q.questionType === 'true_false' ? (
                          ['Đúng', 'Sai'].map((label, oi) => (
                            <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio" name={`q${qi}_tf`}
                                checked={q.options[oi]?.isCorrect || false}
                                onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                                className="text-purple-600"
                              />
                              <span>{label}</span>
                            </label>
                          ))
                        ) : (
                          q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              {q.questionType === 'single_choice' ? (
                                <input
                                  type="radio" name={`q${qi}`}
                                  checked={opt.isCorrect}
                                  onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                                  className="text-purple-600 flex-shrink-0"
                                />
                              ) : (
                                <input
                                  type="checkbox" checked={opt.isCorrect}
                                  onChange={e => updateOption(qi, oi, 'isCorrect', e.target.checked)}
                                  className="rounded text-purple-600 flex-shrink-0"
                                />
                              )}
                              <input
                                value={opt.optionText}
                                onChange={e => updateOption(qi, oi, 'optionText', e.target.value)}
                                placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`} required
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                              />
                            </div>
                          ))
                        )}
                      </div>

                      {/* Giải thích */}
                      <div className="ml-10 mt-2">
                        <input
                          value={q.explanation}
                          onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                          placeholder="Giải thích đáp án (tuỳ chọn)..."
                          className="w-full border border-dashed border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit" disabled={loading}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors
                ${isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {loading
                ? (isEdit ? 'Đang lưu...' : 'Đang tạo...')
                : (isEdit ? 'Lưu thay đổi' : 'Tạo bài tập')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}