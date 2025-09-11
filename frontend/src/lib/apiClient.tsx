"use client";

import { toast } from "sonner";

const BASE_URL = "http://localhost:8000/api";

async function apiClient(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  
  const defaultHeaders: HeadersInit = {
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
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.detail || (data.non_field_errors ? data.non_field_errors[0] : "An unexpected error occurred.");
      
      toast.error("Request Failed", {
        description: errorMessage,
      });
      return null;
    }
    
    return data;

  } catch (error) {
    toast.error("Connection Error", {
      description: "Could not connect to the server. Please check your connection.",
    });
    return null;
  }
}

export default apiClient;