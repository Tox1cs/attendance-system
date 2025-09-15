"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import CustomDatePicker from "./CustomDatePicker";
import { format, parseISO } from "date-fns";
import CustomSelect, { type SelectOption } from "./ui/CustomSelect";
import TimePicker from "./ui/TimePicker";
import { motion } from "framer-motion";

type LeaveHistoryItem = {
  id: number;
  date: string;
  status: string;
  leave_type: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

type EditLeaveModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: LeaveHistoryItem | null;
};

const leaveTypeOptions: SelectOption[] = [
    { value: 'FULL_DAY', label: 'Full-Day Leave' },
    { value: 'HOURLY', label: 'Hourly Leave' },
];

export default function EditLeaveModal({ isOpen, onClose, onSuccess, request }: EditLeaveModalProps) {
  const [formData, setFormData] = useState({
    date: new Date(),
    leave_type: "FULL_DAY",
    start_time: "",
    end_time: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData({
        date: parseISO(request.date),
        leave_type: request.leave_type === 'Full-Day Leave' ? 'FULL_DAY' : 'HOURLY',
        start_time: request.start_time?.substring(0,5) || "",
        end_time: request.end_time?.substring(0,5) || "",
        reason: request.reason || "",
      });
    }
  }, [request]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleUpdate = async () => {
    if (!request) return;
    setLoading(true);
    
    const payload = { 
        ...formData,
        date: format(formData.date, "yyyy-MM-dd"),
        start_time: formData.leave_type === 'HOURLY' ? formData.start_time : null,
        end_time: formData.leave_type === 'HOURLY' ? formData.end_time : null,
    };

    const data = await apiClient(`/leave/request/${request.id}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (data) {
      toast.success("Leave request updated successfully!");
      onSuccess();
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Leave Request">
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Leave Type</label>
                    <CustomSelect 
                        options={leaveTypeOptions} 
                        value={formData.leave_type} 
                        onChange={(val) => setFormData({...formData, leave_type: val as string})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Date</label>
                    <CustomDatePicker selectedDate={formData.date} onSelectDate={(d) => d && setFormData({...formData, date: d})} />
                </div>
                {formData.leave_type === 'HOURLY' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Start Time</label>
                                <TimePicker value={formData.start_time} onChange={(val) => setFormData({...formData, start_time: val})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">End Time</label>
                                <TimePicker value={formData.end_time} onChange={(val) => setFormData({...formData, end_time: val})} />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason</label>
                    <textarea id="reason" name="reason" value={formData.reason} onChange={handleInputChange} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm" rows={4} />
                </div>
            </div>
        </div>
      <div className="flex justify-end space-x-3 border-t border-white/10 pt-4 mt-4">
        <button type="button" onClick={onClose} className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
          Cancel
        </button>
        <button type="button" onClick={handleUpdate} disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}