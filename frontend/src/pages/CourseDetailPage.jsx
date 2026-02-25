import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseApi, lessonApi, assignmentApi, announcementApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  BookOpenIcon, ClipboardDocumentListIcon, MegaphoneIcon, PlusIcon,
  PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, LockOpenIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import CreateLessonModal from '../components/teacher/CreateLessonModal';
import CreateAssignmentModal from '../components/teacher/CreateAssignmentModal';

const TABS = ['Bài giảng', 'Bài tập', 'Thông báo'];

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

  const isTeacher = user.role === 'teacher' || user.role === 'admin';

  useEffect(() => {
    Promise.all([
      courseApi.getById(id),
      lessonApi.getByCourse(id),
      assignmentApi.getByCourse(id),
      announcementApi.getAll({ courseId: id }),
    ]).then(([c, l, a, ann]) => {
      setCourse(c.data);
      setLessons(l.data);
      setAssignments(a.data);
      setAnnouncements(ann.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePublishLesson = async (lessonId, publish) => {
    await lessonApi.publish(lessonId, publish);
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, isPublished: publish } : l));
    toast.success(publish ? 'Đã đăng bài giảng' : 'Đã ẩn bài giảng');
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Xóa bài giảng này?')) return;
    await lessonApi.delete(lessonId);
    setLessons(prev => prev.filter(l => l.id !== lessonId));
    toast.success('Đã xóa');
  };

  const handlePublishAssignment = async (assignmentId, publish) => {
    await assignmentApi.publish(assignmentId, publish);
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, isPublished: publish } : a));
    toast.success(publish ? 'Đã đăng bài tập' : 'Đã ẩn bài tập');
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  if (!course) return <div className="p-6 text-center text-gray-500">Không tìm thấy khóa học</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{course.subjectCode}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{course.className}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{course.subjectName}</h1>
            <p className="text-gray-500 mt-1">Giáo viên: <span className="font-medium text-gray-700">{course.teacherName}</span></p>
            {course.subjectDescription && <p className="text-gray-400 text-sm mt-2">{course.subjectDescription}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`flex-1 py-3.5 text-sm font-medium transition-all border-b-2
                ${activeTab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Lessons Tab */}
          {activeTab === 0 && (
            <div>
              {isTeacher && (
                <button onClick={() => setShowLessonModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 mb-4">
                  <PlusIcon className="w-4 h-4" /> Thêm bài giảng
                </button>
              )}
              {lessons.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Chưa có bài giảng nào</p>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, i) => (
                    <div key={lesson.id} className={`flex items-center gap-4 p-4 rounded-xl border ${lesson.isPublished ? 'border-gray-100 bg-gray-50' : 'border-dashed border-gray-200 bg-gray-50 opacity-70'}`}>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <Link to={`/lessons/${lesson.id}`} className="font-medium text-gray-800 hover:text-blue-600 text-sm">{lesson.title}</Link>
                        {!lesson.isPublished && isTeacher && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Chưa đăng</span>}
                      </div>
                      {isTeacher && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handlePublishLesson(lesson.id, !lesson.isPublished)}
                            className={`p-1.5 rounded-lg ${lesson.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}>
                            {lesson.isPublished ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteLesson(lesson.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
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

          {/* Assignments Tab */}
          {activeTab === 1 && (
            <div>
              {isTeacher && (
                <button onClick={() => setShowAssignmentModal(true)}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 mb-4">
                  <PlusIcon className="w-4 h-4" /> Thêm bài tập
                </button>
              )}
              {assignments.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Chưa có bài tập nào</p>
              ) : (
                <div className="space-y-3">
                  {assignments.map(a => (
                    <div key={a.id} className={`p-4 rounded-xl border ${a.isPublished ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.type === 'quiz' ? 'bg-purple-100 text-purple-700' : a.type === 'essay' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {a.type === 'quiz' ? 'Trắc nghiệm' : a.type === 'essay' ? 'Tự luận' : 'Nộp file'}
                            </span>
                            {!a.isPublished && isTeacher && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Chưa đăng</span>}
                          </div>
                          <Link to={`/assignments/${a.id}`} className="font-medium text-gray-800 hover:text-blue-600 text-sm">{a.title}</Link>
                          <div className="flex gap-3 text-xs text-gray-400 mt-1">
                            {a.dueDate && <span>Hạn: {format(new Date(a.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>}
                            {a.timeLimitMinutes && <span>Thời gian: {a.timeLimitMinutes} phút</span>}
                            <span>{a.totalPoints} điểm</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isTeacher && (
                            <>
                              <Link to={`/assignments/${a.id}/submissions`} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">Bài nộp</Link>
                              <button onClick={() => handlePublishAssignment(a.id, !a.isPublished)}
                                className={`p-1.5 rounded-lg ${a.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}>
                                {a.isPublished ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                          {user.role === 'student' && (
                            <span className={`text-xs px-2 py-1 rounded-full ${a.mySubmissions > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {a.mySubmissions > 0 ? (a.myScore !== null ? `Điểm: ${a.myScore}` : 'Đã nộp') : 'Chưa làm'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 2 && (
            <div>
              {announcements.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Chưa có thông báo nào</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h3 className="font-semibold text-gray-800">{ann.title}</h3>
                      <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">{ann.content}</p>
                      <p className="text-gray-400 text-xs mt-2">{ann.authorName} • {format(new Date(ann.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLessonModal && (
        <CreateLessonModal courseId={id} onClose={() => setShowLessonModal(false)}
          onCreated={(lesson) => { setLessons(prev => [...prev, lesson]); setShowLessonModal(false); }} />
      )}
      {showAssignmentModal && (
        <CreateAssignmentModal courseId={id} onClose={() => setShowAssignmentModal(false)}
          onCreated={(a) => { setAssignments(prev => [...prev, a]); setShowAssignmentModal(false); }} />
      )}
    </div>
  );
}
