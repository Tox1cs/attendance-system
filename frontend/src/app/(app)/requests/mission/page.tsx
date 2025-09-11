"use client";

import { useState, useEffect } from "react";

type MissionHistoryItem = { id: number; date: string; status: string; mission_type: string; start_time: string | null; end_time: string | null; destination: string; };
const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-600 bg-yellow-100", "Approved": "text-green-600 bg-green-100", "Rejected": "text-red-600 bg-red-100" };
const getAuthHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` });

export default function MissionRequestPage() {
  const [missionDate, setMissionDate] = useState("");
  const [missionType, setMissionType] = useState("FULL_DAY");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);
  const [history, setHistory] = useState<MissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) { window.location.href = '/'; return; }
    try {
      const response = await fetch("http://localhost:8000/api/mission/my-history/", { headers: { "Authorization": `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch history.");
      const data = await response.json();
      setHistory(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleMissionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!missionDate) { setMessage({ type: "error", text: "Please select a date." }); return; }
    const payload: any = { date: missionDate, mission_type: missionType, destination: destination, reason: reason };
    if (missionType === 'HOURLY') {
      if (!startTime || !endTime) { setMessage({ type: "error", text: "Start and End time are required for hourly missions." }); return; }
      payload.start_time = startTime; payload.end_time = endTime;
    }
    try {
      const response = await fetch("http://localhost:8000/api/mission/request/", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(payload) });
      const data = await response.json();
      if (response.status === 201) {
        setMessage({ type: "success", text: "Mission request submitted!" });
        setMissionDate(""); setMissionType("FULL_DAY"); setStartTime(""); setEndTime(""); setDestination(""); setReason("");
        fetchHistory();
      } else {
         if (data.non_field_errors && data.non_field_errors.length > 0) {
            setMessage({ type: "error", text: data.non_field_errors[0] });
         } else {
            setMessage({ type: "error", text: "An unknown error occurred." });
         }
      }
    } catch (err) { setMessage({ type: "error", text: "Connection error." }); }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">Submit Mission Request</h2>
        <form onSubmit={handleMissionRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mission Type</label>
            <select value={missionType} onChange={(e) => setMissionType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:w-64">
              <option value="FULL_DAY">Full-Day Mission</option>
              <option value="HOURLY">Hourly Mission</option>
            </select>
          </div>
          <div>
            <label htmlFor="mission-date" className="block text-sm font-medium text-gray-700">Date</label>
            <input id="mission-date" type="date" value={missionDate} onChange={(e) => setMissionDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:w-64" />
          </div>
          {missionType === 'HOURLY' && (
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" />
                </div>
                <div>
                  <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">End Time</label>
                  <input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" />
                </div>
            </div>
          )}
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700">Destination (Optional)</label>
            <input id="destination" type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
            <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm" rows={2} />
          </div>
          {message && <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{message.text}</div>}
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">Submit Mission Request</button>
        </form>
      </div>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">My Mission History</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Time Range</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
             {loading ? ( <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">Loading...</td></tr> ) 
            : history.length === 0 ? ( <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">No mission requests.</td></tr> ) 
            : (
              history.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{item.date}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.mission_type}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 font-mono">
                    {item.start_time ? `${item.start_time.substring(0,5)} - ${item.end_time?.substring(0,5)}` : 'N/A'}
                  </td>
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