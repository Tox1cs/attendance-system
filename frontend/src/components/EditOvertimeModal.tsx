"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import CustomDatePicker from "./CustomDatePicker";
import { format, parseISO } from "date-fns";

type OvertimeHistoryItem = { id: number; date: string; status: string; requested_minutes: number; reason: string | null; };
type EditOvertimeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: OvertimeHistoryItem | null;
};

export default function EditOvertimeModal({ isOpen, onClose, onSuccess, request }: EditOvertimeModalProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setDate(parseISO(request.date));
      setReason(request.reason || "");
    }
  }, [request]);

  const handleUpdate = async () => {
    if (!request || !date) return;
    setLoading(true);
    const formattedDate = format(date, "yyyy-MM-dd");
    const data = await apiClient(`/overtime/request/${request.id}/`, {
      method: 'PUT',
      body: JSON.stringify({ date: formattedDate, requested_minutes: request.requested_minutes, reason: reason }),
    });
    setLoading(false);
    if (data) {
      toast.success("Request updated successfully!");
      onSuccess();
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Overtime Request">
      <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-4">
            <div>
            <label htmlFor="ot-date-edit" className="block text-sm font-medium text-gray-300">
                Date
            </label>
            <CustomDatePicker selectedDate={date} onSelectDate={setDate} />
            </div>
            <div>
            <label htmlFor="ot-reason-edit" className="block text-sm font-medium text-gray-300">
                Reason
            </label>
            <textarea id="ot-reason-edit" value={reason} onChange={(e) => setReason(e.target.value)} rows={5}
                className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm"
            />
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