const normalizeBaseUrl = (value, fallback) => {
  const raw = String(value || "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return fallback;
};

export const getApiBaseUrl = () =>
  normalizeBaseUrl(
    process.env.REACT_APP_API_URL,
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/api`
      : "http://localhost:5000/api",
  );

export const getFileBaseUrl = () => getApiBaseUrl().replace(/\/api\/?$/, "");

export const getFileUrl = (filePath) => {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const prefix = getFileBaseUrl();
  const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${prefix}${normalizedPath}`;
};
