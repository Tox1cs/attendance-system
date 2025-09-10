"use client";

import { useState, useEffect } from "react";

type LogHistoryItem = { id: number; date: string; time: string; log_type: string; status: string; reason: string; };
const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-600 bg-yellow-100", "Approved": "text-green-600 bg-green-100", "Rejected": "text-red-600 bg-red-100" };
const getAuthHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` });

export default function ManualLogPage() {
  const [reason, setReason] = useState("");
  const [pairDate, setPairDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);
  const [history, setHistory] = useState<LogHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) { window.location.href = '/'; return; }
    try {
      const response = await fetch("http://localhost:8000/api/log/my-history/", { headers: { "Authorization": `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch history.");
      const data = await response.json();
      setHistory(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSingleLog = async (logType: 'IN' | 'OUT') => {
    setMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/log/request-single/", {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ log_type: logType, reason: reason })
      });
      if (response.status !== 201) throw new Error("Failed to create single log request.");
      setMessage({ type: "success", text: `Clock-${logType.toLowerCase()} request submitted!` });
      setReason("");
      fetchHistory();
    } catch (err) { setMessage({ type: "error", text: "Request failed." }); }
  };
  
  const handlePairedLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!pairDate || !startTime || !endTime) { setMessage({ type: "error", text: "Please fill all date and time fields." }); return; }
    try {
      const response = await fetch("http://localhost:8000/api/log/request-pair/", {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ date: pairDate, start_time: startTime, end_time: endTime, reason: reason })
      });
      if (response.status !== 201) { const data = await response.json(); throw new Error(JSON.stringify(data)); }
      setMessage({ type: "success", text: "Paired log request submitted!" });
      setPairDate(""); setStartTime(""); setEndTime(""); setReason("");
      fetchHistory();
    } catch (err: any) { setMessage({ type: "error", text: `Request failed: ${err.message}` }); }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Real-time Log Request (Clock In/Out)</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="reason-single" className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
              <input id="reason-single" type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" placeholder="e.g., Starting remote work"/>
            </div>
            <div className="flex space-x-4">
              <button onClick={() => handleSingleLog('IN')} className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">Request Clock-In Now</button>
              <button onClick={() => handleSingleLog('OUT')} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700">Request Clock-Out Now</button>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Retrospective Log Request (Paired)</h2>
          <form onSubmit={handlePairedLog} className="space-y-4">
            <div>
              <label htmlFor="pair-date" className="block text-sm font-medium text-gray-700">Date</label>
              <input id="pair-date" type="date" value={pairDate} onChange={(e) => setPairDate(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">Start Time</label>
                <input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" />
              </div>
              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">End Time</label>
                <input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="reason-pair" className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
              <input id="reason-pair" type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" placeholder="e.g., Remote work on project X"/>
            </div>
            {message && <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{message.text}</div>}
            <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">Submit Paired Request</button>
          </form>
        </div>
      </div>
      
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">My Manual Log Request History</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date & Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (<tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">Loading...</td></tr>)
            : history.length === 0 ? (<tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">No manual log requests.</td></tr>)
            : (history.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4"><div className="font-medium text-gray-900">{item.date}</div><div className="text-gray-500">{item.time}</div></td>
                  <td className="px-4 py-4"><span className={`font-semibold ${item.log_type === 'Clock In' ? 'text-green-600' : 'text-red-600'}`}>{item.log_type}</span></td>
                  <td className="px-4 py-4 text-sm text-gray-500">{item.reason}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColorMap[item.status]}`}>{item.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}