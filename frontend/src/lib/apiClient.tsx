"use client";

import { toast } from "sonner";

const BASE_URL = "http://localhost:8000/api";

let isRefreshing = false;
let failedQueue: { resolve: (value?: any) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function apiClient(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    let response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (response.status === 401 && endpoint !== '/token/refresh/') {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = localStorage.getItem("refresh_token");
        
        if (!refreshToken) {
            window.location.href = '/';
            return Promise.reject("No refresh token");
        }

        try {
          const refreshResponse = await fetch(`${BASE_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          const refreshData = await refreshResponse.json();

          if (!refreshResponse.ok) throw new Error("Session expired. Please log in again.");
          
          localStorage.setItem('access_token', refreshData.access);
          processQueue(null, refreshData.access);
          
          if (config.headers) {
            (config.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshData.access}`;
          }
          response = await fetch(`${BASE_URL}${endpoint}`, config);

        } catch (e: any) {
          processQueue(e, null);
          localStorage.clear();
          window.location.href = '/';
          toast.error("Session Expired", { description: "Please log in again." });
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      } else if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(newToken => {
          if (config.headers) {
            (config.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
          }
          return fetch(`${BASE_URL}${endpoint}`, config);
        });
      }
    }
    
    if (response.status === 204) { return { success: true }; }
    
    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.detail || (data.non_field_errors ? data.non_field_errors[0] : "An unexpected error occurred.");
      toast.error("Request Failed", { description: errorMessage });
      return null;
    }
    
    return data;

  } catch (error) {
    toast.error("Connection Error", { description: "Could not connect to the server." });
    return null;
  }
}

export default apiClient;