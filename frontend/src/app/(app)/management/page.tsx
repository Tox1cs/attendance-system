"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { ClockIcon, PaperAirplaneIcon, PencilSquareIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

type Employee = { id: number; full_name: string; };
type PendingRequest = { id: number; date: string; employee_name: string; [key: string]: any; };
type Tab = 'logs' | 'overtime' | 'leave' | 'mission';

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('logs');
  const [team, setTeam] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [counts, setCounts] = useState({ logs: 0, overtime: 0, leave: 0, mission: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    const [logData, otData, leaveData, missionData] = await Promise.all([
      apiClient("/manager/pending-logs/"),
      apiClient("/manager/pending-requests/"),
      apiClient("/manager/pending-leave/"),
      apiClient("/manager/pending-mission/")
    ]);
    setCounts({
      logs: logData?.length || 0,
      overtime: otData?.length || 0,
      leave: leaveData?.length || 0,
      mission: missionData?.length || 0,
    });
  }, []);

  const fetchRequestsForTab = useCallback(async (tab: Tab, employeeId: string) => {
    setLoading(true);
    let url = '';
    if (tab === 'logs') url = "/manager/pending-logs/";
    if (tab === 'overtime') url = "/manager/pending-requests/";
    if (tab === 'leave') url = "/manager/pending-leave/";
    if (tab === 'mission') url = "/manager/pending-mission/";
    
    if (employeeId !== "all") {
      url += `?employee_id=${employeeId}`;
    }

    const data = await apiClient(url);
    if (data) setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialFetch = async () => {
      await fetchCounts();
      const teamData = await apiClient('/team/');
      if (teamData) setTeam(teamData);
      await fetchRequestsForTab(activeTab, selectedEmployee);
    };
    initialFetch();
  }, [fetchCounts, fetchRequestsForTab, activeTab, selectedEmployee]);
  
  const handleReview = async (type: string, requestId: number, action: "APPROVE" | "REJECT") => {
    let url = '';
    if (type === 'logs') url = `/manager/review-log/${requestId}/`;
    if (type === 'mission') url = `/manager/review-mission/${requestId}/`;
    if (type === 'leave') url = `/manager/review-leave/${requestId}/`;
    if (type === 'overtime') url = `/manager/review/${requestId}/`;
    
    const response = await apiClient(url, { method: "POST", body: JSON.stringify({ action: action }) });
    if (response) {
      await fetchCounts();
      await fetchRequestsForTab(activeTab, selectedEmployee);
    }
  };

  const TabButton = ({ tabName, label, count, icon: Icon }: { tabName: Tab; label: string; count: number; icon: React.ElementType }) => (
    <button onClick={() => setActiveTab(tabName)}
      className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tabName ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-300 hover:bg-black/20 hover:text-white'}`}>
      <Icon className="h-5 w-5" /> {label}
      {count > 0 && <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-gray-900">{count}</span>}
    </button>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.h1 variants={itemVariants} className="text-3xl font-extrabold text-white text-center">Requests Management</motion.h1>
      
      <motion.div variants={itemVariants} className="rounded-xl border border-white/10 bg-black/20 p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center space-x-2">
            <TabButton tabName="logs" label="Manual Logs" count={counts.logs} icon={PencilSquareIcon} />
            <TabButton tabName="mission" label="Missions" count={counts.mission} icon={PaperAirplaneIcon} />
            <TabButton tabName="leave" label="Leaves" count={counts.leave} icon={CalendarDaysIcon} />
            <TabButton tabName="overtime" label="Overtimes" count={counts.overtime} icon={ClockIcon} />
          </nav>
          <div>
            <label htmlFor="employee-filter" className="sr-only">Filter by employee</label>
            <select id="employee-filter" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
              className="rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
              <option value="all">All Team Members</option>
              {team.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab + selectedEmployee} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="rounded-xl border border-white/10 bg-black/20 shadow-lg backdrop-blur-md">
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? <div className="p-8 text-center text-gray-400">Loading requests...</div> :
                     requests.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No pending requests in this category.</div> :
                     ( <table className="min-w-full"><thead className="sticky top-0 bg-black/30 backdrop-blur-lg">
                        {/* Headers will be dynamic in a more advanced version, for now we show common ones */}
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Action</th>
                        </tr>
                       </thead><tbody className="divide-y divide-white/10">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-white/5">
                                <td className="px-6 py-4 text-sm font-medium text-white">{req.employee_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-300">{req.date}</td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    {req.log_type && <span>{req.log_type} @ {req.time}</span>}
                                    {req.mission_type && <span>{req.mission_type}</span>}
                                    {req.leave_type && <span>{req.leave_type} ({req.requested_minutes}m)</span>}
                                    {req.requested_minutes === 0 && !req.leave_type && <span>OT Request</span>}
                                </td>
                                <td className="whitespace-nowrap space-x-2 px-6 py-4 text-sm font-medium">
                                    <button onClick={() => handleReview(activeTab, req.id, "APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Approve</button>
                                    <button onClick={() => handleReview(activeTab, req.id, "REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                                </td>
                            </tr>
                        ))}
                       </tbody></table>
                     )
                    }
                </div>
            </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}