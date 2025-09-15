"use client";

import { useState, useEffect, Fragment } from "react";
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, isSameDay, isToday } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from "@heroicons/react/24/solid";
import Modal from "./Modal"; // Import our robust Modal component

type DatePickerProps = {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
};

export default function CustomDatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(newDate);
    setIsOpen(false);
  };

  const CalendarBody = () => (
    <div className="p-2">
      <div className="flex items-center justify-between pb-2">
        <span className="text-lg font-semibold text-white">{format(currentMonth, "MMMM yyyy")}</span>
        <div className="flex items-center space-x-1">
          <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isCurrentDay = isToday(date);
          let dayClasses = "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ";
          if (isSelected) dayClasses += "bg-indigo-600 text-white hover:bg-indigo-500";
          else if (isCurrentDay) dayClasses += "border border-indigo-500 text-indigo-400";
          else dayClasses += "text-gray-200 hover:bg-white/10";
          return (
            <button key={day} type="button" onClick={() => handleDayClick(day)} className={dayClasses}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative mt-1 w-full cursor-pointer rounded-lg border border-white/10 bg-black/20 py-2.5 pl-3 pr-10 text-left text-white backdrop-blur-sm transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
      >
        <span className="block truncate">
          {selectedDate ? format(selectedDate, "PPP") : <span className="text-gray-400">Select a date</span>}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select a Date">
        <CalendarBody />
      </Modal>
    </>
  );
}