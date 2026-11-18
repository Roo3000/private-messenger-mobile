import AsyncStorage from "@react-native-async-storage/async-storage";

// CHANGE THIS to your machine
export const API_URL = "http://10.0.2.2:3000";

export async function getToken() {
  return AsyncStorage.getItem("token");
}

export async function api(
  path: string,
  options: RequestInit = {}
) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}