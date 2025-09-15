"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircleIcon, XCircleIcon, GiftIcon, MoonIcon, 
  ArchiveBoxArrowDownIcon, ClockIcon 
} from "@heroicons/react/24/solid";
import apiClient from "@/lib/apiClient";
import { motion, Variants } from "framer-motion";
import CustomDatePicker from "@/components/CustomDatePicker";
import { format } from "date-fns";

type DayStatus = "HOLIDAY" | "LEAVE_FULL" | "LEAVE_HOURLY" | "WEEKEND_OFF" | "ABSENT" | "PRESENT" | "Unknown";
type DayLogData = { date: string; status: DayStatus; status_info: string; logs: string[]; };
type StatusDisplayConfig = { icon: React.ElementType; label: string; iconClassName: string; };
type SummaryStats = { workedDays: number; leaveDays: number; absentDays: number; avgCheckIn: string; };

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } } };

const statusMap: Record<DayStatus, StatusDisplayConfig> = {
  "PRESENT":    { icon: CheckCircleIcon, label: "Present", iconClassName: "text-green-400" },
  "LEAVE_FULL": { icon: ArchiveBoxArrowDownIcon, label: "On Leave", iconClassName: "text-blue-400" },
  "LEAVE_HOURLY":{ icon: ArchiveBoxArrowDownIcon, label: "Hourly Leave",  iconClassName: "text-sky-400" },
  "ABSENT":     { icon: XCircleIcon, label: "Absent", iconClassName: "text-red-400" },
  "HOLIDAY":    { icon: GiftIcon, label: "Holiday", iconClassName: "text-purple-400" },
  "WEEKEND_OFF":{ icon: MoonIcon, label: "Weekend", iconClassName: "text-gray-400" },
  "Unknown":    { icon: ClockIcon, label: "N/A", iconClassName: "text-gray-500" }
};

const getThisMonthRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { firstDay, lastDay };
};

const calculatePresenceDuration = (logs: string[]): string => {
  if (logs.length < 2) return ""; 
  const firstLog = logs[0]; const lastLog = logs[logs.length - 1];
  const [h1, m1, s1] = firstLog.split(':').map(Number); const [h2, m2, s2] = lastLog.split(':').map(Number);
  const firstTotalSeconds = (h1 * 3600) + (m1 * 60) + (s1 || 0); const lastTotalSeconds = (h2 * 3600) + (m2 * 60) + (s2 || 0);
  let durationInSeconds = lastTotalSeconds - firstTotalSeconds;
  if (durationInSeconds <= 0) return "";
  const hours = Math.floor(durationInSeconds / 3600); durationInSeconds %= 3600; const minutes = Math.floor(durationInSeconds / 60);
  return `${hours}h ${minutes}m`;
};

const formatLogTime = (time: string | undefined): string => {
    if (!time) return "--";
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
};

const getDayInfo = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00Z'); 
    const dayNumber = date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'UTC' });
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const jsWeekday = date.getUTCDay(); 
    return { dayNumber, dayName, jsWeekday };
};

const jsDayToGridCol: Record<number, number> = { 6: 1, 0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, };

