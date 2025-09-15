"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { motion, Variants } from "framer-motion";
import TimePicker from "@/components/ui/TimePicker";
import Switch from "@/components/ui/Switch";

type ShiftDayRule = {
    id: number;
    day_of_week: number;
    is_work_day: boolean;
    start_time: string;
    end_time: string;
    required_work_minutes: number;
};

type ShiftDetail = {
    id: number;
    name: string;
    day_rules: ShiftDayRule[];
};

const dayOfWeekMap: { [key: number]: string } = {
    0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"
};

const dayOrder = [5, 6, 0, 1, 2, 3, 4];

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } };

export default function EditShiftPage() {
  const params = useParams();
  const router = useRouter();
  const shiftId = params.id;

  const [shift, setShift] = useState<ShiftDetail | null>(null);
  const [initialShift, setInitialShift] = useState<ShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchShiftDetails = useCallback(async () => {
    if (!shiftId) return;
    setLoading(true);
    const data = await apiClient(`/shifts/${shiftId}/`);
    if (data) {
        data.day_rules.sort((a: ShiftDayRule, b: ShiftDayRule) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week));
        setShift(data);
        setInitialShift(JSON.parse(JSON.stringify(data)));
    }
    setLoading(false);
  }, [shiftId]);

  useEffect(() => {
    fetchShiftDetails();
  }, [fetchShiftDetails]);
  
  const handleRuleChange = (ruleId: number, field: keyof ShiftDayRule, value: any) => {
    if (!shift) return;
    const updatedRules = shift.day_rules.map(rule => 
        rule.id === ruleId ? { ...rule, [field]: value } : rule
    );
    setShift({ ...shift, day_rules: updatedRules });
  };
  
  const handleSave = async () => {
    if (!shift) return;
    setIsSaving(true);
    const data = await apiClient(`/shifts/${shift.id}/`, {
        method: 'PUT',
        body: JSON.stringify(shift),
    });
    if(data) {
        toast.success(`Shift "${data.name}" updated successfully!`);
        data.day_rules.sort((a: ShiftDayRule, b: ShiftDayRule) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week));
        setShift(data);
        setInitialShift(JSON.parse(JSON.stringify(data)));
    }
    setIsSaving(false);
  };
  
  const isChanged = JSON.stringify(shift) !== JSON.stringify(initialShift);

  if (loading) return <div className="text-center text-white">Loading shift details...</div>;
  if (!shift) return <div className="text-center text-red-400">Could not load shift data.</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Settings
        </button>
        <h1 className="mb-6 text-3xl font-bold text-white">Edit Shift: <span className="text-indigo-400">{shift.name}</span></h1>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="rounded-xl border border-white/10 bg-black/20 shadow-lg backdrop-blur-md">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-black/20">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-300 tracking-wider">Day</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-300 tracking-wider">Work Day?</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-300 tracking-wider">Start Time</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-300 tracking-wider">End Time</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-300 tracking-wider">Required (Mins)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {shift.day_rules.map((rule) => (
                            <motion.tr key={rule.id} variants={itemVariants} className={`transition-opacity ${!rule.is_work_day ? 'opacity-60' : ''}`}>
                                <td className="whitespace-nowrap px-6 py-3 text-sm font-semibold text-white">{dayOfWeekMap[rule.day_of_week]}</td>
                                <td className="whitespace-nowrap px-6 py-3">
                                    <Switch checked={rule.is_work_day} onChange={(checked) => handleRuleChange(rule.id, 'is_work_day', checked)} />
                                </td>
                                <td className="whitespace-nowrap px-6 py-3">
                                    <TimePicker value={rule.start_time.substring(0,5)} onChange={(time) => handleRuleChange(rule.id, 'start_time', time)} />
                                </td>
                                <td className="whitespace-nowrap px-6 py-3">
                                    <TimePicker value={rule.end_time.substring(0,5)} onChange={(time) => handleRuleChange(rule.id, 'end_time', time)} />
                                </td>
                                <td className="whitespace-nowrap px-6 py-3">
                                    <input type="number" value={rule.required_work_minutes} onChange={(e) => handleRuleChange(rule.id, 'required_work_minutes', Number(e.target.value))} 
                                        className="hide-number-arrows w-24 rounded-lg border-gray-600 bg-gray-700/50 p-2 text-center text-white"
                                    />
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end p-4 border-t border-white/10">
                <button onClick={handleSave} disabled={!isChanged || isSaving}
                    className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save Shift Rules"}
                </button>
            </div>
        </motion.div>
    </motion.div>
  );
}