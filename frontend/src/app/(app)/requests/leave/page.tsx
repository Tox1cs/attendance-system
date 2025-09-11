"use client";

import { useState, useEffect } from "react";

type LeaveHistoryItem = { id: number; date: string; status: string; leave_type: string; requested_minutes: number; };
const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-600 bg-yellow-100", "Approved": "text-green-600 bg-green-100", "Rejected": "text-red-600 bg-red-100" };
const getAuthHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` });

export default function LeaveRequestPage() {
  const [leaveRequestDate, setLeaveRequestDate] = useState("");
  const [leaveType, setLeaveType] = useState("FULL_DAY");
  const [leaveMinutes, setLeaveMinutes] = useState(0);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveMessage, setLeaveMessage] = useState<{type: "success" | "error", text: string} | null>(null);
  const [history, setHistory] = useState<LeaveHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) { window.location.href = '/'; return; }
    try {
      const response = await fetch("http://localhost:8000/api/leave/my-history/", { headers: { "Authorization": `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch history.");
      const data = await response.json();
      setHistory(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveMessage(null);
    if (!leaveRequestDate) { setLeaveMessage({ type: "error", text: "Please select a date." }); return; }
    const minutes = leaveType === 'HOURLY' ? leaveMinutes : 0;
    if (leaveType === 'HOURLY' && minutes <= 0) { setLeaveMessage({ type: "error", text: "Minutes must be greater than 0 for hourly leave." }); return; }
    
    try {
      const response = await fetch("http://localhost:8000/api/leave/request/", {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ date: leaveRequestDate, leave_type: leaveType, requested_minutes: minutes, reason: leaveReason })
      });
      const data = await response.json();
      if (response.status === 201) {
        setLeaveMessage({ type: "success", text: "Leave request submitted!" });
        setLeaveRequestDate(""); setLeaveType("FULL_DAY"); setLeaveMinutes(0); setLeaveReason("");
        fetchHistory();
      } else {
        if (data.non_field_errors && data.non_field_errors.length > 0) {
            setLeaveMessage({ type: "error", text: data.non_field_errors[0] });
        } else {
            setLeaveMessage({ type: "error", text: "An unknown error occurred." });
        }
      }
    } catch (err) {
      setLeaveMessage({ type: "error", text: "Connection error." });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">Submit Leave Request</h2>
        <form onSubmit={handleLeaveRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Leave Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:w-64">
              <option value="FULL_DAY">Full-Day Leave</option>
              <option value="HOURLY">Hourly Leave</option>
            </select>
          </div>
          <div>
            <label htmlFor="leave-date" className="block text-sm font-medium text-gray-700">Date</label>
            <input id="leave-date" type="date" value={leaveRequestDate} onChange={(e) => setLeaveRequestDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:w-64"
            />
          </div>
          {leaveType === 'HOURLY' && (
            <div>
              <label htmlFor="leave-minutes" className="block text-sm font-medium text-gray-700">Duration (in Minutes)</label>
              <input id="leave-minutes" type="number" value={leaveMinutes} onChange={(e) => setLeaveMinutes(parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:w-64"
              />
            </div>
          )}
          <div>
            <label htmlFor="leave-reason" className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
            <textarea id="leave-reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" rows={3}
            />
          </div>
          {leaveMessage && <div className={`rounded-md p-3 text-sm ${leaveMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{leaveMessage.text}</div>}
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">Submit Leave Request</button>
        </form>
      </div>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">My Leave History</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Mins</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? ( <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">Loading...</td></tr> ) 
            : history.length === 0 ? ( <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">No leave requests.</td></tr> ) 
            : (
              history.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{item.date}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.leave_type}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.leave_type === 'Hourly Leave' ? item.requested_minutes : 'N/A'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColorMap[item.status] || 'bg-gray-100'}`}>{item.status}</span>
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