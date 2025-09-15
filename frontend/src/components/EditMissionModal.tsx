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

type MissionHistoryItem = {
  id: number;
  date: string;
  mission_type: string;
  start_time: string | null;
  end_time: string | null;
  destination: string | null;
  reason: string | null;
};

type EditMissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: MissionHistoryItem | null;
};

const missionTypeOptions: SelectOption[] = [
    { value: 'FULL_DAY', label: 'Full-Day Mission' },
    { value: 'HOURLY', label: 'Hourly Mission' },
];

export default function EditMissionModal({ isOpen, onClose, onSuccess, request }: EditMissionModalProps) {
  const [formData, setFormData] = useState({
    date: new Date(),
    mission_type: "FULL_DAY",
    start_time: "",
    end_time: "",
    destination: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData({
        date: parseISO(request.date),
        mission_type: request.mission_type === 'Full-Day Mission' ? 'FULL_DAY' : 'HOURLY',
        start_time: request.start_time?.substring(0,5) || "",
        end_time: request.end_time?.substring(0,5) || "",
        destination: request.destination || "",
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
        start_time: formData.mission_type === 'HOURLY' ? formData.start_time : null,
        end_time: formData.mission_type === 'HOURLY' ? formData.end_time : null,
    };

    const data = await apiClient(`/mission/request/${request.id}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (data) {
      toast.success("Mission request updated successfully!");
      onSuccess();
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Mission Request">
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Mission Type</label>
                    <CustomSelect 
                        options={missionTypeOptions} 
                        value={formData.mission_type} 
                        onChange={(val) => setFormData({...formData, mission_type: val as string})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Date</label>
                    <CustomDatePicker selectedDate={formData.date} onSelectDate={(d) => d && setFormData({...formData, date: d})} />
                </div>
                {formData.mission_type === 'HOURLY' && (
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
                    <label htmlFor="destination" className="block text-sm font-medium text-gray-300">Destination</label>
                    <textarea id="destination" name="destination" value={formData.destination} onChange={handleInputChange} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm" rows={2}/>
                </div>
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason</label>
                    <textarea id="reason" name="reason" value={formData.reason} onChange={handleInputChange} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 text-white shadow-sm" rows={3} />
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