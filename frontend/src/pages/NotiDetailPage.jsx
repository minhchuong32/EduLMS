import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  BellIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { notificationApi } from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function NotiDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const response = await notificationApi.getById(id);
        if (!alive) return;
        setNotification(response.data);

        if (!response.data?.isRead) {
          try {
            await notificationApi.markRead(id);
            window.dispatchEvent(new Event("notifications:refresh"));
            if (alive) {
              setNotification((prev) =>
                prev ? { ...prev, isRead: true } : prev,
              );
            }
          } catch {
            // Keep view usable even when mark read fails.
          }
        }
      } catch {
        if (alive) setNotification(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa thông báo này không?",
    );
    if (!confirmed) return;

    try {
      await notificationApi.delete(id);
      window.dispatchEvent(new Event("notifications:refresh"));
      toast.success("Đã xóa thông báo");
      navigate("/noti");
    } catch {
      toast.error("Không thể xóa thông báo");
    }
  };

  const canDeleteNotification =
    user?.role === "admin" || notification?.senderRole === user?.role;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-500">Không tìm thấy thông báo.</p>
        <Link
          to="/noti"
          className="mt-4 inline-flex text-blue-600 hover:text-blue-700"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Link
        to="/noti"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <BellIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              {notification.title}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", {
                locale: vi,
              })}
            </p>
          </div>
          {canDeleteNotification && (
            <button
              onClick={handleDelete}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Xóa thông báo"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
          {notification.message || "Không có nội dung chi tiết"}
        </div>

        {notification.targetUrl && (
          <div className="mt-4">
            <Link
              to={notification.targetUrl}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Mở khóa học liên quan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
