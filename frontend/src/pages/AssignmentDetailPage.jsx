import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assignmentApi, submissionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ClockIcon, DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [essayContent, setEssayContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [aRes] = await Promise.all([
        assignmentApi.getById(id),
        user.role === 'student'
          ? submissionApi.getMy(id).then(r => setMySubmissions(r.data)).catch(() => {})
          : Promise.resolve(),
      ]);
      setAssignment(aRes.data);
      setLoading(false);
    };
    load();
  }, [id, user.role]);

  const handleStartQuiz = async () => {
    try {
      await submissionApi.start(id);
      navigate(`/assignments/${id}/quiz`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể bắt đầu bài thi');
    }
  };

  const handleSubmitEssay = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const sub = await submissionApi.start(id);
      await submissionApi.submitEssay(sub.data.id, { essayContent, file });
      toast.success('Nộp bài thành công!');
      const r = await submissionApi.getMy(id);
      setMySubmissions(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
  if (!assignment) return <div className="p-6 text-center text-gray-500">Không tìm thấy bài tập</div>;

  const isSubmitted = mySubmissions.some(s => s.status !== 'in_progress');
  const canSubmit   = !isSubmitted || mySubmissions.length < assignment.maxAttempts;
  const isPastDue   = assignment.dueDate && new Date() > new Date(assignment.dueDate);

  const TYPE_LABELS = { quiz: 'Trắc nghiệm', essay: 'Tự luận', file: 'Nộp file' };
  const TYPE_COLORS = {
    quiz: 'bg-purple-100 text-purple-700',
    essay: 'bg-blue-100 text-blue-700',
    file: 'bg-green-100 text-green-700',
  };

  return (
    <div className="max-w-3xl mx-auto p-3 md:p-6">

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[assignment.type]}`}>
                {TYPE_LABELS[assignment.type]}
              </span>
              {isPastDue && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Đã hết hạn</span>
              )}
            </div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-snug">{assignment.title}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-2xl md:text-3xl text-blue-600">{assignment.totalPoints}</p>
            <p className="text-xs text-gray-400">điểm</p>
          </div>
        </div>

        {assignment.description && (
          <p className="text-gray-600 text-sm mb-4 whitespace-pre-wrap">{assignment.description}</p>
        )}

        {/* Meta info: 2 cols on mobile, flexible on desktop */}
        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm text-gray-500">
          {assignment.dueDate && (
            <div className="flex items-start gap-1.5">
              <ClockIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Hạn: {format(new Date(assignment.dueDate), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          )}
          {assignment.timeLimitMinutes && (
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 flex-shrink-0" />
              <span>{assignment.timeLimitMinutes} phút</span>
            </div>
          )}
          {assignment.type === 'quiz' && assignment.questionCount > 0 && (
            <div>📝 {assignment.questionCount} câu hỏi</div>
          )}
          <div>🔄 Số lần làm: {assignment.maxAttempts}</div>
        </div>
      </div>

      {/* Student submission */}
      {user.role === 'student' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-4">Bài làm của tôi</h2>

          {mySubmissions.filter(s => s.status !== 'in_progress').map(sub => (
            <div key={sub.id}
              className={`p-4 rounded-xl border mb-3 ${sub.status === 'graded' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${sub.status === 'graded' ? 'bg-green-100 text-green-700' :
                      sub.status === 'late' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                    {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'late' ? 'Nộp trễ' : 'Đã nộp'}
                  </span>
                  {sub.submittedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(sub.submittedAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  )}
                </div>
                {sub.score != null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{sub.score}</p>
                    <p className="text-xs text-gray-400">/ {assignment.totalPoints}</p>
                  </div>
                )}
              </div>
              {sub.feedback && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Nhận xét:</p>
                  <p className="text-sm text-gray-700">{sub.feedback}</p>
                </div>
              )}
            </div>
          ))}

          {canSubmit && !isPastDue && (
            <>
              {assignment.type === 'quiz' && (
                <button onClick={handleStartQuiz}
                  className="flex items-center justify-center gap-2 w-full md:w-auto bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 active:bg-purple-800">
                  Bắt đầu làm bài <ArrowRightIcon className="w-4 h-4" />
                </button>
              )}
              {(assignment.type === 'essay' || assignment.type === 'file') && (
                <form onSubmit={handleSubmitEssay} className="space-y-3">
                  {assignment.type === 'essay' && (
                    <textarea value={essayContent} onChange={e => setEssayContent(e.target.value)}
                      placeholder="Nhập bài làm của bạn..." rows={6}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500 truncate">{file ? file.name : 'Tải file lên (tùy chọn)'}</span>
                    <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                  </label>
                  <button type="submit" disabled={submitting}
                    className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
                    {submitting ? 'Đang nộp...' : 'Nộp bài'}
                  </button>
                </form>
              )}
            </>
          )}
          {isPastDue && !isSubmitted && <p className="text-red-500 text-sm mt-2">Đã hết hạn nộp bài</p>}
          {!canSubmit && isSubmitted && <p className="text-gray-500 text-sm mt-2">Đã dùng hết số lần làm bài</p>}
        </div>
      )}

      {/* Teacher link */}
      {(user.role === 'teacher' || user.role === 'admin') && (
        <Link to={`/assignments/${id}/submissions`}
          className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 hover:border-blue-200 hover:shadow-md transition-all active:bg-gray-50">
          <div>
            <p className="font-semibold text-gray-800">Xem bài nộp của học sinh</p>
            <p className="text-sm text-gray-500">Chấm điểm và phản hồi</p>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </Link>
      )}
    </div>
  );
}