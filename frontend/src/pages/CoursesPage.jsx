import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { courseApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    courseApi
      .getAll()
      .then((r) => setCourses(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  const title =
    user.role === "student"
      ? "Môn học của tôi"
      : user.role === "teacher"
        ? "Môn học đang dạy"
        : "Tất cả khóa học";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{courses.length} môn học</p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <BookOpenIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có môn học nào</p>
        </div>
      ) : (
        /* 1 cột trên mobile, 2 cột tablet, 3 cột desktop */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.98] transition-all group"
            >
              {/* Color banner */}
              <div className={`${COLORS[i % COLORS.length]} h-1.5`} />
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {course.subjectCode}
                    </span>
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors leading-snug truncate">
                      {course.subjectName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Lớp {course.className}
                    </p>
                  </div>
                  <div
                    className={`w-9 h-9 md:w-10 md:h-10 ${COLORS[i % COLORS.length]} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white font-bold text-sm">
                      {course.subjectName[0]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(course.teacherName)}&size=24&background=3b82f6&color=fff`}
                    alt="teacher"
                    className="w-5 h-5 rounded-full flex-shrink-0"
                  />
                  <span className="text-xs text-gray-500 truncate">
                    {course.teacherName}
                  </span>
                </div>

                <div className="flex gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpenIcon className="w-3.5 h-3.5" />
                    {course.lessonCount} bài giảng
                  </span>
                  <span className="flex items-center gap-1">
                    <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                    {course.assignmentCount} bài tập
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
