import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  courseApi,
  lessonApi,
  assignmentApi,
  announcementApi,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  XMarkIcon,
  BookOpenIcon,
  PlayCircleIcon,
  MegaphoneIcon,
  ClockIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  PaperClipIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import CreateLessonModal from "../components/teacher/CreateLessonModal";
import CreateAssignmentModal from "../components/teacher/CreateAssignmentModal";

const TABS = ["Bài giảng", "Bài tập", "Thông báo"];
const FILE_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const getEmbedUrl = (url) => {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
};

function DeleteConfirmModal({ assignment, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Xóa bài tập?</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          Bài tập{" "}
          <span className="font-semibold text-gray-700">
            "{assignment.title}"
          </span>{" "}
          sẽ bị xóa vĩnh viễn.
        </p>
        <p className="text-sm text-red-500 mb-6">
          Toàn bộ bài nộp của học sinh cũng sẽ bị xóa theo.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Xóa bài tập
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedLessonDetail, setSelectedLessonDetail] = useState(null);
  const [selectedLessonLoading, setSelectedLessonLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editComment, setEditComment] = useState("");

  const isTeacher = user.role === "teacher" || user.role === "admin";
  const canManageAnnouncements = user.role !== "student";

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [courseRes, lessonRes, assignmentRes] = await Promise.all([
          courseApi.getById(id),
          lessonApi.getByCourse(id),
          assignmentApi.getByCourse(id),
        ]);

        const courseData = courseRes.data;
        setCourse(courseData);
        setLessons(lessonRes.data);
        setAssignments(assignmentRes.data);

        const announcementRequests = [announcementApi.getAll({ courseId: id })];

        if (courseData.classId) {
          announcementRequests.push(
            announcementApi.getAll({ classId: courseData.classId }),
          );
        }

        const announcementResponses = await Promise.all(announcementRequests);
        const mergedAnnouncements = announcementResponses
          .flatMap((response) => response.data)
          .filter(
            (announcement, index, self) =>
              index === self.findIndex((item) => item.id === announcement.id),
          );

        setAnnouncements(mergedAnnouncements);
      } catch (err) {
        if (alive) {
          setCourse(null);
          setLessons([]);
          setAssignments([]);
          setAnnouncements([]);
          toast.error(err.response?.data?.error || "Không thể tải khóa học");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (lessons.length === 0) {
      setSelectedLessonId(null);
      setSelectedLessonDetail(null);
      return;
    }

    const hasSelected = lessons.some(
      (lesson) => lesson.id === selectedLessonId,
    );
    if (hasSelected) return;

    const firstLesson =
      lessons.find((lesson) => lesson.isPublished) || lessons[0];
    setSelectedLessonId(firstLesson?.id || null);
  }, [lessons, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId) return;

    let mounted = true;
    setSelectedLessonLoading(true);
    lessonApi
      .getById(selectedLessonId)
      .then((res) => {
        if (mounted) setSelectedLessonDetail(res.data);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || "Không tải được bài giảng");
      })
      .finally(() => {
        if (mounted) setSelectedLessonLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedLessonId]);

  const handlePublishLesson = async (lessonId, publish) => {
    await lessonApi.publish(lessonId, publish);
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, isPublished: publish } : l)),
    );
    toast.success(publish ? "Đã đăng bài giảng" : "Đã ẩn bài giảng");
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("Xóa bài giảng này?")) return;
    await lessonApi.delete(lessonId);
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    if (selectedLessonId === lessonId) {
      setSelectedLessonId(null);
      setSelectedLessonDetail(null);
    }
    toast.success("Đã xóa bài giảng");
  };

  const refreshSelectedLesson = async () => {
    if (!selectedLessonId) return;
    const { data } = await lessonApi.getById(selectedLessonId);
    setSelectedLessonDetail(data);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !selectedLessonId) return;
    try {
      await lessonApi.addComment(selectedLessonId, {
        content: comment,
        parentId: replyTo?.id || null,
      });
      await refreshSelectedLesson();
      setComment("");
      setReplyTo(null);
      toast.success("Đã thêm bình luận");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể thêm bình luận");
    }
  };

  const handleEditComment = async (e) => {
    e.preventDefault();
    if (!editComment.trim() || !editingCommentId || !selectedLessonId) return;

    try {
      await lessonApi.updateComment(selectedLessonId, editingCommentId, {
        content: editComment,
      });
      await refreshSelectedLesson();
      setEditingCommentId(null);
      setEditComment("");
      toast.success("Đã cập nhật bình luận");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể cập nhật bình luận");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedLessonId) return;
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;

    try {
      await lessonApi.deleteComment(selectedLessonId, commentId);
      await refreshSelectedLesson();
      setEditingCommentId(null);
      setEditComment("");
      toast.success("Đã xóa bình luận");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể xóa bình luận");
    }
  };

  const handlePublishAssignment = async (assignmentId, publish) => {
    await assignmentApi.publish(assignmentId, publish);
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, isPublished: publish } : a,
      ),
    );
    toast.success(publish ? "Đã đăng bài tập" : "Đã ẩn bài tập");
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    try {
      await assignmentApi.delete(deletingAssignment.id);
      setAssignments((prev) =>
        prev.filter((a) => a.id !== deletingAssignment.id),
      );
      toast.success("Đã xóa bài tập");
    } catch (err) {
      toast.error(err.response?.data?.error || "Xóa thất bại");
    } finally {
      setDeletingAssignment(null);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setSubmittingAnnouncement(true);
    try {
      const { data } = await announcementApi.create({
        courseEnrollmentId: id,
        title: announcementForm.title,
        content: announcementForm.content,
      });
      setAnnouncements((prev) => [data, ...prev]);
      setAnnouncementForm({ title: "", content: "" });
      setShowAnnouncementModal(false);
      toast.success("Đã thêm thông báo");
    } catch (err) {
      toast.error(err.response?.data?.error || "Thêm thông báo thất bại");
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcement) => {
    if (!window.confirm("Xóa thông báo này?")) return;
    try {
      await announcementApi.delete(announcement.id);
      setAnnouncements((prev) =>
        prev.filter((item) => item.id !== announcement.id),
      );
      toast.success("Đã xóa thông báo");
    } catch (err) {
      toast.error(err.response?.data?.error || "Xóa thông báo thất bại");
    }
  };

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setEditingAssignment(null);
  };
  const handleAssignmentCreated = (a) => {
    setAssignments((prev) => [...prev, a]);
    handleCloseAssignmentModal();
  };
  const handleAssignmentUpdated = (u) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === u.id ? { ...a, ...u } : a)),
    );
    handleCloseAssignmentModal();
    toast.success("Đã cập nhật bài tập");
  };

  const publishedLessonsCount = lessons.filter(
    (lesson) => lesson.isPublished,
  ).length;
  const progressPercent =
    lessons.length > 0
      ? Math.round((publishedLessonsCount / lessons.length) * 100)
      : 0;
  const featuredLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ||
    lessons.find((lesson) => lesson.isPublished) ||
    lessons[0];
  const embedUrl = getEmbedUrl(selectedLessonDetail?.videoUrl);
  const canManageComments = ["admin", "teacher"].includes(user?.role);
  const comments = selectedLessonDetail?.comments || [];
  const commentMap = comments.reduce((acc, item) => {
    acc[item.id] = { ...item, children: [] };
    return acc;
  }, {});
  const rootComments = [];
  Object.values(commentMap).forEach((item) => {
    if (item.parentId && commentMap[item.parentId]) {
      commentMap[item.parentId].children.push(item);
    } else {
      rootComments.push(item);
    }
  });

  const renderComment = (item, depth = 0) => (
    <div
      key={item.id}
      className={depth > 0 ? "ml-8 pl-4 border-l border-gray-100" : ""}
    >
      <div className="flex gap-2.5">
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          {item.authorName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-medium text-gray-800">
              {item.authorName}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                item.authorRole === "teacher"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {item.authorRole === "teacher" ? "Giáo viên" : "Học sinh"}
            </span>
            <span className="text-xs text-gray-400">
              {format(new Date(item.createdAt), "dd/MM HH:mm")}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {item.content}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => setReplyTo(item)}
              className="text-blue-600 hover:text-blue-700"
            >
              Trả lời
            </button>
            {canManageComments && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(item.id);
                    setEditComment(item.content);
                  }}
                  className="text-amber-600 hover:text-amber-700"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteComment(item.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Xóa
                </button>
              </>
            )}
          </div>
          {editingCommentId === item.id && (
            <form onSubmit={handleEditComment} className="mt-3 space-y-2">
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs hover:bg-blue-700"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditComment("");
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs hover:bg-gray-200"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {item.children?.length > 0 && (
        <div className="mt-3 space-y-3">
          {item.children.map((child) => renderComment(child, depth + 1))}
        </div>
      )}
    </div>
  );
  const upcomingDeadlines = assignments
    .filter((assignment) => assignment.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  if (!course)
    return (
      <div className="p-6 text-center text-gray-500">
        Không tìm thấy khóa học
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-indigo-50/30 p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-10">
          <div className="mb-4">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white/80 text-slate-600 text-sm font-semibold hover:text-blue-700 hover:border-blue-200 hover:bg-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Quay lại khóa học
            </Link>
          </div>
          <nav className="flex items-center gap-2 mb-4 text-xs font-medium text-slate-500">
            <span>Courses</span>
            <span>/</span>
            <span className="text-blue-600">
              {course.subjectCode || "Chi tiết"}
            </span>
          </nav>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {course.subjectCode}
                </span>
                {course.className && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200/70 text-slate-700">
                    {course.className}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                {course.subjectName}
              </h1>
              <div className="flex items-center gap-5 mt-4 text-sm text-slate-600 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600/10 border border-blue-100 flex items-center justify-center">
                    <BookOpenIcon className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Giảng viên</p>
                    <p className="font-semibold text-slate-800">
                      {course.teacherName}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-300 hidden md:block" />
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>{course.semester || "Học kỳ hiện tại"}</span>
                </div>
              </div>
              {course.subjectDescription && (
                <p className="mt-4 text-sm md:text-base text-slate-500 max-w-3xl">
                  {course.subjectDescription}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
          <div className="flex-1 space-y-8">
            <section className="rounded-[1.75rem] overflow-hidden bg-slate-900 shadow-2xl shadow-slate-300/40 relative">
              <div className="aspect-video bg-black">
                {selectedLessonLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
                    Đang tải video...
                  </div>
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={selectedLessonDetail?.title || "Video bài giảng"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white/75 text-sm">
                    {featuredLesson
                      ? "Bài giảng này chưa có video"
                      : "Chưa có bài giảng để xem"}
                  </div>
                )}
              </div>
              {featuredLesson && (
                <div className="p-5 md:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  <h4 className="text-base md:text-lg font-semibold mb-2 flex items-center gap-2">
                    <PlayCircleIcon className="w-5 h-5 text-blue-300" />
                    {featuredLesson.title}
                  </h4>
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden max-w-md mb-3">
                    <div
                      className="h-full bg-blue-300"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                  {selectedLessonDetail?.fileUrl && (
                    <a
                      href={`${FILE_BASE_URL}${selectedLessonDetail.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
                    >
                      <PaperClipIcon className="w-4 h-4" />
                      Tài liệu đính kèm
                    </a>
                  )}
                </div>
              )}
            </section>

            <section className="bg-white/90 backdrop-blur-sm rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-4 md:p-6">
              <div className="flex items-center gap-7 border-b border-slate-200/70 overflow-x-auto">
                {TABS.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`relative pb-4 text-base md:text-lg font-semibold whitespace-nowrap transition-colors ${
                      activeTab === i
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                    {activeTab === i && (
                      <span className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-blue-600" />
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-5">
                {activeTab === 0 && (
                  <div>
                    {isTeacher && (
                      <button
                        onClick={() => setShowLessonModal(true)}
                        className="mb-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Thêm bài giảng
                      </button>
                    )}
                    {lessons.length === 0 ? (
                      <p className="text-center text-slate-400 py-12">
                        Chưa có bài giảng nào
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {lessons.map((lesson, i) => (
                          <div
                            key={lesson.id}
                            className={`p-4 md:p-5 rounded-2xl border transition-all ${
                              selectedLessonId === lesson.id
                                ? "ring-2 ring-blue-200"
                                : ""
                            } ${
                              lesson.isPublished
                                ? "bg-white border-slate-200 hover:border-blue-200 hover:shadow-md"
                                : "bg-slate-100/70 border-dashed border-slate-300 opacity-80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-4 min-w-0">
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                                    lesson.isPublished
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {String(i + 1).padStart(2, "0")}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedLessonId(lesson.id)
                                    }
                                    disabled={!lesson.isPublished && !isTeacher}
                                    className="text-slate-800 font-semibold hover:text-blue-600 block truncate text-left disabled:text-slate-400 disabled:cursor-not-allowed"
                                  >
                                    {lesson.title}
                                  </button>
                                  <div className="flex items-center gap-2 mt-1 text-xs">
                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                      <ClockIcon className="w-3.5 h-3.5" />
                                      Bài giảng #{i + 1}
                                    </span>
                                    {!lesson.isPublished && isTeacher && (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                        Chưa đăng
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLessonId(lesson.id)}
                                  disabled={!lesson.isPublished && !isTeacher}
                                  className="hidden md:inline-flex px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                >
                                  Xem video
                                </button>
                                {isTeacher && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handlePublishLesson(
                                          lesson.id,
                                          !lesson.isPublished,
                                        )
                                      }
                                      className={`p-2 rounded-xl ${
                                        lesson.isPublished
                                          ? "text-green-600 hover:bg-green-50"
                                          : "text-slate-400 hover:bg-slate-200"
                                      }`}
                                    >
                                      {lesson.isPublished ? (
                                        <LockOpenIcon className="w-4 h-4" />
                                      ) : (
                                        <LockClosedIcon className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteLesson(lesson.id)
                                      }
                                      className="p-2 rounded-xl text-red-400 hover:bg-red-50"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                        Bình luận ({selectedLessonDetail?.comments?.length || 0}
                        )
                      </h3>

                      {selectedLessonId ? (
                        <>
                          <form
                            onSubmit={handleComment}
                            className="flex gap-2.5 mb-5"
                          >
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">
                              {user?.fullName?.[0] || "U"}
                            </div>
                            <div className="flex-1 space-y-2">
                              {replyTo && (
                                <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
                                  <span>Trả lời {replyTo.authorName}</span>
                                  <button
                                    type="button"
                                    onClick={() => setReplyTo(null)}
                                    className="font-medium hover:text-blue-800"
                                  >
                                    Hủy trả lời
                                  </button>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder={
                                    replyTo
                                      ? `Trả lời ${replyTo.authorName}...`
                                      : "Viết bình luận..."
                                  }
                                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="submit"
                                  className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 whitespace-nowrap"
                                >
                                  Gửi
                                </button>
                              </div>
                            </div>
                          </form>

                          <div className="space-y-4">
                            {rootComments.length > 0 ? (
                              rootComments.map((c) => renderComment(c))
                            ) : (
                              <p className="text-sm text-slate-500">
                                Chưa có bình luận cho bài giảng này.
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Chọn một bài giảng để xem video và bình luận.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 1 && (
                  <div>
                    {isTeacher && (
                      <button
                        onClick={() => {
                          setEditingAssignment(null);
                          setShowAssignmentModal(true);
                        }}
                        className="mb-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Thêm bài tập
                      </button>
                    )}
                    {assignments.length === 0 ? (
                      <p className="text-center text-slate-400 py-12">
                        Chưa có bài tập nào
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {assignments.map((a) => (
                          <div
                            key={a.id}
                            className={`p-4 rounded-2xl border ${
                              a.isPublished
                                ? "bg-white border-slate-200"
                                : "bg-slate-100/60 border-dashed border-slate-300 opacity-85"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                    a.type === "quiz"
                                      ? "bg-violet-100 text-violet-700"
                                      : a.type === "essay"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {a.type === "quiz"
                                    ? "Trắc nghiệm"
                                    : a.type === "essay"
                                      ? "Tự luận"
                                      : "Nộp file"}
                                </span>
                                {!a.isPublished && isTeacher && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                    Chưa đăng
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {user.role === "student" && (
                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                      a.mySubmissions > 0
                                        ? a.myScore !== null
                                          ? "bg-green-100 text-green-700"
                                          : "bg-blue-100 text-blue-700"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {a.mySubmissions > 0
                                      ? a.myScore !== null
                                        ? `${a.myScore}đ`
                                        : "Đã nộp"
                                      : "Chưa làm"}
                                  </span>
                                )}
                                {isTeacher && (
                                  <>
                                    <Link
                                      to={`/assignments/${a.id}/submissions`}
                                      className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    >
                                      Bài nộp
                                    </Link>
                                    <button
                                      onClick={() =>
                                        handlePublishAssignment(
                                          a.id,
                                          !a.isPublished,
                                        )
                                      }
                                      className={`p-1.5 rounded-lg ${
                                        a.isPublished
                                          ? "text-green-600 hover:bg-green-50"
                                          : "text-slate-400 hover:bg-slate-200"
                                      }`}
                                    >
                                      {a.isPublished ? (
                                        <LockOpenIcon className="w-4 h-4" />
                                      ) : (
                                        <LockClosedIcon className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingAssignment(a);
                                        setShowAssignmentModal(true);
                                      }}
                                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingAssignment(a)}
                                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <Link
                              to={`/assignments/${a.id}`}
                              className="font-semibold text-slate-800 hover:text-blue-600 block"
                            >
                              {a.title}
                            </Link>

                            <div className="mt-2 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
                              <div className="flex items-center gap-3 flex-wrap">
                                {a.dueDate && (
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                                    {format(
                                      new Date(a.dueDate),
                                      "dd/MM HH:mm",
                                      { locale: vi },
                                    )}
                                  </span>
                                )}
                                {a.timeLimitMinutes && (
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    {a.timeLimitMinutes} phút
                                  </span>
                                )}
                                <span>{a.totalPoints} điểm</span>
                              </div>
                              {isTeacher && (
                                <Link
                                  to={`/assignments/${a.id}/submissions`}
                                  className="sm:hidden text-blue-600 hover:underline"
                                >
                                  Xem bài nộp
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 2 && (
                  <div>
                    {canManageAnnouncements && (
                      <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="mb-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Thêm thông báo
                      </button>
                    )}

                    {announcements.length === 0 ? (
                      <p className="text-center text-slate-400 py-12">
                        Chưa có thông báo nào
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {announcements.map((ann) => (
                          <div
                            key={ann.id}
                            className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-200"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-slate-800 text-sm md:text-base">
                                {ann.title}
                              </h3>
                              {canManageAnnouncements && (
                                <button
                                  onClick={() => handleDeleteAnnouncement(ann)}
                                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1.5 whitespace-pre-wrap">
                              {ann.content}
                            </p>
                            <p className="text-slate-400 text-xs mt-3">
                              {ann.authorName} •{" "}
                              {format(
                                new Date(ann.createdAt),
                                "dd/MM/yyyy HH:mm",
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="w-full xl:w-80 space-y-6">
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-200/30">
              <h6 className="font-bold text-slate-900 mb-4">
                Tiến độ khóa học
              </h6>
              <div className="relative w-32 h-32 mx-auto mb-5">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-blue-600"
                    strokeDasharray="282.7"
                    strokeDashoffset={282.7 - (282.7 * progressPercent) / 100}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900">
                    {progressPercent}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Nội dung mở
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Bài giảng đã đăng</span>
                  <span className="font-semibold text-slate-900">
                    {publishedLessonsCount}/{lessons.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Bài tập</span>
                  <span className="font-semibold text-slate-900">
                    {assignments.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-100/80 p-6 rounded-[1.75rem] border border-slate-200/70">
              <h6 className="font-bold text-slate-900 mb-4">Sắp tới hạn</h6>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Chưa có deadline sắp tới.
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-14 rounded-xl bg-white flex flex-col items-center justify-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-blue-600">
                          {format(new Date(item.dueDate), "MMM", {
                            locale: vi,
                          })}
                        </span>
                        <span className="text-lg font-bold text-slate-900 leading-none">
                          {format(new Date(item.dueDate), "dd")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Hạn:{" "}
                          {format(new Date(item.dueDate), "dd/MM/yyyy HH:mm", {
                            locale: vi,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-[1.75rem] text-white shadow-xl shadow-blue-400/30">
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider mb-3">
                  Quick Action
                </span>
                <h6 className="text-xl font-extrabold mb-2">
                  Bảng điều khiển khóa học
                </h6>
                <p className="text-white/85 text-sm mb-5 leading-relaxed">
                  Truy cập tổng quan khóa học, theo dõi bài tập và các hoạt động
                  lớp học nhanh hơn.
                </p>
                <Link
                  to="/courses"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-white text-blue-700 rounded-full font-bold text-sm"
                >
                  Về trang môn học
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </Link>
              </div>
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/20 rounded-full blur-2xl" />
            </div>
          </aside>
        </div>
      </div>

      {showAnnouncementModal && canManageAnnouncements && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Thêm thông báo</h3>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <input
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                required
                placeholder="Tiêu đề thông báo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={announcementForm.content}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                required
                rows={5}
                placeholder="Nội dung thông báo..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {submittingAnnouncement ? "Đang đăng..." : "Đăng thông báo"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {showLessonModal && (
        <CreateLessonModal
          courseId={id}
          onClose={() => setShowLessonModal(false)}
          onCreated={(lesson) => {
            setLessons((prev) => [...prev, lesson]);
            setShowLessonModal(false);
          }}
        />
      )}
      {showAssignmentModal && (
        <CreateAssignmentModal
          courseId={id}
          editData={editingAssignment}
          onClose={handleCloseAssignmentModal}
          onCreated={handleAssignmentCreated}
          onUpdated={handleAssignmentUpdated}
        />
      )}
      {deletingAssignment && (
        <DeleteConfirmModal
          assignment={deletingAssignment}
          onConfirm={handleDeleteAssignment}
          onCancel={() => setDeletingAssignment(null)}
        />
      )}
    </div>
  );
}
