"use client";

import Modal from "./Modal";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
};

export default function ConfirmationModal({ 
    isOpen, onClose, onConfirm, title, message, 
    confirmText = "Confirm", cancelText = "Cancel", isLoading = false 
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex items-start space-x-4">
        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-300">
            {message}
          </p>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 flex flex-row-reverse space-x-2 space-x-reverse">
        <button
          type="button"
          disabled={isLoading}
          className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50"
          onClick={onConfirm}
        >
          {isLoading ? "Deleting..." : confirmText}
        </button>
        <button
          type="button"
          className="mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-white/20 hover:bg-white/20 sm:mt-0 sm:w-auto"
          onClick={onClose}
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
}