const BASE_URL = "http://localhost:8080";

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (user?.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }

  const response = await fetch(BASE_URL + url, {
    ...options,
    headers,
  });

  // Token expired → logout
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("user");
    window.location.href = "/auth?mode=login";
    return;
  }

  return response;
};
