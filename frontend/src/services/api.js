import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) =>
    error ? prom.reject(error) : prom.resolve(token),
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        isRefreshing = false;
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (data) => api.post("/auth/login", data),
  logout: (data) => api.post("/auth/logout", data),
  getMe: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// Users
export const userApi = {
  getAll: (params) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  getProfile: () => api.get("/users/profile"),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  requestDeleteAccount: () => api.post("/users/profile/delete-request"),
  updateProfile: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(
      ([k, v]) => v !== undefined && formData.append(k, v),
    );
    return api.put("/users/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Classes
export const classApi = {
  getAll: (params) => api.get("/classes", { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post("/classes", data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  addStudent: (classId, studentId) =>
    api.post(`/classes/${classId}/students`, { studentId }),
  removeStudent: (classId, studentId) =>
    api.delete(`/classes/${classId}/students/${studentId}`),
};

// Timetable
export const classScheduleApi = {
  getSchedules: (classId) => api.get(`/classes/${classId}/schedules`),
  createSchedule: (classId, data) =>
    api.post(`/classes/${classId}/schedules`, data),
  updateSchedule: (classId, scheduleId, data) =>
    api.put(`/classes/${classId}/schedules/${scheduleId}`, data),
  deleteSchedule: (classId, scheduleId) =>
    api.delete(`/classes/${classId}/schedules/${scheduleId}`),
};

// Subjects
export const subjectApi = {
  getAll: () => api.get("/subjects"),
  create: (data) => api.post("/subjects", data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
};

// Courses
export const courseApi = {
  getAll: (params) => api.get("/courses", { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post("/courses", data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
};

// Lessons
export const lessonApi = {
  getByCourse: (courseId) => api.get(`/lessons/course/${courseId}`),
  getById: (id) => api.get(`/lessons/${id}`),
  create: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(
      ([k, v]) => v !== undefined && v !== null && formData.append(k, v),
    );
    return api.post("/lessons", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.entries(data).forEach(
      ([k, v]) => v !== undefined && formData.append(k, v),
    );
    return api.put(`/lessons/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  publish: (id, publish) => api.patch(`/lessons/${id}/publish`, { publish }),
  delete: (id) => api.delete(`/lessons/${id}`),
  addComment: (id, data) => api.post(`/lessons/${id}/comments`, data),
  updateComment: (lessonId, commentId, data) =>
    api.put(`/lessons/${lessonId}/comments/${commentId}`, data),
  deleteComment: (lessonId, commentId) =>
    api.delete(`/lessons/${lessonId}/comments/${commentId}`),
};

// Assignments
export const assignmentApi = {
  getByCourse: (courseId) => api.get(`/assignments/course/${courseId}`),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post("/assignments", data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  publish: (id, publish) =>
    api.patch(`/assignments/${id}/publish`, { publish }),
  delete: (id) => api.delete(`/assignments/${id}`),
};

// Submissions
export const submissionApi = {
  start: (assignmentId) => api.post("/submissions/start", { assignmentId }),
  submitQuiz: (id, answers) =>
    api.post(`/submissions/${id}/submit-quiz`, { answers }),
  submitEssay: (id, data) => {
    const formData = new FormData();
    if (data.essayContent) formData.append("essayContent", data.essayContent);
    if (data.file) formData.append("file", data.file);
    return api.post(`/submissions/${id}/submit-essay`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  grade: (id, data) => api.put(`/submissions/${id}/grade`, data),
  getByAssignment: (assignmentId) =>
    api.get(`/submissions/assignment/${assignmentId}`),
  getMy: (assignmentId) => api.get(`/submissions/my/${assignmentId}`),
  getDetail: (id) => api.get(`/submissions/${id}/detail`),
};

// Announcements
export const announcementApi = {
  getAll: (params) => api.get("/announcements", { params }),
  create: (data) => api.post("/announcements", data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// Notifications
export const notificationApi = {
  getAll: () => api.get("/notifications"),
  getById: (id) => api.get(`/notifications/${id}`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Support
export const supportApi = {
  createTicket: (data) => api.post("/support/tickets", data),
  getMyTickets: (params) => api.get("/support/tickets/my", { params }),
};

// Chat
export const chatApi = {
  getContacts: () => api.get("/chat/contacts"),
  getConversation: (userId, params) =>
    api.get(`/chat/messages/${userId}`, { params }),
  sendMessage: (data) => {
    if (data instanceof FormData) {
      return api.post("/chat/messages", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    return api.post("/chat/messages", data);
  },
  markConversationRead: (userId) => api.put(`/chat/messages/${userId}/read`),
  clearHistory: () => api.delete("/chat/history"),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get("/dashboard"),
};

export default api;