export default function MyActivityPage() {
  const { firstDay, lastDay } = getThisMonthRange();
  const [startDate, setStartDate] = useState<Date | undefined>(firstDay);
  const [endDate, setEndDate] = useState<Date | undefined>(lastDay);
  const [activityReport, setActivityReport] = useState<DayLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstDayStartColumn, setFirstDayStartColumn] = useState<number | undefined>(undefined);

  const summaryStats = useMemo<SummaryStats>(() => {
    if (!activityReport || activityReport.length === 0) {
      return { workedDays: 0, leaveDays: 0, absentDays: 0, avgCheckIn: "N/A" };
    }
    const workedDays = activityReport.filter(d => d.status === 'PRESENT' || d.status === 'LEAVE_HOURLY').length;
    const leaveDays = activityReport.filter(d => d.status === 'LEAVE_FULL').length;
    const absentDays = activityReport.filter(d => d.status === 'ABSENT').length;
    
    const checkInTimes = activityReport
        .filter(d => d.logs && d.logs.length > 0)
        .map(d => {
            const [h, m] = d.logs[0].split(':').map(Number);
            return h * 60 + m;
        });
    
    let avgCheckIn = "N/A";
    if (checkInTimes.length > 0) {
        const avgMinutes = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
        const avgH = Math.floor(avgMinutes / 60).toString().padStart(2, '0');
        const avgM = Math.round(avgMinutes % 60).toString().padStart(2, '0');
        avgCheckIn = `${avgH}:${avgM}`;
    }

    return { workedDays, leaveDays, absentDays, avgCheckIn };
  }, [activityReport]);

  const fetchLogs = async () => {
    setLoading(true);
    setActivityReport([]);
    setFirstDayStartColumn(undefined);
    if (!startDate || !endDate) return;

    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");
    
    const data = await apiClient(`/logs/my-grouped-logs/?start_date=${formattedStart}&end_date=${formattedEnd}`);
    if (data) {
        setActivityReport(data);
        if (data.length > 0) {
            const { jsWeekday } = getDayInfo(data[0].date);
            const startCol = jsDayToGridCol[jsWeekday as keyof typeof jsDayToGridCol];
            setFirstDayStartColumn(startCol);
        }
    }
    setLoading(false);
  };

  useEffect(() => {
     fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const StatCard = ({ title, value, icon: Icon }: {title: string, value: string | number, icon: React.ElementType}) => (
    <motion.div variants={itemVariants} className="rounded-xl border border-white/10 bg-black/20 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center">
            <div className="flex-shrink-0"><Icon className="h-6 w-6 text-gray-400"/></div>
            <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    </motion.div>
  );

  return (
    <div className="min-h-full bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl text-white">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.h1 variants={itemVariants} className="mb-6 text-3xl font-extrabold text-white text-center">My Activity Log</motion.h1>
        
        <motion.div variants={itemVariants} className="mb-8 rounded-xl border border-white/10 bg-black/10 p-4 shadow-lg backdrop-blur-md">
            <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]"><label className="block text-sm font-medium text-gray-300">Start Date</label><CustomDatePicker selectedDate={startDate} onSelectDate={setStartDate}/></div>
            <div className="flex-1 min-w-[200px]"><label className="block text-sm font-medium text-gray-300">End Date</label><CustomDatePicker selectedDate={endDate} onSelectDate={setEndDate} /></div>
            </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Worked Days" value={summaryStats.workedDays} icon={CheckCircleIcon} />
            <StatCard title="Leave Days" value={summaryStats.leaveDays} icon={ArchiveBoxArrowDownIcon} />
            <StatCard title="Absent Days" value={summaryStats.absentDays} icon={XCircleIcon} />
            <StatCard title="Avg. Check-in" value={summaryStats.avgCheckIn} icon={ClockIcon} />
        </motion.div>

        <motion.div variants={itemVariants}>
            <div className="grid grid-cols-7 gap-px rounded-t-lg bg-black/20 p-3 text-center text-sm font-bold text-white">
            <div>Saturday</div><div>Sunday</div><div>Monday</div><div>Tuesday</div><div>Wednesday</div><div>Thursday</div><div>Friday</div>
            </div>

            {loading && (<div className="rounded-b-lg bg-black/10 p-8 text-center text-gray-300 shadow-lg backdrop-blur-md">Loading data...</div>)}
            {!loading && activityReport.length === 0 && (<div className="rounded-b-lg bg-black/10 p-8 text-center text-gray-300 shadow-lg backdrop-blur-md">No activity to display.</div>)}
            
            {!loading && activityReport.length > 0 && (
            <div className="grid grid-cols-7 gap-px bg-black/20 rounded-b-lg shadow-lg">
                {activityReport.map((day, index) => {
                    const config = statusMap[day.status] || statusMap["Unknown"];
                    const { dayNumber } = getDayInfo(day.date);
                    const firstLog = formatLogTime(day.logs[0]);
                    const lastLog = day.logs.length > 1 ? formatLogTime(day.logs[day.logs.length - 1]) : null;
                    const presence = calculatePresenceDuration(day.logs);
                    
                    const styleProps: React.CSSProperties = {};
                    if (index === 0 && firstDayStartColumn) { styleProps.gridColumnStart = firstDayStartColumn; }
                    
                    return (
                        <motion.div 
                            key={day.date} style={styleProps}
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: index * 0.02 }}
                            className={`relative min-h-[140px] border-r border-b border-white/5 bg-black/10 p-2 backdrop-blur-sm transition-all duration-300 hover:bg-black/30 hover:scale-105 hover:z-10 hover:shadow-2xl`}
                        >
                            <div className="flex justify-between font-bold text-white"><span className="text-lg">{dayNumber}</span></div>
                            <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${config.iconClassName}`}>
                                <config.icon className="h-4 w-4" /><span>{config.label}</span>
                            </div>
                            {(day.status === "PRESENT" || day.status === "LEAVE_HOURLY") && (
                                <div className="mt-2 space-y-1 font-mono text-xs text-gray-300">
                                    <div className="flex justify-between"><span>In:</span><span className="font-semibold text-white">{firstLog}</span></div>
                                    <div className="flex justify-between"><span>Out:</span><span className="font-semibold text-white">{lastLog || "--"}</span></div>
                                    <div className="mt-1 flex justify-between border-t border-white/10 pt-1 font-sans">
                                        <span className="font-semibold">Total:</span><span className="font-bold text-indigo-400">{presence}</span>
                                    </div>
                                </div>
                            )}
                            {(day.status !== "PRESENT" && day.status !== "LEAVE_HOURLY") && (<p className="mt-2 text-xs text-gray-400 italic">{day.status_info}</p>)}
                        </motion.div>
                    );
                })}
            </div>
            )}
        </motion.div>
      </motion.div>
    </div>
  );
}