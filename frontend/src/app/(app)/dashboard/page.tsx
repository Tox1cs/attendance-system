"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import ManagerDashboard from "@/components/ManagerDashboard";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await apiClient("/dashboard/");
        if (data) {
          setDashboardData(data);
        } else {
          // If no data is returned but no error, might indicate a problem or empty state
          setError("No dashboard data received.");
          router.push('/'); // Or handle differently, e.g., show a message
        }
      } catch (err: any) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.message || "Failed to load dashboard data.");
        // Redirect to login or home if unauthorized or other critical error
        if (err.response && err.response.status === 401) {
            router.push('/login');
        } else {
            router.push('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="rounded-md bg-red-800/20 p-6 text-red-400 border border-red-700 shadow-lg animate-fade-in">
          <p className="font-bold text-lg mb-2">Error Loading Dashboard</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="rounded-md bg-yellow-800/20 p-6 text-yellow-400 border border-yellow-700 shadow-lg animate-fade-in">
          <p className="font-bold text-lg mb-2">Dashboard Data Missing</p>
          <p>No data available for display. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {dashboardData.role === 'manager' && <ManagerDashboard data={dashboardData} />}
      {dashboardData.role === 'employee' && <EmployeeDashboard data={dashboardData} />}
    </div>
  );
}