import React, { useEffect, useState } from "react";
import { notificationApi } from "../services/api";
import { BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "react-toastify";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi
      .getAll()
      .then((r) => setNotifications(r.data))
      .finally(() => setLoading(false));
  }, []);

  const markAll = async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("Đã đánh dấu tất cả là đã đọc");
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Thông báo hệ thống
          </h1>
          {unread > 0 && (
            <p className="text-sm text-blue-600 mt-0.5">{unread} chưa đọc</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
          >
            <CheckIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
            <span className="sm:hidden">Đọc hết</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Không có tin hệ thống nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 p-3.5 md:p-4 rounded-2xl border transition-colors
                ${n.isRead ? "bg-white border-gray-100" : "bg-blue-50 border-blue-100"}`}
            >
              <div
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${n.isRead ? "bg-gray-100" : "bg-blue-500"}`}
              >
                <BellIcon
                  className={`w-4 h-4 md:w-5 md:h-5 ${n.isRead ? "text-gray-400" : "text-white"}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium leading-snug ${n.isRead ? "text-gray-700" : "text-gray-900"}`}
                >
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-xs md:text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
