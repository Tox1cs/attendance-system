"use client";

import { useState, useEffect, Fragment } from "react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { PencilIcon, TrashIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import CustomDatePicker from "@/components/CustomDatePicker";
import { format } from "date-fns";
import Modal from "@/components/Modal";
import ConfirmationModal from "@/components/ConfirmationModal";
import EditMissionModal from "@/components/EditMissionModal";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import TimePicker from "@/components/ui/TimePicker";
import { Popover, Transition } from "@headlessui/react";

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } } };

type MissionHistoryItem = { 
  id: number; 
  date: string; 
  status: string; 
  mission_type: string; 
  start_time: string | null; 
  end_time: string | null; 
  destination: string | null;
  reason: string | null; 
};

const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-400 bg-yellow-900/50", "Approved": "text-green-400 bg-green-900/50", "Rejected": "text-red-400 bg-red-900/50" };

const missionTypeOptions: SelectOption[] = [
    { value: 'FULL_DAY', label: 'Full-Day Mission' },
    { value: 'HOURLY', label: 'Hourly Mission' },
];

export default function MissionRequestPage() {
  const [missionDate, setMissionDate] = useState<Date | undefined>(undefined);
  const [missionType, setMissionType] = useState<string>("FULL_DAY");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<MissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonToShow, setReasonToShow] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<MissionHistoryItem | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await apiClient("/mission/my-history/");
    if (data) { setHistory(data); } 
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionDate) { toast.error("Please select a date."); return; }
    const formattedDate = format(missionDate, "yyyy-MM-dd");
    const payload: any = { date: formattedDate, mission_type: missionType, destination, reason };
    if (missionType === 'HOURLY') {
        if (!startTime || !endTime) { toast.error("Start and End time are required."); return; }
        payload.start_time = startTime;
        payload.end_time = endTime;
    }
    const data = await apiClient("/mission/request/", { method: "POST", body: JSON.stringify(payload) });
    if (data) {
        toast.success("Mission request submitted!");
        setMissionDate(undefined); setMissionType("FULL_DAY"); setStartTime("08:00"); setEndTime("10:00"); setDestination(""); setReason("");
        fetchHistory();
    }
  };

  const openEditModal = (request: MissionHistoryItem) => { setSelectedRequest(request); setIsEditModalOpen(true); };
  const openDeleteModal = (request: MissionHistoryItem) => { setSelectedRequest(request); setIsDeleteModalOpen(true); };
  const showReasonModal = (fullReason: string) => { setReasonToShow(fullReason); setIsReasonModalOpen(true); };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    const response = await apiClient(`/mission/request/${selectedRequest.id}/`, { method: 'DELETE' });
    if (response) {
        toast.success("Request deleted successfully.");
        fetchHistory();
        setIsDeleteModalOpen(false);
        setSelectedRequest(null);
    }
  };

  const ReasonCell = ({ reason }: { reason: string | null }) => {
    if (!reason) return <span className="text-gray-500">-</span>;
    const maxLength = 20;
    if (reason.length <= maxLength) { return <span className="text-gray-300">{reason}</span>; }
    return (
      <div className="flex items-center gap-2">
        <span>{`${reason.substring(0, maxLength)}...`}</span>
        <button onClick={() => showReasonModal(reason)} className="text-gray-400 hover:text-white">
            <InformationCircleIcon className="h-5 w-5"/>
        </button>
      </div>
    );
  };

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-md">
            <h2 className="mb-4 text-xl font-semibold text-white">Submit Mission Request</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Mission Type</label>
                <CustomSelect options={missionTypeOptions} value={missionType} onChange={(val) => setMissionType(val as string)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Date</label>
                <CustomDatePicker selectedDate={missionDate} onSelectDate={setMissionDate} />
              </div>
              <AnimatePresence>
                {missionType === 'HOURLY' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }} className="overflow-hidden">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Start Time</label>
                        <TimePicker value={startTime} onChange={setStartTime} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">End Time</label>
                        <TimePicker value={endTime} onChange={setEndTime} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-gray-300">Destination</label>
                <textarea id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm" rows={2}/>
              </div>
               <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason</label>
                <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm" rows={2}/>
              </div>
              <button type="submit" className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">Submit Request</button>
            </form>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="rounded-xl border border-white/10 bg-black/20 shadow-lg backdrop-blur-md">
            <h2 className="border-b border-white/10 p-6 text-xl font-semibold text-white">My Mission History</h2>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-800">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {loading ? ( <tr><td colSpan={6} className="p-4 text-center text-sm text-gray-400">Loading...</td></tr> ) 
                    : history.length === 0 ? ( <tr><td colSpan={6} className="p-4 text-center text-sm text-gray-400">No requests.</td></tr> ) 
                    : (
                    history.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-sm font-medium text-white">{item.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{item.mission_type}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-300">
                            {item.start_time ? `${item.start_time.substring(0,5)} - ${item.end_time?.substring(0,5)}` : (item.destination || "-")}
                        </td>
                        <td className="px-6 py-4 text-sm max-w-xs"><ReasonCell reason={item.reason} /></td>
                        <td className="px-6 py-4 text-sm"><span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${statusColorMap[item.status]}`}>{item.status}</span></td>
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
                </tbody>
                </table>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <EditMissionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} request={selectedRequest} onSuccess={() => { setIsEditModalOpen(false); fetchHistory(); }} />
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteRequest} title="Delete Mission Request" message="Are you sure you want to permanently delete this mission request?" confirmText="Delete"/>
      <Modal isOpen={isReasonModalOpen} onClose={() => setIsReasonModalOpen(false)} title="Full Reason">
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{reasonToShow}</p>
      </Modal>
    </>
  );
}