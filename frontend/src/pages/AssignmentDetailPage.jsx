import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assignmentApi, submissionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ClockIcon, DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

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
  const [starting, setStarting] = useState(false);

  const [loaded, setLoaded] = useState(false); //  chống gọi lại

  //  load data (tách riêng + memo)
  const loadData = useCallback(async () => {
    if (!user || loaded) return;

    try {
      setLoading(true);

      const assignmentRes = await assignmentApi.getById(id);
      setAssignment(assignmentRes.data);

      if (user.role === 'student') {
        const submissionRes = await submissionApi.getMy(id);
        setMySubmissions(submissionRes.data);
      }

      setLoaded(true); //  chỉ load 1 lần
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id, user, loaded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  //  start quiz (chống spam)
  const handleStartQuiz = async () => {
    if (starting) return;

    try {
      setStarting(true);
      await submissionApi.start(id);
      navigate(`/assignments/${id}/quiz`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể bắt đầu bài thi');
    } finally {
      setStarting(false);
    }
  };

  //  submit essay
  const handleSubmitEssay = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      const sub = await submissionApi.start(id);
      await submissionApi.submitEssay(sub.data.id, { essayContent, file });

      toast.success('Nộp bài thành công!');

      // reload submissions
      const r = await submissionApi.getMy(id);
      setMySubmissions(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= UI =================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!assignment) {
    return <div className="p-6 text-center text-gray-500">Không tìm thấy bài tập</div>;
  }

  const isSubmitted = mySubmissions.some(s => s.status !== 'in_progress');
  const canSubmit = !isSubmitted || mySubmissions.length < assignment.maxAttempts;
  const isPastDue = assignment.dueDate && new Date() > new Date(assignment.dueDate);

  const TYPE_LABELS = { quiz: 'Trắc nghiệm', essay: 'Tự luận', file: 'Nộp file' };
  const TYPE_COLORS = {
    quiz: 'bg-purple-100 text-purple-700',
    essay: 'bg-blue-100 text-blue-700',
    file: 'bg-green-100 text-green-700',
  };

  return (
    <div className="max-w-3xl mx-auto p-3 md:p-6">

      {/* Info */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6 mb-4">
        <div className="flex justify-between mb-3">
          <div>
            <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[assignment.type]}`}>
              {TYPE_LABELS[assignment.type]}
            </span>
            <h1 className="text-xl font-bold mt-2">{assignment.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{assignment.totalPoints}</p>
          </div>
        </div>

        {assignment.description && (
          <p className="text-gray-600 text-sm mb-3">{assignment.description}</p>
        )}

        <div className="text-sm text-gray-500 space-y-1">
          {assignment.dueDate && (
            <p>Hạn: {format(new Date(assignment.dueDate), 'dd/MM/yyyy HH:mm')}</p>
          )}
          <p>Số lần làm: {assignment.maxAttempts}</p>
        </div>
      </div>

      {/* Student */}
      {user?.role === 'student' && (
        <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6 mb-4">
          <h2 className="font-bold mb-4">Bài làm của tôi</h2>

          {mySubmissions.map(sub => (
            <div key={sub.id} className="border p-3 rounded mb-2">
              <p className="text-sm">Trạng thái: {sub.status}</p>
              {sub.score != null && <p>Điểm: {sub.score}</p>}
            </div>
          ))}

          {canSubmit && !isPastDue && (
            <>
              {assignment.type === 'quiz' && (
                <button
                  onClick={handleStartQuiz}
                  disabled={starting}
                  className="bg-purple-600 text-white px-4 py-2 rounded mt-3"
                >
                  {starting ? 'Đang xử lý...' : 'Bắt đầu làm bài'}
                </button>
              )}

              {(assignment.type === 'essay' || assignment.type === 'file') && (
                <form onSubmit={handleSubmitEssay} className="space-y-3 mt-3">
                  {assignment.type === 'essay' && (
                    <textarea
                      value={essayContent}
                      onChange={e => setEssayContent(e.target.value)}
                      className="w-full border p-2 rounded"
                    />
                  )}

                  <input type="file" onChange={e => setFile(e.target.files[0])} />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    {submitting ? 'Đang nộp...' : 'Nộp bài'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {/* Teacher */}
      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <Link to={`/assignments/${id}/submissions`}>
          Xem bài nộp →
        </Link>
      )}
    </div>
  );
}