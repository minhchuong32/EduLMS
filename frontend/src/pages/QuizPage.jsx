import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assignmentApi, submissionApi } from "../services/api";
import { toast } from "react-toastify";
import {
  ClockIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  FlagIcon,
  BookOpenIcon,
  PaperAirplaneIcon,
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
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);

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

  const toggleFlag = (questionId) => {
    if (!questionId) return;
    setFlaggedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((item) => item !== questionId)
        : [...prev, questionId],
    );
  };

  const submitQuiz = () => {
    const questions = assignment?.questions || [];
    if (
      window.confirm(
        `Nộp bài? Đã làm ${Object.keys(answers).length}/${questions.length} câu.`,
      )
    ) {
      handleSubmit();
    }
  };

  const questions = assignment?.questions || [];
  const question = questions[currentQ];
  const selectedForQ = answers[question?.id] || [];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const isFlagged = question ? flaggedQuestions.includes(question.id) : false;

  const getQuestionState = (item, index) => {
    if (index === currentQ) return "current";
    if (flaggedQuestions.includes(item.id)) return "flagged";
    if (answers[item.id]?.length > 0) return "answered";
    return "remaining";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/60 bg-white/80 px-8 py-10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-500">
            Đang tải bài làm...
          </p>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="panel-card w-full max-w-md overflow-hidden p-0">
          <div className="hero-card px-6 py-7 text-white">
            <p className="relative z-10 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
              Nộp bài thành công
            </p>
            <h2 className="relative z-10 mt-2 text-2xl font-extrabold tracking-tight">
              Bài trắc nghiệm đã được ghi nhận
            </h2>
            <p className="relative z-10 mt-2 text-sm text-white/80">
              Bạn có thể quay lại danh sách bài tập hoặc xem kết quả ngay bên
              dưới.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Kết quả bài làm
              </p>
              {result.score !== undefined ? (
                <>
                  <div className="mt-4 text-5xl font-extrabold text-slate-900">
                    {result.score}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    / {result.totalPoints} điểm
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {Math.round((result.score / result.totalPoints) * 100)}%
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Kết quả sẽ được công bố sau.
                </p>
              )}
            </div>

            <button
              onClick={() => navigate(-2)}
              className="soft-button-primary w-full"
            >
              Quay về
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] text-slate-900 md:pb-8">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="soft-button-secondary h-11 w-11 rounded-2xl p-0"
              aria-label="Quay lại"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                Quiz Assessment
              </p>
              <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-900 md:text-base">
                {assignment?.title || "Bài làm trắc nghiệm"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm ${
                timeLeft !== null && timeLeft < 60
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              <span className="font-mono tracking-wider">
                {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
              </span>
            </div>
            <button
              onClick={submitQuiz}
              disabled={submitting}
              className="hidden items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 md:inline-flex"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 md:px-6 lg:grid-cols-12 lg:py-6">
        <section className="lg:col-span-8 xl:col-span-9">
          <div className="space-y-6">
            <div className="panel-card overflow-hidden p-0">
              <div className="hero-card px-5 py-6 md:px-7 md:py-7">
                <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
                      Học sinh làm bài
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                      {assignment?.title || "Bài trắc nghiệm"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                      Chọn đáp án phù hợp nhất cho từng câu hỏi. Câu hiện tại
                      được đánh dấu rõ, những câu đã làm và đã gắn cờ sẽ hiển
                      thị trong bảng câu hỏi bên phải.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:min-w-[290px]">
                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                        Đã làm
                      </p>
                      <p className="mt-1 text-2xl font-extrabold">
                        {answeredCount}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                        Đánh dấu
                      </p>
                      <p className="mt-1 text-2xl font-extrabold">
                        {flaggedQuestions.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                        Tiến độ
                      </p>
                      <p className="mt-1 text-2xl font-extrabold">
                        {progressPercent}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-card p-5 md:p-7">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">
                    <span>
                      {currentQ + 1 < 10 ? `0${currentQ + 1}` : currentQ + 1}
                    </span>
                    <span>/</span>
                    <span>
                      {questions.length < 10
                        ? `0${questions.length}`
                        : questions.length}
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-[2rem] md:leading-tight">
                    {question?.questionText ||
                      "Không có câu hỏi nào trong bài này."}
                  </h3>
                  {question && (
                    <p className="mt-3 text-sm font-medium text-slate-500 md:text-base">
                      {question.questionType === "single_choice"
                        ? "Chọn một đáp án"
                        : question.questionType === "multiple_choice"
                          ? "Chọn nhiều đáp án"
                          : "Đúng hay Sai"}{" "}
                      • {question.points} điểm
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFlag(question?.id)}
                    disabled={!question}
                    className={`soft-button-secondary ${
                      isFlagged
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : ""
                    }`}
                  >
                    <FlagIcon className="h-4 w-4" />
                    {isFlagged ? "Bỏ đánh dấu" : "Đánh dấu"}
                  </button>
                </div>
              </div>

              <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {question ? (
                <div className="space-y-3">
                  {question.options?.map((opt, index) => {
                    const selected = selectedForQ.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          selectOption(
                            question.id,
                            opt.id,
                            question.questionType,
                          )
                        }
                        className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99] md:p-5 ${
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-[0_16px_35px_-25px_rgba(21,88,219,0.8)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold transition-all ${
                            selected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>

                        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                          <span
                            className={`text-sm leading-6 md:text-base ${selected ? "font-semibold text-blue-700" : "font-medium text-slate-700"}`}
                          >
                            {opt.optionText}
                          </span>
                          <div
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              selected
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300"
                            }`}
                          >
                            <div
                              className={`h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                                selected ? "scale-100" : "scale-0"
                              }`}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Chưa có nội dung câu hỏi để hiển thị.
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
                  disabled={currentQ === 0}
                  className="soft-button-secondary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Câu trước
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => toggleFlag(question?.id)}
                    disabled={!question}
                    className="soft-button-secondary w-full sm:w-auto"
                  >
                    <FlagIcon className="h-4 w-4" />
                    {isFlagged ? "Đã đánh dấu" : "Đánh dấu để xem lại"}
                  </button>

                  {currentQ < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQ((prev) => prev + 1)}
                      className="soft-button-primary w-full sm:w-auto"
                    >
                      Câu sau
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={submitQuiz}
                      disabled={submitting}
                      className="soft-button-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      {submitting ? "Đang nộp..." : "Nộp bài"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 lg:col-span-4 xl:col-span-3">
          <section className="section-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.24em] text-slate-700">
                Question Map
              </h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {questions.map((q, i) => {
                const state = getQuestionState(q, i);
                const stateClasses = {
                  current:
                    "border-blue-600 bg-white text-blue-700 ring-4 ring-blue-100 shadow-[0_10px_24px_-16px_rgba(21,88,219,0.8)]",
                  answered:
                    "border-blue-600 bg-blue-600 text-white shadow-[0_10px_20px_-14px_rgba(21,88,219,0.7)]",
                  flagged: "border-amber-300 bg-amber-100 text-amber-800",
                  remaining:
                    "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-200",
                };
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQ(i);
                      setShowNavigator(false);
                    }}
                    className={`aspect-square rounded-xl border text-xs font-extrabold transition-all ${stateClasses[state]}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Đã làm
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />
                Câu hiện tại
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-100" />
                Đánh dấu
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                Chưa làm
              </div>
            </div>
          </section>

          <section className="section-card relative overflow-hidden p-5">
            <div className="absolute -right-8 -bottom-8 opacity-[0.04]">
              <BookOpenIcon className="h-40 w-40" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.24em] text-slate-700">
              Quick Reference
            </h3>
            <p className="relative z-10 mt-4 text-sm leading-7 text-slate-600">
              {assignment?.description ||
                "Hãy đọc kỹ câu hỏi, kiểm tra trạng thái đánh dấu ở bảng câu hỏi và ưu tiên quay lại các câu bạn chưa chắc chắn trước khi nộp bài."}
            </p>

            <div className="relative z-10 mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BookOpenIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    Tài liệu
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    Xem lại nội dung bài học liên quan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FlagIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    Gợi ý
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    Đánh dấu câu khó để quay lại sau
                  </p>
                </div>
              </div>
            </div>
          </section>

          <button
            onClick={submitQuiz}
            disabled={submitting}
            className="soft-button-primary w-full py-4 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            {submitting ? "Đang nộp..." : "Nộp bài và kết thúc"}
          </button>
        </aside>
      </main>

      <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 md:hidden">
        <button
          onClick={() => setShowNavigator((prev) => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.65)]"
          aria-label="Mở bảng câu hỏi"
        >
          {showNavigator ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <span className="text-xs font-extrabold">{answeredCount}</span>
          )}
        </button>
      </div>

      {showNavigator && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-slate-950/45 md:hidden"
          onClick={() => setShowNavigator(false)}
        >
          <div
            className="w-full rounded-t-[1.75rem] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-24px_60px_-35px_rgba(15,23,42,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Bảng câu hỏi
                </p>
                <p className="text-xs text-slate-500">
                  {answeredCount}/{questions.length} đã làm
                </p>
              </div>
              <button
                onClick={() => setShowNavigator(false)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <ChevronUpIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const state = getQuestionState(q, i);
                const mobileStateClasses = {
                  current: "border-blue-600 bg-blue-50 text-blue-700",
                  answered: "border-blue-600 bg-blue-600 text-white",
                  flagged: "border-amber-300 bg-amber-100 text-amber-800",
                  remaining: "border-slate-200 bg-slate-100 text-slate-500",
                };
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQ(i);
                      setShowNavigator(false);
                    }}
                    className={`h-11 rounded-xl border text-sm font-extrabold transition-all ${mobileStateClasses[state]}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Đã làm
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-100" />
                Đánh dấu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                Chưa làm
              </span>
            </div>

            <button
              onClick={submitQuiz}
              disabled={submitting}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
