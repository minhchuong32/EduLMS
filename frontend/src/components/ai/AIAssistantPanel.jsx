import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  SparklesIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { aiApi } from "../../services/api";

const MODE_OPTIONS = [
  {
    value: "summary",
    label: "Tóm tắt",
    icon: BookOpenIcon,
    hint: "Rút ra ý chính dễ ôn tập",
  },
  {
    value: "questions",
    label: "Tạo câu hỏi",
    icon: QuestionMarkCircleIcon,
    hint: "Sinh bộ câu hỏi trắc nghiệm",
  },
  {
    value: "rubric",
    label: "Rubric",
    icon: ClipboardDocumentCheckIcon,
    hint: "Gợi ý thang điểm chấm bài",
  },
  {
    value: "explain",
    label: "Giải thích",
    icon: LightBulbIcon,
    hint: "Giải thích theo mức độ",
  },
];

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung bình" },
  { value: "advanced", label: "Nâng cao" },
];

const ROLE_LABELS = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  student: "Học sinh",
};

const DEFAULT_CONTEXT_HINT =
  "Mô tả ngắn, rõ ràng nội dung để AI xử lý tốt hơn. Có thể chỉnh sửa trước khi gửi.";
const PANEL_ANIMATION_MS = 220;

export default function AIAssistantPanel({
  title = "Trợ lý AI",
  description,
  content,
  subject,
  role,
  defaultMode = "summary",
  audience,
  assignmentType,
  allowQuestionCount = true,
}) {
  const [mode, setMode] = useState(defaultMode);
  const [level, setLevel] = useState("intermediate");
  const [questionCount, setQuestionCount] = useState(5);
  const [promptText, setPromptText] = useState(content || "");
  const [customRequest, setCustomRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef(null);

  const isTeacher = role === "teacher";

  useEffect(() => {
    setPromptText(content || "");
  }, [content]);

  useEffect(() => {
    if (mode === "questions" && questionCount < 1) {
      setQuestionCount(5);
    }
  }, [mode, questionCount]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const modeInfo =
    MODE_OPTIONS.find((item) => item.value === mode) || MODE_OPTIONS[0];
  const Icon = modeInfo.icon;

  const handleGenerate = async () => {
    if (!promptText.trim() && !customRequest.trim()) {
      toast.error("Vui lòng nhập nội dung cần phân tích");
      return;
    }

    setLoading(true);
    try {
      const { data } = await aiApi.generate({
        mode,
        title,
        subject,
        audience: audience || ROLE_LABELS[role] || role || "người học",
        level,
        questionCount,
        assignmentType,
        content: [promptText, customRequest].filter(Boolean).join("\n\n"),
      });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể tạo nội dung AI");
    } finally {
      setLoading(false);
    }
  };

  const openPanel = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
    requestAnimationFrame(() => setIsVisible(true));
  };

  const closePanel = () => {
    setIsVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, PANEL_ANIMATION_MS);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closePanel();
    }
  };

  if (!isTeacher) {
    return null;
  }

  return (
    <>
      <div className="mb-4 md:mb-6 rounded-xl border border-gray-100 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <button
              type="button"
              onClick={openPanel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm transition hover:bg-violet-700"
              title="Mở trợ lý AI"
            >
              <SparklesIcon className="h-4 w-4" />
            </button>
            <span>Công cụ trợ lý AI cho giáo viên</span>
          </div>
          <button
            type="button"
            onClick={openPanel}
            className="text-xs font-medium text-violet-700 hover:text-violet-800"
            title="Mở nhanh"
          >
            Mở nhanh
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className={`fixed inset-0 z-50 transition-colors duration-200 ${
            isVisible ? "bg-black/40" : "bg-black/0"
          }`}
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 overflow-y-auto">
            <div
              className={`mx-auto min-h-full w-full max-w-4xl bg-white p-4 md:p-6 transition-all duration-200 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 mb-2">
                    <SparklesIcon className="w-4 h-4" />
                    AI Assistant
                  </div>
                  <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
                  {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-gray-400 hidden md:block">
                    <p>{ROLE_LABELS[role] || role || ""}</p>
                    <p>{modeInfo.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                    title="Đóng trợ lý AI"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-4 mb-4">
                {MODE_OPTIONS.map((item) => {
                  const ButtonIcon = item.icon;
                  const active = mode === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setMode(item.value)}
                      className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                        active
                          ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ButtonIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-semibold">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-xs mt-1 opacity-80">{item.hint}</p>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Chất lượng giải thích
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {LEVEL_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Số câu hỏi
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    disabled={mode !== "questions" || !allowQuestionCount}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Đối tượng
                  </label>
                  <input
                    value={audience || ROLE_LABELS[role] || role || "người học"}
                    readOnly
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nội dung nguồn
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={6}
                    placeholder={DEFAULT_CONTEXT_HINT}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Yêu cầu thêm
                  </label>
                  <textarea
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    rows={3}
                    placeholder="Ví dụ: tạo câu hỏi mức độ vận dụng, nhấn mạnh phần công thức, hoặc giải thích theo phong cách gần gũi cho học sinh lớp 10."
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {loading ? "Đang tạo..." : "Tạo nội dung"}
                </button>
                <p className="text-xs text-gray-400">
                  AI sẽ dùng API nếu có cấu hình, nếu không sẽ dùng chế độ gợi ý
                  cục bộ.
                </p>
              </div>

              {result && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-violet-600" />
                      <h3 className="font-semibold text-violet-800">
                        {result.title || modeInfo.label}
                      </h3>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-6">
                      {result.text || ""}
                    </pre>
                    {Array.isArray(result.suggestions) &&
                      result.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {result.suggestions.map((item, index) => (
                            <span
                              key={`${item}-${index}`}
                              className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-700 border border-violet-100"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>

                  {Array.isArray(result.questions) &&
                    result.questions.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800">
                          Danh sách câu hỏi gợi ý
                        </h3>
                        {result.questions.map((question, index) => (
                          <div
                            key={`${question.question}-${index}`}
                            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium text-gray-800 leading-6">
                                {index + 1}. {question.question}
                              </p>
                              {question.difficulty && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                                  {question.difficulty}
                                </span>
                              )}
                            </div>
                            {Array.isArray(question.options) &&
                              question.options.length > 0 && (
                                <div className="grid gap-2 sm:grid-cols-2 mt-3">
                                  {question.options.map(
                                    (option, optionIndex) => (
                                      <div
                                        key={`${option}-${optionIndex}`}
                                        className={`rounded-xl border px-3 py-2 text-sm ${
                                          question.answerIndex === optionIndex
                                            ? "border-violet-200 bg-violet-50 text-violet-700"
                                            : "border-gray-200 bg-gray-50 text-gray-700"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optionIndex)}.{" "}
                                        {option}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            {question.explanation && (
                              <p className="mt-3 text-sm text-gray-500 whitespace-pre-wrap">
                                <span className="font-medium text-gray-700">
                                  Giải thích:
                                </span>{" "}
                                {question.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
