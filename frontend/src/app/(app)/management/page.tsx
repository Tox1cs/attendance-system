"use client";

import { useState, useEffect } from "react";

// Type definitions (unchanged)
type PendingOTRequest = {
  id: number; date: string; employee_name: string; status: string; 
};
type PendingLeaveRequest = {
  id: number; date: string; employee_name: string; status: string;
  leave_type: string; requested_minutes: number; reason: string;
};

// Helper function (unchanged)
const getApiHeaders = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

export default function ManagementPage() {
  // All states and functions (fetchAllPending, handleOTReview, handleLeaveReview) are unchanged
  const [pendingOT, setPendingOT] = useState<PendingOTRequest[]>([]);
  const [pendingLeave, setPendingLeave] = useState<PendingLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPending = async () => {
    setLoading(true);
    setError(null);
    const headers = getApiHeaders();
    if (!headers) {
      setError("Not authenticated.");
      window.location.href = '/';
      return;
    }
    try {
      const [otRes, leaveRes] = await Promise.all([
        fetch("http://localhost:8000/api/manager/pending-requests/", { headers }),
        fetch("http://localhost:8000/api/manager/pending-leave/", { headers })
      ]);
      if (!otRes.ok || !leaveRes.ok) throw new Error("Failed to fetch pending data.");
      const otData = await otRes.json();
      const leaveData = await leaveRes.json();
      setPendingOT(otData);
      setPendingLeave(leaveData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPending();
  }, []);

  const handleOTReview = async (requestId: number, action: "APPROVE" | "REJECT") => {
    const headers = getApiHeaders();
    if (!headers) return;
    try {
      const response = await fetch(`http://localhost:8000/api/manager/review/${requestId}/`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ action: action }) 
      });
      if (!response.ok) throw new Error("Failed to review OT request.");
      alert(`Request ${action}d!`);
      setPendingOT(current => current.filter(req => req.id !== requestId));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleLeaveReview = async (requestId: number, action: "APPROVE" | "REJECT") => {
    const headers = getApiHeaders();
    if (!headers) return;
    try {
      const response = await fetch(`http://localhost:8000/api/manager/review-leave/${requestId}/`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ action: action })
      });
      if (!response.ok) throw new Error("Failed to review Leave request.");
      alert(`Leave Request ${action}d!`);
      setPendingLeave(current => current.filter(req => req.id !== requestId));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };


  if (loading) return <div>Loading Management Data...</div>;
  if (error) return <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>;

  // --- JSX PART (Tables are updated with styles) ---
  return (
    <div className="space-y-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Requests Management</h1>
      
      {/* OT Approval Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <h2 className="border-b border-gray-200 p-6 text-xl font-semibold text-gray-700">Pending Overtime Requests</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pendingOT.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No pending overtime requests.</td></tr>
            ) : (
              pendingOT.map((req) => (
                <tr key={req.id}>
                  {/* --- STYLE FIX: Added clear text styles --- */}
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{req.employee_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.date}</td>
                  <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleOTReview(req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => handleOTReview(req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Leave Approval Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <h2 className="border-b border-gray-200 p-6 text-xl font-semibold text-gray-700">Pending Leave Requests</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Mins</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pendingLeave.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No pending leave requests.</td></tr>
            ) : (
              pendingLeave.map((req) => (
                <tr key={req.id}>
                  {/* --- STYLE FIX: Added clear text styles --- */}
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{req.employee_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.date}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.leave_type}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.leave_type === 'Hourly Leave' ? req.requested_minutes : 'N/A'}</td>
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500" title={req.reason}>{req.reason}</td>
                  <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleLeaveReview(req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => handleLeaveReview(req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}