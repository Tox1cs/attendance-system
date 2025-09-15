"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import CustomDatePicker from "@/components/CustomDatePicker";
import { format, parseISO } from "date-fns";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import TimePicker from "@/components/ui/TimePicker";

type ManualLogHistoryItem = {
  id: number;
  date: string;
  time: string;
  log_type: string;
  status: string;
  reason: string | null;
};

type EditManualLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: ManualLogHistoryItem | null;
};

const logTypeOptions: SelectOption[] = [
    { value: 'IN', label: 'Clock In' },
    { value: 'OUT', label: 'Clock Out' },
];

export default function EditManualLogModal({ isOpen, onClose, onSuccess, request }: EditManualLogModalProps) {
  const [formData, setFormData] = useState({ date: new Date(), time: "", log_type: "IN", reason: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      const requestTime = request.time || "00:00:00";
      setFormData({
        date: parseISO(request.date),
        time: requestTime.substring(0,5),
        log_type: request.log_type === 'Clock In' ? 'IN' : 'OUT',
        reason: request.reason || "",
      });
    }
  }, [request]);

  const handleUpdate = async () => {
    if (!request) return;
    setLoading(true);
    
    const payload = { 
        date: format(formData.date, "yyyy-MM-dd"),
        time: formData.time,
        log_type: formData.log_type,
        reason: formData.reason
    };

    const data = await apiClient(`/log/request/${request.id}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (data) {
      toast.success("Log request updated successfully!");
      onSuccess();
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Manual Log Request">
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">Date</label>
                <CustomDatePicker selectedDate={formData.date} onSelectDate={(d) => d && setFormData({...formData, date: d})} />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Time</label>
                <TimePicker value={formData.time} onChange={(val) => setFormData({...formData, time: val})} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Log Type</label>
                <CustomSelect 
                    options={logTypeOptions} 
                    value={formData.log_type} 
                    onChange={(val) => setFormData({...formData, log_type: val as string})} 
                />
            </div>
            <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason</label>
                <textarea id="reason" name="reason" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm" rows={3} />
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