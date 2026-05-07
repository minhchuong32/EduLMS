import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { submissionApi, assignmentApi } from "../services/api";
import { toast } from "react-toastify";
import { CheckCircleIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { getFileUrl } from "../services/runtimeUrl";

export default function GradingPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: "", feedback: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false); // mobile: toggle list ↔ detail

  useEffect(() => {
    let alive = true;

    Promise.all([assignmentApi.getById(id), submissionApi.getByAssignment(id)])
      .then(([a, s]) => {
        setAssignment(a.data);
        setSubmissions(s.data);
      })
      .catch((err) => {
        toast.error(
          err.response?.data?.error || "Không thể tải dữ liệu chấm điểm",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const loadDetail = async (subId) => {
    const { data } = await submissionApi.getDetail(subId);
    setDetail(data);
    setSelected(subId);
    setGradeForm({ score: data.score ?? "", feedback: data.feedback ?? "" });
    setShowDetail(true);
  };

  const handleGrade = async () => {
    setSaving(true);
    try {
      await submissionApi.grade(selected, {
        score: parseFloat(gradeForm.score),
        feedback: gradeForm.feedback,
      });
      toast.success("Chấm điểm thành công!");
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected
            ? { ...s, score: parseFloat(gradeForm.score), status: "graded" }
            : s,
        ),
      );
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const STATUS_LABELS = {
    submitted: "Đã nộp",
    graded: "Đã chấm",
    late: "Nộp trễ",
    in_progress: "Đang làm",
  };
  const STATUS_COLORS = {
    submitted: "bg-blue-100 text-blue-700",
    graded: "bg-green-100 text-green-700",
    late: "bg-red-100 text-red-600",
    in_progress: "bg-gray-100 text-gray-600",
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      {!showDetail && (
        <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-0.5 truncate">
          {`Bài nộp: ${assignment?.title}`}
        </h1>
      )}
      {showDetail && (
        <button
          onClick={() => setShowDetail(false)}
          className="md:hidden flex items-center gap-1 text-blue-600 text-sm font-semibold mb-1"
        >
          <ChevronLeftIcon className="w-4 h-4" /> Danh sách bài nộp
        </button>
      )}
      {showDetail && (
        <h1 className="hidden md:block text-lg md:text-xl font-bold text-gray-900 mb-0.5 truncate">
          {`Bài nộp: ${assignment?.title}`}
        </h1>
      )}
      <p className="text-gray-500 text-sm mb-4">
        {submissions.length} học sinh đã nộp
      </p>

      <div className="md:flex md:gap-6">
        {/* Submission list — hidden on mobile when detail is open */}
        <div
          className={`${showDetail ? "hidden md:block" : "block"} md:w-72 md:flex-shrink-0`}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {submissions.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">
                Chưa có bài nộp nào
              </p>
            ) : (
              submissions.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => loadDetail(sub.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors
                    ${selected === sub.id ? "bg-blue-50" : ""}`}
                >
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {sub.studentName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {sub.studentName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[sub.status]}`}
                      >
                        {STATUS_LABELS[sub.status]}
                      </span>
                      {sub.score != null && (
                        <span className="text-xs text-green-600 font-medium">
                          {sub.score}đ
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronLeftIcon className="w-4 h-4 text-gray-300 rotate-180 md:hidden" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div
          className={`${!showDetail ? "hidden md:block" : "block"} flex-1 mt-3 md:mt-0`}
        >
          {!detail ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-48">
              <p className="text-gray-400 text-sm">
                Chọn bài nộp để xem chi tiết
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">
                    {detail.studentName}
                  </h3>
                  {detail.submittedAt && (
                    <p className="text-xs text-gray-400">
                      Nộp:{" "}
                      {format(new Date(detail.submittedAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[detail.status]}`}
                >
                  {STATUS_LABELS[detail.status]}
                </span>
              </div>

              {detail.essayContent && (
                <div className="mb-5 p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Bài làm:
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {detail.essayContent}
                  </p>
                </div>
              )}

              {detail.fileUrl && (
                <a
                  href={getFileUrl(detail.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4"
                >
                  📎 Tải file bài nộp
                </a>
              )}

              {detail.answers?.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Câu trả lời (
                    {detail.answers.filter((a) => a.isCorrect).length}/
                    {detail.answers.length} đúng):
                  </p>
                  <div className="space-y-2">
                    {detail.answers.map((ans, i) => (
                      <div
                        key={ans.id}
                        className={`p-3 rounded-xl text-sm ${ans.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                      >
                        <p className="font-medium text-gray-800 mb-0.5 text-xs">
                          Câu {i + 1}: {ans.questionText}
                        </p>
                        <p
                          className={`text-xs ${ans.isCorrect ? "text-green-700" : "text-red-600"}`}
                        >
                          {ans.isCorrect ? "✓" : "✗"} {ans.pointsEarned}/
                          {ans.questionPoints} điểm
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.assignmentType !== "quiz" && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="font-medium text-gray-700">Chấm điểm</h4>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 whitespace-nowrap">
                      Điểm (tối đa {detail.totalPoints})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={detail.totalPoints}
                      step="0.5"
                      value={gradeForm.score}
                      onChange={(e) =>
                        setGradeForm({ ...gradeForm, score: e.target.value })
                      }
                      className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <textarea
                    value={gradeForm.feedback}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, feedback: e.target.value })
                    }
                    rows={3}
                    placeholder="Nhận xét cho học sinh..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleGrade}
                    disabled={saving || !gradeForm.score}
                    className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    {saving ? "Đang lưu..." : "Lưu điểm"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
