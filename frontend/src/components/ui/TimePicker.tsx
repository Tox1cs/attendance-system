"use client";

import { useState, useEffect } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import Modal from "@/components/Modal";

type TimePickerProps = {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
};

export default function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmPm] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":").map(Number);
      setHour(h);
      setMinute(m);
      setAmPm(h >= 12 ? "PM" : "AM");
    }
  }, [value]);

  const handleConfirm = () => {
    let formattedHour = hour;
    if (ampm === "PM" && hour < 12) formattedHour += 12;
    if (ampm === "AM" && hour === 12) formattedHour = 0;
    
    onChange(`${formattedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    setIsOpen(false);
  };

  const handleHourChange = (h: number) => {
    setHour(h);
    if (h >= 12) setAmPm("PM");
    else setAmPm("AM");
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative w-full cursor-pointer rounded-xl border border-white/10 bg-black/20 p-4 text-left text-white transition-all duration-300 hover:border-white/20 hover:shadow-lg",
          "backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30",
          className
        )}
      >
        <span className="flex items-center justify-between">
          <span className="font-mono text-2xl font-light tracking-wider">
            {value || "00:00"}
          </span>
          <ClockIcon className="h-6 w-6 text-gray-400" />
        </span>
      </button>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Select Time"
      >
        <div className="flex flex-col items-center p-4">
          {/* Large Time Display */}
          <div className="mb-8 text-center">
            <div className="text-5xl font-mono font-light mb-2 bg-black/30 py-4 px-6 rounded-xl">
              {hour.toString().padStart(2, '0')}<span className="text-gray-400">:</span>{minute.toString().padStart(2, '0')}
            </div>
            <button
              onClick={() => setAmPm(ampm === "AM" ? "PM" : "AM")}
              className="text-lg px-4 py-1 bg-black/20 rounded-md hover:bg-black/30 transition-colors"
            >
              {ampm}
            </button>
          </div>
          
          {/* Time Selector */}
          <div className="flex justify-center space-x-6 w-full mb-8">
            {/* Hour Selector */}
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-2">HOUR</div>
              <div className="h-48 overflow-y-auto scrollbar-hide bg-black/20 rounded-lg p-2">
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => handleHourChange(h)}
                    className={cn(
                      "text-center py-3 px-6 rounded-md cursor-pointer transition-all",
                      hour === h
                        ? "bg-white/10 text-white font-bold"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {h.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Minute Selector */}
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-2">MINUTE</div>
              <div className="h-48 overflow-y-auto scrollbar-hide bg-black/20 rounded-lg p-2">
                {minutes.map((m) => (
                  <div
                    key={m}
                    onClick={() => setMinute(m)}
                    className={cn(
                      "text-center py-3 px-5 rounded-md cursor-pointer transition-all",
                      minute === m
                        ? "bg-white/10 text-white font-bold"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {m.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex w-full justify-between space-x-4 pt-4 border-t border-white/10">
            <button 
              type="button" 
              onClick={() => setIsOpen(false)} 
              className="flex-1 rounded-lg bg-white/5 py-3 text-white transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleConfirm} 
              className="flex-1 rounded-lg bg-white/20 py-3 text-white transition-all hover:bg-white/30"
            >
              Set Time
            </button>
          </div>
        </div>
        
        {/* Custom scrollbar hide style */}
        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </Modal>
    </>
  );
}