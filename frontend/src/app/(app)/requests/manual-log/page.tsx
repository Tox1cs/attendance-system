"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { motion, Variants, AnimatePresence } from "framer-motion";
import CustomDatePicker from "@/components/CustomDatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { format } from "date-fns";
import { PencilIcon, TrashIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import EditManualLogModal from "@/components/EditManualLogModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import Modal from "@/components/Modal";
import { RadioGroup } from "@headlessui/react";

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } } };

type ManualLogHistoryItem = {
  id: number;
  date: string;
  time: string;
  log_type: string;
  status: string;
  reason: string | null;
};

const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-400 bg-yellow-900/50", "Approved": "text-green-400 bg-green-900/50", "Rejected": "text-red-400 bg-red-900/50" };
type FormMode = 'now' | 'past';

export default function ManualLogPage() {
  const [mode, setMode] = useState<FormMode>('now');
  const [reason, setReason] = useState("");
  const [pairDate, setPairDate] = useState<Date|undefined>(new Date());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [history, setHistory] = useState<ManualLogHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonToShow, setReasonToShow] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ManualLogHistoryItem | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await apiClient("/log/my-history/");
    if (data) { setHistory(data); }
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSingleLog = async (logType: 'IN' | 'OUT') => {
    const data = await apiClient("/log/request-single/", { method: "POST", body: JSON.stringify({ log_type: logType, reason: reason }) });
    if (data) { toast.success(`Request submitted!`); setReason(""); fetchHistory(); }
  };
  
  const handlePairedLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairDate) { toast.error("Please select a date."); return; }
    const formattedDate = format(pairDate, "yyyy-MM-dd");
    const data = await apiClient("/log/request-pair/", { method: "POST", body: JSON.stringify({ date: formattedDate, start_time: startTime, end_time: endTime, reason: "" }) });
    if (data) {
      toast.success("Paired log request submitted!");
      setPairDate(new Date()); setStartTime("08:00"); setEndTime("17:00");
      fetchHistory();
    }
  };
  
  const openEditModal = (request: ManualLogHistoryItem) => { setSelectedRequest(request); setIsEditModalOpen(true); };
  const openDeleteModal = (request: ManualLogHistoryItem) => { setSelectedRequest(request); setIsDeleteModalOpen(true); };
  const showReasonModal = (fullReason: string) => { setReasonToShow(fullReason); setIsReasonModalOpen(true); };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    const response = await apiClient(`/log/request/${selectedRequest.id}/`, { method: 'DELETE' });
    if (response) {
        toast.success("Request deleted successfully.");
        fetchHistory();
        setIsDeleteModalOpen(false);
        setSelectedRequest(null);
    }
  };
  
  const ReasonCell = ({ reason }: { reason: string | null }) => {
    if (!reason) return <span className="text-gray-500">-</span>;
    const maxLength = 25;
    if (reason.length <= maxLength) { return <span className="text-gray-300">{reason}</span>; }
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-300">{`${reason.substring(0, maxLength)}...`}</span>
        <button onClick={() => showReasonModal(reason)} className="text-gray-400 hover:text-white"><InformationCircleIcon className="h-5 w-5"/></button>
      </div>
    );
  };

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          <div className="rounded-xl border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-md">
            <RadioGroup value={mode} onChange={setMode} className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-1">
              <RadioGroup.Option value="now" className={({ checked }) => `${checked ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-white/10'} cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold`}>Log for Now</RadioGroup.Option>
              <RadioGroup.Option value="past" className={({ checked }) => `${checked ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-white/10'} cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold`}>Log for Past</RadioGroup.Option>
            </RadioGroup>
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {mode === 'now' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400">Request a clock-in or clock-out for the current time.</p>
                    <div>
                      <label htmlFor="reason-single" className="block text-sm font-medium text-gray-300">Reason (Optional)</label>
                      <input id="reason-single" type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm"/>
                    </div>
                    <div className="flex space-x-4">
                      <button onClick={() => handleSingleLog('IN')} className="flex-1 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500">Request Clock-In Now</button>
                      <button onClick={() => handleSingleLog('OUT')} className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500">Request Clock-Out Now</button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePairedLog} className="space-y-4">
                    <p className="text-xs text-gray-400">Request log entries for a past date with start and end times.</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Date</label>
                      <CustomDatePicker selectedDate={pairDate} onSelectDate={setPairDate} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Start Time</label>
                        <TimePicker value={startTime} onChange={setStartTime} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">End Time</label>
                        <TimePicker value={endTime} onChange={setEndTime} />
                      </div>
                    </div>
                    <button type="submit" className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">Submit Paired Request</button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="rounded-xl border border-white/10 bg-black/20 shadow-lg backdrop-blur-md">
            <h2 className="border-b border-white/10 p-6 text-xl font-semibold text-white">My Manual Log History</h2>
            <div className="max-h-[75vh] overflow-y-auto custom-scrollbar">
              <table className="min-w-full"><thead className="sticky top-0 bg-gray-800"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-300">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-300">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-300">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-300">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-300">Actions</th>
              </tr></thead><tbody className="divide-y divide-white/10">
                {loading ? (<tr><td colSpan={6} className="p-4 text-center text-sm text-gray-400">Loading...</td></tr>)
                : history.length === 0 ? (<tr><td colSpan={6} className="p-4 text-center text-sm text-gray-400">No requests.</td></tr>)
                : (history.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="px-4 py-4 text-sm font-medium text-white">{item.date}</td>
                      <td className="px-4 py-4 text-sm font-mono text-gray-300">{item.time.substring(0,5)}</td>
                      <td className="px-4 py-4"><span className={`font-semibold ${item.log_type === 'Clock In' ? 'text-green-400' : 'text-red-400'}`}>{item.log_type}</span></td>
                      <td className="px-4 py-4 text-sm max-w-xs"><ReasonCell reason={item.reason} /></td>
                      <td className="px-4 py-4"><span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${statusColorMap[item.status]}`}>{item.status}</span></td>
                      <td className="px-6 py-4 text-sm font-medium">
                          {item.status === 'Pending' ? (
                              <div className="flex items-center space-x-4">
                                  <button onClick={() => openEditModal(item)} className="text-indigo-400 hover:text-indigo-300"><PencilIcon className="h-5 w-5"/></button>
                                  <button onClick={() => openDeleteModal(item)} className="text-gray-400 hover:text-red-400"><TrashIcon className="h-5 w-5"/></button>
                              </div>
                          ) : ( <span className="text-xs text-gray-500 italic">No actions</span> )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody></table>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <EditManualLogModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} request={selectedRequest} onSuccess={() => { setIsEditModalOpen(false); fetchHistory(); }} />
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteRequest} title="Delete Log Request" message="Are you sure you want to delete this log request?" confirmText="Delete"/>
      <Modal isOpen={isReasonModalOpen} onClose={() => setIsReasonModalOpen(false)} title="Full Reason">
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{reasonToShow}</p>
      </Modal>
    </>
  );
}