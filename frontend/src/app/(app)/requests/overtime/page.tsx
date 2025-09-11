"use client";

import { useState, useEffect } from "react";

type OvertimeHistoryItem = { id: number; date: string; status: string; };
const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-600 bg-yellow-100", "Approved": "text-green-600 bg-green-100", "Rejected": "text-red-600 bg-red-100" };
const getAuthHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` });

export default function OvertimeRequestPage() {
  const [requestDate, setRequestDate] = useState("");
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);
  const [history, setHistory] = useState<OvertimeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) { window.location.href = '/'; return; }
    try {
      const response = await fetch("http://localhost:8000/api/requests/my-history/", { headers: { "Authorization": `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch history.");
      const data = await response.json();
      setHistory(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleOvertimeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!requestDate) {
      setMessage({ type: "error", text: "Please select a date." });
      return;
    }
    try {
      const response = await fetch("http://localhost:8000/api/overtime/request/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date: requestDate, requested_minutes: 0 })
      });
      
      const data = await response.json();

      if (response.status === 201) {
        setMessage({ type: "success", text: "Overtime request submitted!" });
        setRequestDate("");
        fetchHistory();
      } else {
        if (data.non_field_errors && data.non_field_errors.length > 0) {
            setMessage({ type: "error", text: data.non_field_errors[0] });
        } else {
            setMessage({ type: "error", text: "An unknown error occurred." });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error." });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">Submit Overtime Request</h2>
        <form onSubmit={handleOvertimeRequest} className="space-y-4">
          <div>
            <label htmlFor="ot-date" className="block text-sm font-medium text-gray-700">Date</label>
            <input id="ot-date" type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:w-64"
            />
          </div>
          {message && <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{message.text}</div>}
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Submit OT Request
          </button>
        </form>
      </div>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold text-gray-700">My Overtime History</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? ( <tr><td colSpan={2} className="p-4 text-center text-sm text-gray-500">Loading...</td></tr> ) 
            : history.length === 0 ? ( <tr><td colSpan={2} className="p-4 text-center text-sm text-gray-500">No OT requests.</td></tr> ) 
            : (
              history.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{item.date}</td>
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