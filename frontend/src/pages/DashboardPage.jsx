import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dashboardApi, announcementApi } from "../services/api";
import {
  BookOpenIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  BellIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const StatCard = ({ icon: Icon, label, value, accent, hint }) => (
  <div className="section-card p-4 md:p-5 transition-transform hover:-translate-y-0.5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          {value ?? "—"}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent} shadow-lg shadow-slate-900/10`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    dashboardApi
      .get()
      .then((r) => setStats(r.data))
      .catch(() => {});
    announcementApi
      .getAll()
      .then((r) => setAnnouncements(r.data.slice(0, 5)))
      .catch(() => {});
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const renderStats = () => {
    if (!stats) return null;

    if (user.role === "admin") {
      const byRole = {};
      (stats.usersByRole || []).forEach((r) => {
        byRole[r.role] = r.cnt;
      });
      return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={UserGroupIcon}
            label="Học sinh"
            value={byRole.student}
            accent="bg-gradient-to-br from-blue-500 to-cyan-500"
            hint="Người học đang hoạt động"
          />
          <StatCard
            icon={AcademicCapIcon}
            label="Giáo viên"
            value={byRole.teacher}
            accent="bg-gradient-to-br from-violet-500 to-fuchsia-500"
            hint="Tài khoản giảng dạy"
          />
          <StatCard
            icon={BookOpenIcon}
            label="Lớp học"
            value={stats.totalClasses}
            accent="bg-gradient-to-br from-emerald-500 to-teal-500"
            hint="Đơn vị quản lý lớp"
          />
          <StatCard
            icon={ClipboardDocumentListIcon}
            label="Khóa học"
            value={stats.totalCourses}
            accent="bg-gradient-to-br from-amber-500 to-orange-500"
            hint="Các môn đã mở"
          />
        </div>
      );
    }

    if (user.role === "teacher") {
      return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={BookOpenIcon}
            label="Môn học"
            value={stats.totalCourses}
            accent="bg-gradient-to-br from-blue-500 to-cyan-500"
            hint="Các lớp đang phụ trách"
          />
          <StatCard
            icon={ClipboardDocumentListIcon}
            label="Bài giảng"
            value={stats.totalLessons}
            accent="bg-gradient-to-br from-violet-500 to-fuchsia-500"
            hint="Nội dung đã chuẩn bị"
          />
          <StatCard
            icon={AcademicCapIcon}
            label="Bài tập"
            value={stats.totalAssignments}
            accent="bg-gradient-to-br from-emerald-500 to-teal-500"
            hint="Bài tập đã tạo"
          />
          <StatCard
            icon={UserGroupIcon}
            label="Chờ chấm"
            value={stats.pendingGrading}
            accent="bg-gradient-to-br from-rose-500 to-red-500"
            hint="Bài nộp cần phản hồi"
          />
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={BookOpenIcon}
          label="Môn học"
          value={stats.totalCourses}
          accent="bg-gradient-to-br from-blue-500 to-cyan-500"
          hint="Các môn đã đăng ký"
        />
        <StatCard
          icon={ClipboardDocumentListIcon}
          label="Bài tập"
          value={stats.totalAssignments}
          accent="bg-gradient-to-br from-violet-500 to-fuchsia-500"
          hint="Bài tập có thể làm"
        />
        <StatCard
          icon={AcademicCapIcon}
          label="Đã nộp"
          value={stats.completedAssignments}
          accent="bg-gradient-to-br from-emerald-500 to-teal-500"
          hint="Bài đã hoàn thành"
        />
      </div>
    );
  };

  return (
    <div className="page-shell">
      <div className="hero-card mb-6 p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <ArrowTrendingUpIcon className="h-4 w-4 text-cyan-300" />
              <span>Bảng điều khiển</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              {getGreeting()}, {user?.fullName}!
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
              Chào mừng bạn quay lại EduLMS. Dưới đây là bức tranh nhanh về hoạt
              động học tập và các cập nhật mới nhất.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[360px]">
            <div className="rounded-3xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-white/60">Vai trò</p>
              <p className="mt-1 font-semibold text-white">{user?.role}</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-white/60">Trạng thái</p>
              <p className="mt-1 font-semibold text-white">Sẵn sàng</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur col-span-2 sm:col-span-1">
              <p className="text-xs text-white/60">Thông báo</p>
              <p className="mt-1 font-semibold text-white">
                {announcements.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">{renderStats()}</div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="panel-card p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
                Thông báo mới nhất
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Cập nhật gần đây từ giáo viên và quản trị hệ thống.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BellIcon className="h-5 w-5" />
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-slate-400">
              Không có thông báo nào
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
                    <span className="text-sm font-bold">
                      {ann.authorName?.[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 md:text-[15px]">
                      {ann.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                      {ann.content}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {ann.authorName} •{" "}
                      {formatDistanceToNow(new Date(ann.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-card p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
                Tóm tắt nhanh
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Những điểm chính bạn nên xem ngay.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "Theo dõi thông báo",
                desc: "Luôn cập nhật lịch kiểm tra, lịch nộp bài và thay đổi lớp học.",
              },
              {
                title: "Kiểm tra thống kê",
                desc: "Dữ liệu được gom trong thẻ lớn để đọc nhanh hơn trên desktop lẫn mobile.",
              },
              {
                title: "Đi tới mục cần làm",
                desc: "Thanh điều hướng mới giúp truy cập nhanh các màn hình chính.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
