"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { AdjustmentsHorizontalIcon, BuildingOffice2Icon, CalendarDaysIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import CreateShiftModal from "@/components/CreateShiftModal";
import CustomDatePicker from "@/components/CustomDatePicker";
import { format } from "date-fns";

type SettingsData = {
  grace_period_minutes: number;
  penalty_rate: string; 
};

type ShiftData = {
    id: number;
    name: string;
};

type HolidayData = { 
    id: number; 
    date: string; 
    name: string; 
};

type Tab = "general" | "shifts" | "holidays";

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [initialSettings, setInitialSettings] = useState<SettingsData | null>(null);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState<Date | undefined>(undefined);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchShifts = async () => { const data = await apiClient("/shifts/"); if(data) { setShifts(data); } };
  const fetchHolidays = async () => { const data = await apiClient("/holidays/"); if(data) { setHolidays(data); } };

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const data = await apiClient("/settings/");
      if (data) { setSettings(data); setInitialSettings(data); }
      setLoading(false);
    };
    fetchSettings();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'shifts') { fetchShifts(); }
    if (activeTab === 'holidays') { fetchHolidays(); }
  }, [activeTab]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };
  
  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const dataToSave = { grace_period_minutes: Number(settings.grace_period_minutes), penalty_rate: settings.penalty_rate };
    const data = await apiClient("/settings/", { method: "PUT", body: JSON.stringify(dataToSave) });
    if (data) { toast.success("Settings saved successfully!"); setSettings(data); setInitialSettings(data); }
    setIsSaving(false);
  };

  const handleCreateShift = () => setIsModalOpen(true);
  
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) { toast.error("Both date and name are required."); return; }
    const formattedDate = format(newHolidayDate, "yyyy-MM-dd");
    const data = await apiClient("/holidays/", { method: 'POST', body: JSON.stringify({ date: formattedDate, name: newHolidayName }) });
    if (data) {
        toast.success(`Holiday "${data.name}" added successfully!`);
        fetchHolidays();
        setNewHolidayDate(undefined);
        setNewHolidayName("");
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    const data = await apiClient(`/holidays/${holidayId}/`, { method: 'DELETE' });
    if(data) {
        toast.success("Holiday deleted successfully!");
        fetchHolidays();
    }
  };

  const isChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const tabs = [
    { id: 'general', label: 'General Rules' },
    { id: 'shifts', label: 'Shift Management' },
    { id: 'holidays', label: 'Holidays' }
  ];

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={itemVariants} className="flex items-center space-x-3">
          <AdjustmentsHorizontalIcon className="h-8 w-8 text-white"/>
          <h1 className="text-3xl font-bold text-white">System Settings</h1>
        </motion.div>
        
        <motion.div variants={itemVariants} className="rounded-xl border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-md min-h-[400px]">
          <div className="mb-6 border-b border-white/10">
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {activeTab === tab.id && (
                    <motion.div layoutId="activeSettingsTabIndicator" className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-indigo-500" />
                  )}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {loading && activeTab === 'general' && <p className="text-center text-gray-300">Loading settings...</p>}
              
              {activeTab === 'general' && !loading && settings && (
                <div className="max-w-2xl space-y-6 text-white">
                  <div>
                    <label htmlFor="grace_period_minutes" className="block text-sm font-medium text-gray-300">Grace Period (Minutes)</label>
                    <input type="number" id="grace_period_minutes" name="grace_period_minutes" value={settings.grace_period_minutes} onChange={handleInputChange} className="hide-number-arrows mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 py-2.5 px-3 text-white shadow-sm"/>
                  </div>
                   <div>
                    <label htmlFor="penalty_rate" className="block text-sm font-medium text-gray-300">Lateness Penalty Rate</label>
                    <input type="number" step="0.01" id="penalty_rate" name="penalty_rate" value={settings.penalty_rate} onChange={handleInputChange} className="hide-number-arrows mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 py-2.5 px-3 text-white shadow-sm"/>
                  </div>
                  <div className="flex justify-end pt-4"><button onClick={handleSave} disabled={!isChanged || isSaving} className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">{isSaving ? "Saving..." : "Save Changes"}</button></div>
                </div>
              )}
              
              {activeTab === 'shifts' && (
                  <div>
                      <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-white">Work Shifts</h3><button onClick={handleCreateShift} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"><PlusIcon className="h-4 w-4" /> New Shift</button></div>
                      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20"><ul role="list" className="divide-y divide-white/10">{shifts.map((shift) => (<li key={shift.id} className="flex items-center justify-between p-4 hover:bg-white/5"><span className="font-medium text-white">{shift.name}</span><Link href={`/management/shifts/${shift.id}`} className="flex items-center gap-1 rounded-md bg-gray-700/50 px-3 py-1.5 text-sm text-gray-300 ring-1 ring-inset ring-white/10 hover:bg-gray-700"><PencilSquareIcon className="h-4 w-4" /> Edit Rules</Link></li>))}</ul></div>
                  </div>
              )}

              {activeTab === 'holidays' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Add New Holiday</h3>
                        <form onSubmit={handleAddHoliday} className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Date</label>
                                <CustomDatePicker selectedDate={newHolidayDate} onSelectDate={setNewHolidayDate} />
                            </div>
                            <div>
                                <label htmlFor="holiday-name" className="block text-sm font-medium text-gray-300">Holiday Name</label>
                                <input id="holiday-name" type="text" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-700/50 py-2.5 px-3 text-white shadow-sm" placeholder="e.g., Nowruz" required/>
                            </div>
                            <div className="text-right">
                                <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"><PlusIcon className="h-4 w-4" /> Add Holiday</button>
                            </div>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Official Holiday Calendar</h3>
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20 max-h-96 overflow-y-auto custom-scrollbar">
                            <ul role="list" className="divide-y divide-white/10">{holidays.map((holiday) => (
                                <li key={holiday.id} className="flex items-center justify-between p-3 hover:bg-white/5">
                                    <div>
                                        <p className="font-medium text-white">{holiday.name}</p>
                                        <p className="text-sm text-gray-400">{holiday.date}</p>
                                    </div>
                                    <button onClick={() => handleDeleteHoliday(holiday.id)} className="text-gray-400 hover:text-red-400"><TrashIcon className="h-5 w-5" /></button>
                                </li>
                            ))}
                            {holidays.length === 0 && <li className="p-4 text-center text-sm text-gray-400">No holidays defined yet.</li>}
                            </ul>
                        </div>
                    </div>
                  </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
      <CreateShiftModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchShifts(); }}
      />
    </>
  );
}