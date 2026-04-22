import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { lessonApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { PaperClipIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

const FILE_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export default function LessonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editComment, setEditComment] = useState("");
  const [loading, setLoading] = useState(true);
  const canManageComments = ["admin", "teacher"].includes(user?.role);

  useEffect(() => {
    lessonApi
      .getById(id)
      .then((r) => setLesson(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await lessonApi.addComment(id, {
        content: comment,
        parentId: replyTo?.id || null,
      });
      const { data } = await lessonApi.getById(id);
      setLesson(data);
      setComment("");
      setReplyTo(null);
      toast.success("Đã thêm bình luận");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể thêm bình luận");
    }
  };

  const handleEditComment = async (e) => {
    e.preventDefault();
    if (!editComment.trim() || !editingCommentId) return;

    try {
      await lessonApi.updateComment(id, editingCommentId, {
        content: editComment,
      });
      const { data } = await lessonApi.getById(id);
      setLesson(data);
      setEditingCommentId(null);
      setEditComment("");
      toast.success("Đã cập nhật bình luận");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể cập nhật bình luận");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;

    try {
      await lessonApi.deleteComment(id, commentId);
      const { data } = await lessonApi.getById(id);
      setLesson(data);
      setEditingCommentId(null);
      setEditComment("");
      toast.success("Đã xóa bình luận");
    } catch (err) {
      toast.error(err.response?.data?.error || "Không thể xóa bình luận");
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  if (!lesson)
    return (
      <div className="p-6 text-center text-gray-500">
        Không tìm thấy bài giảng
      </div>
    );

  const embedUrl = getEmbedUrl(lesson.videoUrl);
  const comments = lesson.comments || [];
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
              className={`text-xs px-1.5 py-0.5 rounded-full
              ${item.authorRole === "teacher" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
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

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-6">
      {/* Main content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {lesson.subjectName}
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
          {lesson.title}
        </h1>
        <p className="text-gray-400 text-xs md:text-sm mb-5">
          {lesson.teacherName} •{" "}
          {format(new Date(lesson.createdAt), "dd/MM/yyyy")}
        </p>

        {/* Video: aspect-video = 16:9, works great on mobile */}
        {embedUrl && (
          <div className="mb-5 rounded-xl overflow-hidden bg-black aspect-video">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              title="Video bài giảng"
            />
          </div>
        )}

        {lesson.fileUrl && (
          <a
            href={`${FILE_BASE_URL}${lesson.fileUrl}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-200 mb-5 active:bg-gray-300"
          >
            <PaperClipIcon className="w-4 h-4 flex-shrink-0" />
            Tài liệu đính kèm
          </a>
        )}

        {lesson.content && (
          <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {lesson.content}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          Bình luận ({lesson.comments?.length || 0})
        </h3>

        {/* Comment input */}
        <form onSubmit={handleComment} className="flex gap-2.5 mb-5">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">
            {user.fullName[0]}
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

        {/* Comment list */}
        <div className="space-y-4">
          {rootComments.map((c) => renderComment(c))}
        </div>
      </div>
    </div>
  );
}
