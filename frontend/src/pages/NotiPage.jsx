import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, TrashIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { notificationApi } from "../services/api";
import { toast } from "react-toastify";

export default function NotiPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const response = await notificationApi.getAll();
        if (alive) {
          setNotifications(Array.isArray(response.data) ? response.data : []);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, []);

  const emitRefresh = () => {
    window.dispatchEvent(new Event("notifications:refresh"));
  };

  const handleOpenNotification = async (item) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      try {
        await notificationApi.markRead(item.id);
      } catch {
        toast.error("Không thể cập nhật trạng thái đã đọc");
      }
      emitRefresh();
    }
    navigate(`/noti/${item.id}`);
  };

  const handleDeleteNotification = async (event, id) => {
    event.stopPropagation();
    const previous = notifications;
    setNotifications((prev) => prev.filter((item) => item.id !== id));

    try {
      await notificationApi.delete(id);
      emitRefresh();
      toast.success("Đã xóa thông báo");
    } catch {
      setNotifications(previous);
      toast.error("Không thể xóa thông báo");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Thông báo quản trị
        </h1>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenNotification(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOpenNotification(item);
                }
              }}
              className={`block rounded-2xl border p-4 transition-colors ${
                item.isRead
                  ? "bg-white border-gray-100 hover:bg-slate-50"
                  : "bg-blue-50 border-blue-100 hover:bg-blue-100/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </p>
                  {item.message && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {item.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </p>
                </div>

                <button
                  onClick={(event) => handleDeleteNotification(event, item.id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Xóa thông báo"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
