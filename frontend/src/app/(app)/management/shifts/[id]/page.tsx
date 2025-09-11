"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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
    5: "Saturday", 6: "Sunday", 0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday"
};

const dayOrder = [5, 6, 0, 1, 2, 3, 4];

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
        setShift(data);
        setInitialShift(JSON.parse(JSON.stringify(data)));
    }
    setIsSaving(false);
  };
  
  const isChanged = JSON.stringify(shift) !== JSON.stringify(initialShift);

  if (loading) return <div className="text-center">Loading shift details...</div>;
  if (!shift) return <div className="text-center text-red-500">Could not load shift data.</div>;

  return (
    <div>
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Settings
        </button>
        <h1 className="mb-6 text-3xl font-bold text-gray-800">Edit Shift: <span className="text-indigo-600">{shift.name}</span></h1>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
            {shift.day_rules.map((rule) => (
                <div key={rule.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center md:col-span-1">
                        <input
                            type="checkbox"
                            checked={rule.is_work_day}
                            onChange={(e) => handleRuleChange(rule.id, 'is_work_day', e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label className="ml-3 block text-base font-bold text-gray-800">{dayOfWeekMap[rule.day_of_week]}</label>
                    </div>
                    
                    <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Start Time</label>
                            <input type="time" disabled={!rule.is_work_day} value={rule.start_time}
                                onChange={(e) => handleRuleChange(rule.id, 'start_time', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">End Time</label>
                            <input type="time" disabled={!rule.is_work_day} value={rule.end_time}
                                onChange={(e) => handleRuleChange(rule.id, 'end_time', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Required (Mins)</label>
                            <input type="number" disabled={!rule.is_work_day} value={rule.required_work_minutes}
                                onChange={(e) => handleRuleChange(rule.id, 'required_work_minutes', Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>
            ))}
            <div className="flex justify-end pt-4">
                <button onClick={handleSave} disabled={!isChanged || isSaving}
                    className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                    {isSaving ? "Saving Rules..." : "Save Shift Rules"}
                </button>
            </div>
        </div>
    </div>
  );
}