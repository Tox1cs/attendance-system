"use client";

import { useState, useEffect } from "react";

type ReportData = {
  id: number;
  employee_name: string;
  date: string;
  total_lateness_minutes: number;
  penalty_minutes: number;
  required_work_minutes_today: number;
  total_worked_minutes: number;
  work_shortfall_minutes: number;
  work_overtime_minutes: number;
};

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("No login token found. Please redirecting to login...");
        setLoading(false);
        // Redirect to login if no token
        window.location.href = '/'; 
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/api/manager/reports/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });

        if (!response.ok) {
           if(response.status === 401 || response.status === 403) {
             setError("Authentication failed. Redirecting to login...");
             window.location.href = '/'; 
             return;
           }
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data: ReportData[] = await response.json();
        setReports(data);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  if (loading) {
    return <div className="text-center p-8">Loading Dashboard Reports...</div>;
  }

  if (error) {
    return <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Manager Dashboard</h1>
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lateness (m)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Penalty (m)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Required (m)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Worked (m)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Shortfall (m)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Overtime (m)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{report.employee_name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{report.date}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{report.total_lateness_minutes}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{report.penalty_minutes}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{report.required_work_minutes_today}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{report.total_worked_minutes}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">{report.work_shortfall_minutes}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-green-600">{report.work_overtime_minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}