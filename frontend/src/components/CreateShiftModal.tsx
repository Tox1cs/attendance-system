"use client";

import { useState } from "react";
import Modal from "./Modal";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CreateShiftModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newShift: { id: number; name: string }) => void;
};

export default function CreateShiftModal({ isOpen, onClose, onSuccess }: CreateShiftModalProps) {
  const [shiftName, setShiftName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!shiftName) {
      toast.error("Shift name cannot be empty.");
      return;
    }
    setLoading(true);
    const data = await apiClient("/shifts/create/", {
      method: 'POST',
      body: JSON.stringify({ name: shiftName }),
    });
    setLoading(false);

    if (data) {
      toast.success(`Shift "${data.name}" created successfully!`);
      onSuccess(data);
      router.push(`/management/shifts/${data.id}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Work Shift">
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Enter a name for the new shift. Default rules will be created for all 7 days of the week, which you can edit on the next page.
        </p>
        <div>
          <label htmlFor="shift-name" className="block text-sm font-medium text-gray-300">
            Shift Name
          </label>
          <input
            id="shift-name"
            type="text"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-sm transition-all duration-300 placeholder:text-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Night Shift"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Shift"}
          </button>
        </div>
      </div>
    </Modal>
  );
}