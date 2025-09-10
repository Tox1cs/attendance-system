"use client";

import { useState, useEffect } from "react";

type PendingOTRequest = { id: number; date: string; employee_name: string; };
type PendingLeaveRequest = { id: number; date: string; employee_name: string; leave_type: string; requested_minutes: number; reason: string; };
type PendingMissionRequest = { id: number; date: string; employee_name: string; mission_type: string; start_time: string | null; end_time: string | null; destination: string; reason: string; };
type PendingLogRequest = { id: number; date: string; time: string; employee_name: string; log_type: string; reason: string; };

const getApiHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}`});

export default function ManagementPage() {
  const [pendingOT, setPendingOT] = useState<PendingOTRequest[]>([]);
  const [pendingLeave, setPendingLeave] = useState<PendingLeaveRequest[]>([]);
  const [pendingMission, setPendingMission] = useState<PendingMissionRequest[]>([]);
  const [pendingLogs, setPendingLogs] = useState<PendingLogRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPending = async () => {
    setLoading(true); setError(null);
    const headers = getApiHeaders();
    if (!headers) { setError("Not authenticated."); window.location.href = '/'; return; }
    try {
      const [otRes, leaveRes, missionRes, logRes] = await Promise.all([
        fetch("http://localhost:8000/api/manager/pending-requests/", { headers }),
        fetch("http://localhost:8000/api/manager/pending-leave/", { headers }),
        fetch("http://localhost:8000/api/manager/pending-mission/", { headers }),
        fetch("http://localhost:8000/api/manager/pending-logs/", { headers })
      ]);
      if (!otRes.ok || !leaveRes.ok || !missionRes.ok || !logRes.ok) throw new Error("Failed to fetch pending data.");
      setPendingOT(await otRes.json());
      setPendingLeave(await leaveRes.json());
      setPendingMission(await missionRes.json());
      setPendingLogs(await logRes.json());
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAllPending(); }, []);

  const handleReview = async (type: 'OT' | 'Leave' | 'Mission' | 'Log', requestId: number, action: "APPROVE" | "REJECT") => {
    const headers = getApiHeaders();
    if (!headers) return;
    let url = '';
    if (type === 'OT') url = `http://localhost:8000/api/manager/review/${requestId}/`;
    if (type === 'Leave') url = `http://localhost:8000/api/manager/review-leave/${requestId}/`;
    if (type === 'Mission') url = `http://localhost:8000/api/manager/review-mission/${requestId}/`;
    if (type === 'Log') url = `http://localhost:8000/api/manager/review-log/${requestId}/`;
    
    try {
      const response = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify({ action: action }) });
      if (!response.ok) throw new Error(`Failed to review ${type} request.`);
      alert(`${type} Request ${action}d!`);
      if (type === 'OT') setPendingOT(current => current.filter(req => req.id !== requestId));
      if (type === 'Leave') setPendingLeave(current => current.filter(req => req.id !== requestId));
      if (type === 'Mission') setPendingMission(current => current.filter(req => req.id !== requestId));
      if (type === 'Log') setPendingLogs(current => current.filter(req => req.id !== requestId));
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  if (loading) return <div>Loading Management Data...</div>;
  if (error) return <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Requests Management</h1>
      
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <h2 className="border-b border-gray-200 p-6 text-xl font-semibold text-gray-700">Pending Manual Log Requests</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pendingLogs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No pending log requests.</td></tr>
            ) : (
              pendingLogs.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.employee_name}</td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-900">{req.date}</div><div className="text-xs text-gray-500">{req.time}</div></td>
                  <td className="px-6 py-4 text-sm font-semibold">{req.log_type}</td>
                  <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleReview('Log', req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReview('Log', req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <h2 className="border-b border-gray-200 p-6 text-xl font-semibold text-gray-700">Pending Mission Requests</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date / Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pendingMission.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No pending mission requests.</td></tr>
            ) : (
              pendingMission.map((req) => (
                <tr key={req.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{req.employee_name}</td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-900">{req.date}</div><div className="text-xs text-gray-500">{req.mission_type}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{req.mission_type === 'Hourly Mission' ? `${req.start_time?.substring(0,5)} - ${req.end_time?.substring(0,5)}` : req.destination || 'N/A'}</td>
                  <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleReview('Mission', req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReview('Mission', req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{req.employee_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.date}</td>
                  <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleReview('OT', req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReview('OT', req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{req.employee_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.date}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.leave_type}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.leave_type === 'Hourly Leave' ? req.requested_minutes : 'N/A'}</td>
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500" title={req.reason}>{req.reason}</td>
                  <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleReview('Leave', req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReview('Leave', req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
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