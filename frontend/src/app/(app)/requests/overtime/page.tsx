"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { PencilIcon, TrashIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import EditOvertimeModal from "@/components/EditOvertimeModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import Modal from "@/components/Modal";
import { motion, Variants } from "framer-motion";
import CustomDatePicker from "@/components/CustomDatePicker";
import { format } from "date-fns";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } } };

type OvertimeHistoryItem = { id: number; date: string; status: string; requested_minutes: number; reason: string | null; };
const statusColorMap: { [key: string]: string } = { "Pending": "text-yellow-400 bg-yellow-900/50", "Approved": "text-green-400 bg-green-900/50", "Rejected": "text-red-400 bg-red-900/50" };

export default function OvertimeRequestPage() {
  const [requestDate, setRequestDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<OvertimeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonToShow, setReasonToShow] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<OvertimeHistoryItem | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await apiClient("/requests/my-history/");
    if (data) { setHistory(data); } 
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate) { toast.error("Please select a date."); return; }
    const formattedDate = format(requestDate, "yyyy-MM-dd");
    const data = await apiClient("/overtime/request/", {
        method: "POST",
        body: JSON.stringify({ date: formattedDate, requested_minutes: 0, reason: reason })
    });
    if (data) {
        toast.success("Overtime request submitted successfully!");
        setRequestDate(undefined);
        setReason("");
        fetchHistory();
    }
  };

  const openEditModal = (request: OvertimeHistoryItem) => {
    setSelectedRequest(request);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (request: OvertimeHistoryItem) => {
    setSelectedRequest(request);
    setIsDeleteModalOpen(true);
  };
  
  const showReasonModal = (fullReason: string) => {
    setReasonToShow(fullReason);
    setIsReasonModalOpen(true);
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    const response = await apiClient(`/overtime/request/${selectedRequest.id}/`, { method: 'DELETE' });
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
            <h2 className="mb-4 text-xl font-semibold text-white">Submit Overtime Request</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label htmlFor="ot-date" className="block text-sm font-medium text-gray-300">Date</label>
                <CustomDatePicker selectedDate={requestDate} onSelectDate={setRequestDate} />
              </div>
              <div>
                <label htmlFor="ot-reason" className="block text-sm font-medium text-gray-300">Reason</label>
                <textarea id="ot-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                  className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                Submit Request
              </button>
            </form>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="rounded-xl border border-white/10 bg-black/20 shadow-lg backdrop-blur-md">
            <h2 className="border-b border-white/10 p-6 text-xl font-semibold text-white">My Overtime History</h2>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-800">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {loading ? ( <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-400">Loading...</td></tr> ) 
                    : history.length === 0 ? ( <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-400">No requests.</td></tr> ) 
                    : (
                    history.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">{item.date}</td>
                        <td className="px-6 py-4 text-sm max-w-xs">
                           <ReasonCell reason={item.reason} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${statusColorMap[item.status] || 'bg-gray-700'}`}>{item.status}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                            {item.status === 'Pending' ? (
                                <div className="flex items-center space-x-4">
                                    <button onClick={() => openEditModal(item)} className="text-indigo-400 hover:text-indigo-300">
                                        <PencilIcon className="h-5 w-5"/>
                                    </button>
                                    <button onClick={() => openDeleteModal(item)} className="text-gray-400 hover:text-red-400">
                                        <TrashIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500 italic">No actions</span>
                            )}
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
      <EditOvertimeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        request={selectedRequest}
        onSuccess={() => {
            setIsEditModalOpen(false);
            fetchHistory();
        }}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRequest}
        title="Delete Overtime Request"
        message="Are you sure you want to permanently delete this request?"
        confirmText="Delete"
      />
      <Modal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        title="Full Reason"
      >
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{reasonToShow}</p>
      </Modal>
    </>
  );
}