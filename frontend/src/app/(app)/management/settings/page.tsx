"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AdjustmentsHorizontalIcon, CalendarDaysIcon, BuildingOffice2Icon, PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import CreateShiftModal from "@/components/CreateShiftModal";

type SettingsData = { grace_period_minutes: number; penalty_rate: string; };
type ShiftData = { id: number; name: string; };
type Tab = "general" | "shifts" | "holidays";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [initialSettings, setInitialSettings] = useState<SettingsData | null>(null);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchShifts = async () => {
    const data = await apiClient("/shifts/");
    if(data) { setShifts(data); }
  };

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
    if (activeTab === 'shifts') {
      fetchShifts();
    }
  }, [activeTab]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };
  
  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const dataToSave = {
        grace_period_minutes: Number(settings.grace_period_minutes),
        penalty_rate: settings.penalty_rate,
    };
    const data = await apiClient("/settings/", { method: "PUT", body: JSON.stringify(dataToSave) });
    if (data) {
        toast.success("Settings saved successfully!");
        setSettings(data); setInitialSettings(data);
    }
    setIsSaving(false);
  };

  const isChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const TabButton = ({ tabName, label }: { tabName: Tab; label: string }) => (
    <button onClick={() => setActiveTab(tabName)}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tabName ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center space-x-3">
          <AdjustmentsHorizontalIcon className="h-8 w-8 text-gray-700"/>
          <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
        </div>
        
        <div className="rounded-lg border bg-gray-50 p-2">
          <nav className="flex space-x-1">
            <TabButton tabName="general" label="General Rules" />
            <TabButton tabName="shifts" label="Shift Management" />
            <TabButton tabName="holidays" label="Holidays" />
          </nav>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.2 }}
            >
              {loading && <p className="text-center text-gray-500">Loading settings...</p>}
              
              {!loading && settings && activeTab === 'general' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <label htmlFor="grace_period_minutes" className="block text-sm font-medium text-gray-700">Grace Period (Minutes)</label>
                    <input type="number" id="grace_period_minutes" name="grace_period_minutes"
                      value={settings.grace_period_minutes} onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Duration in minutes employees can be late without penalty.</p>
                  </div>
                   <div>
                    <label htmlFor="penalty_rate" className="block text-sm font-medium text-gray-700">Lateness Penalty Rate</label>
                    <input type="number" step="0.01" id="penalty_rate" name="penalty_rate"
                      value={settings.penalty_rate} onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Multiplier for penalty calculation (e.g., 1.40).</p>
                  </div>
                  <div className="flex justify-end border-t border-gray-200 pt-4">
                      <button onClick={handleSave} disabled={!isChanged || isSaving}
                       className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                          {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'shifts' && (
                  <div>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-semibold text-gray-800">Work Shifts</h3>
                          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                              <PlusIcon className="h-4 w-4" /> New Shift
                          </button>
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                          <ul role="list" className="divide-y divide-gray-200">
                              {shifts.map((shift) => (
                                  <li key={shift.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                      <span className="font-medium text-gray-900">{shift.name}</span>
                                      <Link href={`/management/shifts/${shift.id}`} className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-100">
                                          <PencilSquareIcon className="h-4 w-4" /> Edit Rules
                                      </Link>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>
              )}

              {activeTab === 'holidays' && (
                  <div className="py-12 text-center text-gray-500">
                      <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400"/>
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Holiday Management</h3>
                      <p className="mt-1 text-sm">This section is under construction. Holidays can be managed via the Django Admin Panel.</p>
                  </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <CreateShiftModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
            fetchShifts();
            setIsModalOpen(false);
        }}
      />
    </>
  );
}