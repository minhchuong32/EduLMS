import React, { useState } from 'react';
import { assignmentApi } from '../../services/api';
import { toast } from 'react-toastify';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

export default function CreateAssignmentModal({ courseId, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', description: '', type: 'quiz',
    dueDate: '', startDate: '', timeLimitMinutes: '', totalPoints: 10,
    maxAttempts: 1, shuffleQuestions: false, showResultImmediately: true,
  });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);
  const removeQuestion = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));

  const updateQuestion = (qi, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi, oi, field, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q;
      const options = q.options.map((opt, j) => {
        if (field === 'isCorrect' && q.questionType === 'single_choice') {
          return { ...opt, isCorrect: j === oi ? value : false };
        }
        return j === oi ? { ...opt, [field]: value } : opt;
      });
      return { ...q, options };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        courseEnrollmentId: courseId,
        ...form,
        timeLimitMinutes: form.timeLimitMinutes ? parseInt(form.timeLimitMinutes) : null,
        dueDate: form.dueDate || null,
        startDate: form.startDate || null,
        questions: form.type === 'quiz' ? questions : undefined,
      };
      const { data } = await assignmentApi.create(payload);
      toast.success('Tạo bài tập thành công!');
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Tạo bài tập mới</h2>
          <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại bài tập *</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="quiz">Trắc nghiệm</option>
              <option value="essay">Tự luận</option>
              <option value="file">Nộp file</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày bắt đầu</label>
              <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hạn nộp</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Điểm tối đa</label>
              <input type="number" min="0" max="100" step="0.5" value={form.totalPoints}
                onChange={e => setForm({ ...form, totalPoints: parseFloat(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Số lần làm</label>
              <input type="number" min="1" max="99" value={form.maxAttempts}
                onChange={e => setForm({ ...form, maxAttempts: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {form.type === 'quiz' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Thời gian (phút)</label>
                <input type="number" min="1" value={form.timeLimitMinutes}
                  onChange={e => setForm({ ...form, timeLimitMinutes: e.target.value })}
                  placeholder="Không giới hạn"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          {form.type === 'quiz' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.shuffleQuestions}
                  onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })}
                  className="rounded text-blue-600" />
                Xáo trộn câu hỏi
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.showResultImmediately}
                  onChange={e => setForm({ ...form, showResultImmediately: e.target.checked })}
                  className="rounded text-blue-600" />
                Hiện kết quả ngay
              </label>
            </div>
          )}

          {/* Questions Builder */}
          {form.type === 'quiz' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Câu hỏi ({questions.length})</h3>
                <button type="button" onClick={addQuestion}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <PlusIcon className="w-4 h-4" /> Thêm câu hỏi
                </button>
              </div>
              <div className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{qi + 1}</span>
                      <div className="flex-1">
                        <textarea value={q.questionText} onChange={e => updateQuestion(qi, 'questionText', e.target.value)}
                          placeholder="Nội dung câu hỏi..." rows={2} required
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
                        <div className="flex gap-3">
                          <select value={q.questionType} onChange={e => updateQuestion(qi, 'questionType', e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="single_choice">Một đáp án</option>
                            <option value="multiple_choice">Nhiều đáp án</option>
                            <option value="true_false">Đúng/Sai</option>
                          </select>
                          <input type="number" min="0.5" step="0.5" value={q.points}
                            onChange={e => updateQuestion(qi, 'points', parseFloat(e.target.value))}
                            className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                            placeholder="Điểm" />
                        </div>
                      </div>
                      {questions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600 p-1">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Options */}
                    <div className="ml-10 space-y-2">
                      {q.questionType === 'true_false' ? (
                        ['Đúng', 'Sai'].map((opt, oi) => (
                          <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name={`q${qi}`} checked={q.options[oi]?.isCorrect}
                              onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                              className="text-blue-600" />
                            <span>{opt}</span>
                          </label>
                        ))
                      ) : (
                        q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            {q.questionType === 'single_choice' ? (
                              <input type="radio" name={`q${qi}`} checked={opt.isCorrect}
                                onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                                className="text-blue-600 flex-shrink-0" />
                            ) : (
                              <input type="checkbox" checked={opt.isCorrect}
                                onChange={e => updateOption(qi, oi, 'isCorrect', e.target.checked)}
                                className="rounded text-blue-600 flex-shrink-0" />
                            )}
                            <input value={opt.optionText} onChange={e => updateOption(qi, oi, 'optionText', e.target.value)}
                              placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`} required
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo bài tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
