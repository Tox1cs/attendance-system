"use client";

import React from "react";
import { toast } from "sonner";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/20/solid";

type NotificationToastProps = {
  toastId: number | string;
  type: "success" | "error";
  title: string;
  description: string;
};

export const NotificationToast: React.FC<NotificationToastProps> = ({ toastId, type, title, description }) => {
  const isError = type === 'error';
  const Icon = isError ? XCircleIcon : CheckCircleIcon;
  const iconColor = isError ? "text-red-400" : "text-green-400";
  const titleColor = isError ? "text-red-800" : "text-green-800";
  const bgColor = isError ? "bg-red-50" : "bg-green-50";

  return (
    <div className={`w-full max-w-sm rounded-lg p-4 shadow-lg ring-1 ring-black ring-opacity-5 ${bgColor}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className={`text-sm font-medium ${titleColor}`}>{title}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            type="button"
            className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => toast.dismiss(toastId)}
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};