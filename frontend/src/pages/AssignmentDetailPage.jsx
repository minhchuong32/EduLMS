import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { assignmentApi, submissionApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  ClockIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  LockClosedIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [essayContent, setEssayContent] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

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

      if (user.role === "student") {
        const submissionRes = await submissionApi.getMy(id);
        setMySubmissions(submissionRes.data);
      }

      setLoaded(true); //  chỉ load 1 lần
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu");
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
      toast.error(err.response?.data?.error || "Không thể bắt đầu bài thi");
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

      toast.success("Nộp bài thành công!");

      // reload submissions
      const r = await submissionApi.getMy(id);
      setMySubmissions(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Nộp bài thất bại");
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
    return (
      <div className="p-6 text-center text-gray-500">
        Không tìm thấy bài tập
      </div>
    );
  }

  const isSubmitted = mySubmissions.some((s) => s.status !== "in_progress");
  const canSubmit =
    !isSubmitted || mySubmissions.length < assignment.maxAttempts;
  const isPastDue =
    assignment.dueDate && new Date() > new Date(assignment.dueDate);
  const isFileAssignmentSubmitted =
    assignment.type === "file" &&
    mySubmissions.some((s) => s.status !== "in_progress");
  const completedSubmission = mySubmissions.find(
    (s) => s.status !== "in_progress",
  );

  const TYPE_LABELS = {
    quiz: "Trắc nghiệm",
    essay: "Tự luận",
    file: "Nộp file",
  };
  const TYPE_COLORS = {
    quiz: "bg-purple-100 text-purple-700",
    essay: "bg-blue-100 text-blue-700",
    file: "bg-green-100 text-green-700",
  };

  const formatStatusLabel = (status) => {
    if (status === "submitted") return "Đã nộp";
    if (status === "graded") return "Đã chấm";
    if (status === "late") return "Nộp trễ";
    if (status === "in_progress") return "Đang làm";
    return status;
  };

  const formatStatusStyle = (status) => {
    if (status === "submitted")
      return "bg-blue-50 text-blue-700 border-blue-100";
    if (status === "graded")
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "late") return "bg-rose-50 text-rose-700 border-rose-100";
    if (status === "in_progress")
      return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const selectedFileName = file?.name || "Chưa chọn tệp";

  const mobileDeadline = assignment.dueDate
    ? format(new Date(assignment.dueDate), "HH:mm - dd/MM/yyyy")
    : "Không có hạn nộp";

  const backToCoursePath = assignment.courseEnrollmentId
    ? `/courses/${assignment.courseEnrollmentId}`
    : "/courses";

  const mobileStatusLabel = isFileAssignmentSubmitted
    ? "Đã nộp"
    : isPastDue
      ? "Quá hạn"
      : "Sắp hết hạn";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(148,163,184,0.18),_transparent_22%),linear-gradient(180deg,#f8fbff_0%,#f3f6ff_100%)] text-slate-900">
      <div className="md:hidden min-h-screen bg-surface pb-32">
        <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-sm border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-4 py-3 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to={backToCoursePath}
                className="hover:bg-slate-100 rounded-full transition-colors p-2 active:scale-95 duration-150 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-blue-600">
                  arrow_back
                </span>
              </Link>
              <div className="min-w-0">
                <h1 className="text-blue-700 font-bold tracking-tight text-base font-headline truncate">
                  Làm bài tập tự luận
                </h1>
                <p className="text-[11px] text-slate-500 truncate">
                  {assignment.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="hover:bg-slate-100 rounded-full transition-colors p-2 active:scale-95 duration-150"
            >
              <span className="material-symbols-outlined text-slate-500">
                info
              </span>
            </button>
          </div>
        </header>

        <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
          <section className="bg-surface-container-low rounded-xl p-5 space-y-2 shadow-sm ring-1 ring-outline-variant/10">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-on-surface font-bold text-lg leading-tight">
                  {assignment.title}
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">
                  {TYPE_LABELS[assignment.type]}
                </p>
              </div>
              <div className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                {mobileStatusLabel}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3 mt-3 border-t border-outline-variant/20">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">
                  calendar_today
                </span>
                <span className="text-xs font-medium text-on-surface-variant">
                  Hạn nộp: {mobileDeadline}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">
                  grade
                </span>
                <span className="text-xs font-medium text-on-surface-variant">
                  Thang điểm: {assignment.totalPoints}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">
                  edit_note
                </span>
                NỘI DUNG BÀI LÀM
              </h3>
              <span className="text-[10px] font-medium text-outline uppercase tracking-widest">
                Đã lưu tự động
              </span>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-sm ring-1 ring-outline-variant/10 overflow-hidden">
              <div className="flex items-center gap-1 px-3 py-2 bg-surface-container-low border-b border-outline-variant/10 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">format_bold</span>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">
                    format_italic
                  </span>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">
                    format_underlined
                  </span>
                </button>
                <div className="w-px h-6 bg-outline-variant/30 mx-1" />
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">
                    format_list_bulleted
                  </span>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">
                    format_list_numbered
                  </span>
                </button>
                <div className="w-px h-6 bg-outline-variant/30 mx-1" />
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">link</span>
                </button>
              </div>

              {assignment.type === "essay" ? (
                <textarea
                  value={essayContent}
                  onChange={(e) => setEssayContent(e.target.value)}
                  className="w-full p-4 min-h-[300px] bg-transparent border-none focus:ring-0 text-on-surface leading-relaxed placeholder:text-outline/50"
                  placeholder="Nhập nội dung bài làm của bạn tại đây..."
                />
              ) : (
                <div className="w-full p-4 min-h-[300px] bg-transparent border-none text-on-surface leading-relaxed flex flex-col items-center justify-center text-center gap-3">
                  <div className="rounded-full bg-primary/10 text-primary p-4">
                    <span className="material-symbols-outlined">
                      description
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">
                      Bài tập nộp file
                    </p>
                    <p className="text-sm text-on-surface-variant mt-1 max-w-sm">
                      Hãy tải tệp đính kèm lên ở phần bên dưới trước khi nộp
                      bài.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                attach_file
              </span>
              FILE ĐÍNH KÈM
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/40 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 group hover:border-primary/40 transition-colors">
                <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">upload_file</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-on-surface">
                    Tải lên tài liệu hoặc ảnh
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Hỗ trợ PDF, DOCX, JPG (Max 25MB)
                  </p>
                </div>

                {isFileAssignmentSubmitted ? (
                  <div className="mt-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                    Đã nộp file, không thể chọn lại
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      className="hidden"
                      id="file-upload-mobile"
                      type="file"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                    />
                    <label
                      className="mt-2 text-xs font-bold text-primary cursor-pointer"
                      htmlFor="file-upload-mobile"
                    >
                      CHỌN FILE
                    </label>
                    <p className="text-[11px] text-on-surface-variant pt-1">
                      {selectedFileName}
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="pt-4 pb-10">
            {isFileAssignmentSubmitted ? (
              <button
                type="button"
                disabled
                className="w-full bg-slate-300 text-slate-600 py-4 rounded-full font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <span className="material-symbols-outlined">lock</span>
                Đã nộp bài
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitEssay}
                disabled={submitting || isPastDue}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-4 rounded-full font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">send</span>
                {submitting ? "Đang nộp..." : "Nộp bài ngay"}
              </button>
            )}
            <p className="text-center text-[11px] text-on-surface-variant mt-4 px-8 leading-snug">
              Bằng cách nhấn nộp bài, bạn xác nhận đây là sản phẩm sáng tạo của
              riêng mình.
            </p>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-around items-center px-4 pb-safe pt-2 rounded-t-3xl border-t-0">
          <Link
            className="flex flex-col items-center justify-center text-slate-400 px-3 py-1.5 hover:text-blue-500"
            to="/dashboard"
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-medium tracking-wide font-label">
              Trang chủ
            </span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center text-slate-400 px-3 py-1.5 hover:text-blue-500"
            to={backToCoursePath}
          >
            <span className="material-symbols-outlined">auto_stories</span>
            <span className="text-[10px] font-medium tracking-wide font-label">
              Khóa học
            </span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-2xl px-3 py-1.5"
            to={`/assignments/${id}`}
            aria-current="page"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              assignment
            </span>
            <span className="text-[10px] font-medium tracking-wide font-label">
              Bài tập
            </span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center text-slate-400 px-3 py-1.5 hover:text-blue-500"
            to="/profile"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-medium tracking-wide font-label">
              Cá nhân
            </span>
          </Link>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-4">
                  <span>Assignment Portal</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                  <span className="text-blue-700">Active Task</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${TYPE_COLORS[assignment.type]}`}
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        {TYPE_LABELS[assignment.type]}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <AcademicCapIcon className="w-3.5 h-3.5" />
                        {assignment.maxAttempts} lượt làm
                      </span>
                      {assignment.dueDate && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          <ClockIcon className="w-3.5 h-3.5" />
                          Hạn{" "}
                          {format(new Date(assignment.dueDate), "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>

                    <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950">
                      {assignment.title}
                    </h1>

                    {assignment.description && (
                      <p className="mt-4 text-sm sm:text-base leading-7 text-slate-600 max-w-3xl">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 shadow-lg shadow-blue-600/20 min-w-[180px]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                      Tổng điểm
                    </p>
                    <p className="mt-2 text-4xl font-extrabold leading-none">
                      {assignment.totalPoints}
                    </p>
                    <p className="mt-2 text-sm text-white/80">
                      Điểm tối đa cho bài tập
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:grid-cols-3 sm:px-6 lg:px-8">
                <div className="rounded-2xl bg-white px-4 py-3 border border-slate-200/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {isFileAssignmentSubmitted
                      ? "Đã nộp file"
                      : isPastDue
                        ? "Đã quá hạn"
                        : "Sẵn sàng nộp"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 border border-slate-200/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Lượt làm
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      mySubmissions.filter((s) => s.status !== "in_progress")
                        .length
                    }
                    /{assignment.maxAttempts}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 border border-slate-200/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Loại bài
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {TYPE_LABELS[assignment.type]}
                  </p>
                </div>
              </div>
            </div>

            {user?.role === "student" && (
              <div className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 lg:px-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Khu vực nộp bài
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tải tệp lên một lần duy nhất. Sau khi nộp file, nút nộp sẽ
                      bị khóa.
                    </p>
                  </div>
                  {assignment.type === "file" && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                      Nộp file
                    </span>
                  )}
                </div>

                <div className="p-5 sm:p-6 lg:p-8 space-y-5">
                  {mySubmissions.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {mySubmissions.map((sub) => {
                        const statusStyle = formatStatusStyle(sub.status);

                        return (
                          <div
                            key={sub.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                  Lượt nộp #{sub.attemptNumber}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">
                                  {sub.submittedAt
                                    ? format(
                                        new Date(sub.submittedAt),
                                        "dd/MM/yyyy HH:mm",
                                      )
                                    : "Chưa nộp"}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle}`}
                              >
                                {formatStatusLabel(sub.status)}
                              </span>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                              <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                              <span>
                                {sub.score != null
                                  ? `Điểm: ${sub.score}`
                                  : "Chưa có điểm"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {assignment.type === "quiz" &&
                    !isPastDue &&
                    !isFileAssignmentSubmitted && (
                      <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-violet-600 p-2.5 text-white shadow-lg shadow-violet-600/20">
                            <DocumentTextIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-950">
                              Bắt đầu làm bài
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              Vào bài trắc nghiệm ngay khi bạn sẵn sàng.
                            </p>
                            <button
                              onClick={handleStartQuiz}
                              disabled={starting}
                              className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <PaperAirplaneIcon className="w-4 h-4" />
                              {starting ? "Đang xử lý..." : "Bắt đầu làm bài"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  {(assignment.type === "essay" ||
                    assignment.type === "file") &&
                  !isFileAssignmentSubmitted &&
                  !isPastDue ? (
                    <form onSubmit={handleSubmitEssay} className="space-y-5">
                      {assignment.type === "essay" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-semibold text-slate-800">
                              Nội dung bài luận
                            </label>
                            <span className="text-xs text-slate-400">
                              Soạn thảo trực tiếp
                            </span>
                          </div>
                          <textarea
                            value={essayContent}
                            onChange={(e) => setEssayContent(e.target.value)}
                            rows={10}
                            placeholder="Bắt đầu nhập nội dung bài luận của bạn ở đây..."
                            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      )}

                      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-5 sm:p-6 transition hover:border-blue-300 hover:bg-blue-50/40">
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                            <CloudArrowUpIcon className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-950">
                              Tải lên tệp đính kèm
                            </h3>
                            <p className="mt-1 max-w-xl text-sm text-slate-600">
                              Kéo thả hoặc chọn tệp Word, PDF, hoặc hình ảnh từ
                              máy tính. Dung lượng tối đa 20MB.
                            </p>
                          </div>

                          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                  Tệp hiện tại
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {selectedFileName}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handlePickFile}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                <CloudArrowUpIcon className="w-4 h-4" />
                                Chọn tệp
                              </button>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                setFile(e.target.files[0] || null)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.01] hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                      >
                        <PaperAirplaneIcon className="w-4 h-4" />
                        {submitting ? "Đang nộp..." : "Nộp bài"}
                      </button>
                    </form>
                  ) : null}

                  {isFileAssignmentSubmitted ? (
                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="mt-0.5 w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">
                            Bạn đã nộp file cho bài tập này.
                          </p>
                          <p className="mt-1 text-emerald-700">
                            Hệ thống đã khóa nút nộp để tránh nộp lại hoặc tải
                            lại file đã gửi.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isPastDue ? (
                    <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="mt-0.5 w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">Bài tập đã quá hạn.</p>
                          <p className="mt-1 text-amber-700">
                            Không thể nộp thêm bài sau thời gian kết thúc.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {(user?.role === "teacher" || user?.role === "admin") && (
              <div className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Quản lý bài nộp
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Xem danh sách bài nộp của học sinh cho bài tập này.
                    </p>
                  </div>
                  <Link
                    to={`/assignments/${id}/submissions`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Xem bài nộp
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-6 h-fit space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-slate-950">
                  Submission History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi tiến độ và trạng thái nộp bài.
                </p>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-600 p-2 text-white">
                        <ClipboardDocumentCheckIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Tổng lượt
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {mySubmissions.length} lượt
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                      {isFileAssignmentSubmitted ? "Đã khóa" : "Mở"}
                    </span>
                  </div>
                </div>

                {completedSubmission ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Bài nộp gần nhất
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {completedSubmission.submittedAt
                        ? format(
                            new Date(completedSubmission.submittedAt),
                            "dd/MM/yyyy HH:mm",
                          )
                        : "Chưa nộp"}
                    </p>
                    <div
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${formatStatusStyle(completedSubmission.status)}`}
                    >
                      {formatStatusLabel(completedSubmission.status)}
                    </div>
                    {completedSubmission.score != null && (
                      <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        Điểm: {completedSubmission.score}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Chưa có bài nộp nào.
                  </div>
                )}

                <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                    Ghi chú
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/80">
                    Với bài dạng file, hệ thống sẽ khóa hoàn toàn nút nộp sau
                    lần gửi đầu tiên để ngăn nộp lại và tải lại file.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Checklist
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="mt-0.5 w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Đọc kỹ yêu cầu trước khi tải tệp lên.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="mt-0.5 w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Kiểm tra đúng định dạng file và nội dung đính kèm.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="mt-0.5 w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Sau khi nộp file, bạn không thể nộp lại.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
