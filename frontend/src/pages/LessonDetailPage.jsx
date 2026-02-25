// LessonDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { lessonApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { PaperClipIcon, ChatBubbleLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function LessonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lessonApi.getById(id).then(r => setLesson(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await lessonApi.addComment(id, { content: comment });
    const { data } = await lessonApi.getById(id);
    setLesson(data);
    setComment('');
    toast.success('Đã thêm bình luận');
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  if (!lesson) return <div className="p-6 text-center text-gray-500">Không tìm thấy bài giảng</div>;

  const embedUrl = getEmbedUrl(lesson.videoUrl);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{lesson.subjectName}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
        <p className="text-gray-400 text-sm mb-6">Đăng bởi {lesson.teacherName} • {format(new Date(lesson.createdAt), 'dd/MM/yyyy')}</p>

        {embedUrl && (
          <div className="mb-6 rounded-xl overflow-hidden bg-black aspect-video">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video bài giảng" />
          </div>
        )}

        {lesson.fileUrl && (
          <a href={`http://localhost:5000${lesson.fileUrl}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-200 mb-6">
            <PaperClipIcon className="w-4 h-4" />
            Tài liệu đính kèm
          </a>
        )}

        {lesson.content && (
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {lesson.content}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5" /> Bình luận ({lesson.comments?.length || 0})
        </h3>
        <form onSubmit={handleComment} className="flex gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            {user.fullName[0]}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Viết bình luận..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Gửi</button>
          </div>
        </form>

        <div className="space-y-4">
          {lesson.comments?.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                {c.authorName?.[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{c.authorName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.authorRole === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {c.authorRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                  </span>
                  <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'dd/MM HH:mm')}</span>
                </div>
                <p className="text-sm text-gray-700">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
