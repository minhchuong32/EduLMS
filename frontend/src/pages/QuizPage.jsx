import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assignmentApi, submissionApi } from "../services/api";
import { toast } from "react-toastify";
import {
  ClockIcon,
  CheckCircleIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

export default function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [assResult, subResult] = await Promise.all([
        assignmentApi.getById(id),
        submissionApi.start(id),
      ]);
      setAssignment(assResult.data);
      setSubmission(subResult.data);
      if (assResult.data.timeLimitMinutes) {
        const startTime = new Date(subResult.data.startedAt).getTime();
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = assResult.data.timeLimitMinutes * 60 - elapsed;
        setTimeLeft(Math.max(0, Math.floor(remaining)));
      }
      setLoading(false);
    };
    init().catch((err) => {
      toast.error(err.response?.data?.error || "Không thể bắt đầu bài thi");
      navigate(-1);
    });
  }, [id, navigate]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(
        ([questionId, selectedOptionIds]) => ({
          questionId,
          selectedOptionIds: Array.isArray(selectedOptionIds)
            ? selectedOptionIds
            : [selectedOptionIds],
        }),
      );
      const { data } = await submissionApi.submitQuiz(
        submission.id,
        formattedAnswers,
      );
      setResult(data);
      setSubmitted(true);
    } catch (err) {
      toast.error("Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [answers, submission, submitting]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, handleSubmit]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const selectOption = (questionId, optionId, questionType) => {
    setAnswers((prev) => {
      if (questionType === "multiple_choice") {
        const current = prev[questionId] || [];
        const updated = current.includes(optionId)
          ? current.filter((i) => i !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Nộp bài thành công!
          </h2>
          {result.score !== undefined ? (
            <>
              <p className="text-gray-500 mb-4">Kết quả bài làm</p>
              <div className="bg-blue-50 rounded-2xl p-6 mb-6">
                <p className="text-5xl font-bold text-blue-600">
                  {result.score}
                </p>
                <p className="text-gray-500 mt-1">
                  / {result.totalPoints} điểm
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {Math.round((result.score / result.totalPoints) * 100)}%
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-500 mb-6">Kết quả sẽ được công bố sau.</p>
          )}
          <button
            onClick={() => navigate(-2)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700"
          >
            Quay về
          </button>
        </div>
      </div>
    );
  }

  const questions = assignment?.questions || [];
  const question = questions[currentQ];
  const selectedForQ = answers[question?.id] || [];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-800 text-sm md:text-base truncate">
            {assignment?.title}
          </h1>
          <p className="text-xs text-gray-500">
            Câu {currentQ + 1}/{questions.length}
          </p>
        </div>
        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm ml-2
            ${timeLeft < 60 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
          >
            <ClockIcon className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Desktop: side-by-side | Mobile: stacked */}
      <div className="max-w-3xl mx-auto p-3.5 md:p-6 md:flex md:gap-6">
        {/* Desktop navigator */}
        <div className="hidden md:block w-44 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
            <p className="text-xs font-medium text-gray-500 mb-3">Câu hỏi</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${
                      i === currentQ
                        ? "bg-blue-600 text-white"
                        : answers[q.id]?.length > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-100 rounded" /> Đã làm (
                {answeredCount})
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gray-100 rounded" /> Chưa làm (
                {questions.length - answeredCount})
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1">
          {question && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
              <div className="flex items-start gap-3 mb-5">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {currentQ + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800 leading-relaxed text-sm md:text-base">
                    {question.questionText}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {question.questionType === "single_choice"
                      ? "Chọn một đáp án"
                      : question.questionType === "multiple_choice"
                        ? "Chọn nhiều đáp án"
                        : "Đúng hay Sai"}{" "}
                    • {question.points} điểm
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {question.options.map((opt) => {
                  const selected = selectedForQ.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() =>
                        selectOption(question.id, opt.id, question.questionType)
                      }
                      className={`w-full flex items-center gap-3 p-3.5 md:p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]
                        ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                        ${selected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}
                      >
                        {selected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-sm md:text-sm text-gray-700 leading-5">
                        {opt.optionText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="flex-1 md:flex-none px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Câu trước
            </button>
            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ((prev) => prev + 1)}
                className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
              >
                Câu sau →
              </button>
            ) : (
              <button
                onClick={() =>
                  window.confirm(
                    `Nộp bài? Đã làm ${answeredCount}/${questions.length} câu.`,
                  ) && handleSubmit()
                }
                disabled={submitting}
                className="flex-1 md:flex-none px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Đang nộp..." : "Nộp bài ✓"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: floating navigator toggle */}
      <div className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30">
        <button
          onClick={() => setShowNavigator(!showNavigator)}
          className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-sm font-bold"
        >
          {answeredCount}/{questions.length}
        </button>
      </div>

      {/* Mobile: navigator panel */}
      {showNavigator && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 flex items-end"
          onClick={() => setShowNavigator(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-800">Bảng câu hỏi</p>
              <button onClick={() => setShowNavigator(false)}>
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mb-4">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentQ(i);
                    setShowNavigator(false);
                  }}
                  className={`h-10 rounded-xl text-sm font-medium transition-all
                    ${
                      i === currentQ
                        ? "bg-blue-600 text-white"
                        : answers[q.id]?.length > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-100 rounded" /> Đã làm (
                {answeredCount})
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gray-100 rounded" /> Chưa làm (
                {questions.length - answeredCount})
              </span>
            </div>
            <button
              onClick={() => {
                setShowNavigator(false);
                window.confirm(
                  `Nộp bài? Đã làm ${answeredCount}/${questions.length} câu.`,
                ) && handleSubmit();
              }}
              disabled={submitting}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
