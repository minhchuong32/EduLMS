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
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import CreateLessonModal from "../components/teacher/CreateLessonModal";
import CreateAssignmentModal from "../components/teacher/CreateAssignmentModal";

const TABS = ["Bài giảng", "Bài tập", "Thông báo"];

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

  const isTeacher = user.role === "teacher" || user.role === "admin";
  const canManageAnnouncements = user.role !== "student";

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

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
    toast.success("Đã xóa bài giảng");
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
    <div className="max-w-5xl mx-auto p-3 md:p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {course.subjectCode}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {course.className}
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          {course.subjectName}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Giáo viên:{" "}
          <span className="font-medium text-gray-700">
            {course.teacherName}
          </span>
        </p>
        {course.subjectDescription && (
          <p className="text-gray-400 text-sm mt-1">
            {course.subjectDescription}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-3 text-xs md:text-sm font-medium transition-all border-b-2
                ${activeTab === i ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-3 md:p-6">
          {/* Tab Bài giảng */}
          {activeTab === 0 && (
            <div>
              {isTeacher && (
                <button
                  onClick={() => setShowLessonModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 mb-4 active:bg-blue-800"
                >
                  <PlusIcon className="w-4 h-4" /> Thêm bài giảng
                </button>
              )}
              {lessons.length === 0 ? (
                <p className="text-center text-gray-400 py-10">
                  Chưa có bài giảng nào
                </p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {lessons.map((lesson, i) => (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border
                        ${lesson.isPublished ? "border-gray-100 bg-gray-50" : "border-dashed border-gray-200 bg-gray-50 opacity-70"}`}
                    >
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs md:text-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/lessons/${lesson.id}`}
                          className="font-medium text-gray-800 hover:text-blue-600 text-sm block truncate"
                        >
                          {lesson.title}
                        </Link>
                        {!lesson.isPublished && isTeacher && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                            Chưa đăng
                          </span>
                        )}
                      </div>
                      {isTeacher && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() =>
                              handlePublishLesson(
                                lesson.id,
                                !lesson.isPublished,
                              )
                            }
                            className={`p-2 rounded-lg transition-colors
                              ${lesson.isPublished ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-200"}`}
                          >
                            {lesson.isPublished ? (
                              <LockOpenIcon className="w-4 h-4" />
                            ) : (
                              <LockClosedIcon className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Bài tập */}
          {activeTab === 1 && (
            <div>
              {isTeacher && (
                <button
                  onClick={() => {
                    setEditingAssignment(null);
                    setShowAssignmentModal(true);
                  }}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 mb-4"
                >
                  <PlusIcon className="w-4 h-4" /> Thêm bài tập
                </button>
              )}
              {assignments.length === 0 ? (
                <p className="text-center text-gray-400 py-10">
                  Chưa có bài tập nào
                </p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className={`p-3 md:p-4 rounded-xl border ${a.isPublished ? "border-gray-100" : "border-dashed border-gray-200 opacity-75"}`}
                    >
                      {/* Row 1: badges + action buttons */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${
                              a.type === "quiz"
                                ? "bg-purple-100 text-purple-700"
                                : a.type === "essay"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {a.type === "quiz"
                              ? "Trắc nghiệm"
                              : a.type === "essay"
                                ? "Tự luận"
                                : "Nộp file"}
                          </span>
                          {!a.isPublished && isTeacher && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                              Chưa đăng
                            </span>
                          )}
                        </div>

                        {/* Action buttons — icon only on mobile */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {user.role === "student" && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium
                              ${
                                a.mySubmissions > 0
                                  ? a.myScore !== null
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-600"
                                  : "bg-gray-100 text-gray-500"
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
                                className="hidden sm:block text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                              >
                                Bài nộp
                              </Link>
                              <button
                                onClick={() =>
                                  handlePublishAssignment(a.id, !a.isPublished)
                                }
                                className={`p-1.5 rounded-lg transition-colors
                                  ${a.isPublished ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-200"}`}
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

                      {/* Row 2: title */}
                      <Link
                        to={`/assignments/${a.id}`}
                        className="font-medium text-gray-800 hover:text-blue-600 text-sm block truncate mb-1"
                      >
                        {a.title}
                      </Link>

                      {/* Row 3: meta info + mobile "Bài nộp" link */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          {a.dueDate && (
                            <span>
                              📅{" "}
                              {format(new Date(a.dueDate), "dd/MM HH:mm", {
                                locale: vi,
                              })}
                            </span>
                          )}
                          {a.timeLimitMinutes && (
                            <span>⏱ {a.timeLimitMinutes}ph</span>
                          )}
                          <span>💯 {a.totalPoints}đ</span>
                        </div>
                        {isTeacher && (
                          <Link
                            to={`/assignments/${a.id}/submissions`}
                            className="sm:hidden text-xs text-blue-600 hover:underline"
                          >
                            Xem bài nộp →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Thông báo */}
          {activeTab === 2 && (
            <div>
              {canManageAnnouncements && (
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 mb-4 active:bg-blue-800"
                >
                  <PlusIcon className="w-4 h-4" /> Thêm thông báo
                </button>
              )}

              {announcements.length === 0 ? (
                <p className="text-center text-gray-400 py-10">
                  Chưa có thông báo nào
                </p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {ann.title}
                        </h3>
                        {canManageAnnouncements && (
                          <button
                            onClick={() => handleDeleteAnnouncement(ann)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0 -mt-1"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">
                        {ann.content}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">
                        {ann.authorName} •{" "}
                        {format(new Date(ann.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
