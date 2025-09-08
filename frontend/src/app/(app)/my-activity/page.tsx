"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  GiftIcon, 
  MoonIcon, 
  ArchiveBoxArrowDownIcon, 
  ClockIcon 
} from "@heroicons/react/24/solid";

type DayStatus = "HOLIDAY" | "LEAVE_FULL" | "LEAVE_HOURLY" | "WEEKEND_OFF" | "ABSENT" | "PRESENT" | "Unknown";

type DayLogData = {
  date: string;
  status: DayStatus;
  status_info: string;
  logs: string[];
};

type StatusDisplayConfig = {
  icon: React.ElementType;
  label: string;
  badgeClassName: string; 
};

const statusMap: Record<DayStatus, StatusDisplayConfig> = {
  "PRESENT":    { icon: CheckCircleIcon, label: "Present", badgeClassName: "bg-green-100 text-green-800" },
  "LEAVE_FULL": { icon: ArchiveBoxArrowDownIcon, label: "On Leave (Full)", badgeClassName: "bg-blue-100 text-blue-800" },
  "LEAVE_HOURLY":{ icon: ArchiveBoxArrowDownIcon, label: "Hourly Leave", badgeClassName: "bg-blue-100 text-blue-800" },
  "ABSENT":     { icon: XCircleIcon, label: "Absent", badgeClassName: "bg-red-100 text-red-800" },
  "HOLIDAY":    { icon: GiftIcon, label: "Holiday", badgeClassName: "bg-purple-100 text-purple-800" },
  "WEEKEND_OFF":{ icon: MoonIcon, label: "Weekend", badgeClassName: "bg-gray-100 text-gray-700" },
  "Unknown":    { icon: ClockIcon, label: "N/A", badgeClassName: "bg-gray-100 text-gray-700" }
};


const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
});

const getThisMonthRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay, lastDay };
}

const calculatePresenceDuration = (logs: string[]): string => {
  if (logs.length < 2) return "--"; 
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];
  const [h1, m1, s1] = firstLog.split(':').map(Number);
  const [h2, m2, s2] = lastLog.split(':').map(Number);
  const firstTotalSeconds = (h1 * 3600) + (m1 * 60) + (s1 || 0);
  const lastTotalSeconds = (h2 * 3600) + (m2 * 60) + (s2 || 0);
  let durationInSeconds = lastTotalSeconds - firstTotalSeconds;
  if (durationInSeconds <= 0) return "--";
  const hours = Math.floor(durationInSeconds / 3600);
  durationInSeconds %= 3600;
  const minutes = Math.floor(durationInSeconds / 60);
  return `${hours}h ${minutes}m`;
};

const formatLogTime = (time: string | undefined): string => {
    if (!time) return "--";
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}:${parts[2] || '00'}`;
};

const getDayInfo = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00Z'); 
    const dayNumber = date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'UTC' });
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const jsWeekday = date.getUTCDay(); 
    return { dayNumber, dayName, jsWeekday };
};

const jsDayToGridCol: Record<number, number> = {
    6: 1, 0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 
};

export default function MyActivityPage() {
  const { firstDay, lastDay } = getThisMonthRange();
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [activityReport, setActivityReport] = useState<DayLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstDayStartColumn, setFirstDayStartColumn] = useState<number | undefined>(undefined);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    setActivityReport([]);
    setFirstDayStartColumn(undefined);
    const headers = getAuthHeaders();
    if (!headers["Authorization"]?.includes("Bearer ey")) {
         setError("Authentication token not found. Please log out and log back in.");
         setLoading(false);
         return;
    }
    try {
        const response = await fetch(
            `http://localhost:8000/api/logs/my-grouped-logs/?start_date=${startDate}&end_date=${endDate}`, 
            { headers }
        );
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to fetch logs");
        }
        const data: DayLogData[] = await response.json();
        setActivityReport(data);
        if (data.length > 0) {
            const { jsWeekday } = getDayInfo(data[0].date);
            const startCol = jsDayToGridCol[jsWeekday as keyof typeof jsDayToGridCol];
            setFirstDayStartColumn(startCol);
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     fetchLogs();
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-gray-800">My Activity Log</h1>
      
      <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded-md border-gray-300 text-gray-900 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block rounded-md border-gray-300 text-gray-900 shadow-sm"
            />
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Generate Report"}
          </button>
        </div>
         {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 rounded-t-lg bg-gray-800 p-2 text-center text-xs font-semibold text-white">
          <div>Saturday</div>
          <div>Sunday</div>
          <div>Monday</div>
          <div>Tuesday</div>
          <div>Wednesday</div>
          <div>Thursday</div>
          <div>Friday</div>
        </div>

        {loading && (
            <div className="rounded-b-lg bg-white p-8 text-center text-gray-500 shadow-md">Loading data...</div>
        )}
        {!loading && activityReport.length === 0 && !error && (
            <div className="rounded-b-lg bg-white p-8 text-center text-gray-500 shadow-md">No activity to display.</div>
        )}
        
        {!loading && activityReport.length > 0 && (
          <div className="grid grid-cols-7 gap-px border-l border-gray-200 bg-gray-200 shadow-md">
            {activityReport.map((day, index) => {
                const config = statusMap[day.status] || statusMap["Unknown"];
                const { dayNumber, dayName } = getDayInfo(day.date);
                const firstLog = formatLogTime(day.logs[0]);
                const lastLog = day.logs.length > 1 ? formatLogTime(day.logs[day.logs.length - 1]) : null;
                const presence = calculatePresenceDuration(day.logs);
                
                const styleProps: React.CSSProperties = {};
                if (index === 0 && firstDayStartColumn) {
                    styleProps.gridColumnStart = firstDayStartColumn;
                }
                
                return (
                    <div 
                        key={day.date} 
                        style={styleProps}
                        className={`min-h-[140px] border-r border-b border-gray-200 bg-white p-2`}
                    >
                        <div className="flex justify-between font-bold text-gray-800">
                            <span className="text-lg">{dayNumber}</span>
                            <span className="text-xs font-medium text-gray-500">{dayName}</span>
                        </div>
                        
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClassName}`}>
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </div>
                        
                        {(day.status === "PRESENT" || day.status === "LEAVE_HOURLY") && (
                             <div className="mt-2 space-y-1 font-mono text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">In:</span>
                                    <span className="font-semibold text-gray-800">{firstLog}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Out:</span>
                                    <span className="font-semibold text-gray-800">{lastLog || "--"}</span>
                                </div>
                                <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-sans">
                                    <span className="font-semibold text-gray-500">Total:</span>
                                    <span className="font-bold text-indigo-600">{presence}</span>
                                </div>
                             </div>
                        )}
                        
                         {(day.status !== "PRESENT" && day.status !== "LEAVE_HOURLY") && (
                            <p className="mt-2 text-xs text-gray-500 italic">{day.status_info}</p>
                         )}
                    </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
}