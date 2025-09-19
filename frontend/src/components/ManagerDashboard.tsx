"use client";

import { UserCircleIcon } from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { motion, Variants } from "framer-motion";
import DailyWorkChart from './DailyWorkChart';

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

type PresentEmployee = {
    id: number;
    full_name: string;
    first_check_in: string;
}

export default function ManagerDashboard({ data }: { data: any }) {
  const hasTeamData = data.present_employees && data.present_employees.length > 0;
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-white mb-4">Team Live Status</h2>
        {hasTeamData ? (
          <div className="flex space-x-4 overflow-x-auto custom-scrollbar pb-4">
            {data.present_employees.map((employee: PresentEmployee) => (
                <Popover key={employee.id} className="relative">
                    <Popover.Button className="flex flex-col items-center text-center w-24 focus:outline-none group">
                        <div className="h-20 w-20 rounded-full bg-gray-800/50 flex items-center justify-center text-indigo-400 border-2 border-gray-700 group-hover:border-indigo-500 transition-all duration-300 relative">
                            <UserCircleIcon className="h-16 w-16" />
                            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-gray-900"/>
                        </div>
                        <span className="mt-2 text-sm font-medium text-gray-300 truncate w-full">{employee.full_name}</span>
                    </Popover.Button>
                    <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                        <Popover.Panel className="absolute z-10 mt-2 w-48 rounded-lg border border-white/10 bg-gray-800/80 p-3 text-sm shadow-lg backdrop-blur-md">
                            <div className="font-semibold text-white">First Check-in Today:</div>
                            <div className="font-mono text-lg text-green-400">{employee.first_check_in}</div>
                        </Popover.Panel>
                    </Transition>
                </Popover>
            ))}
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center rounded-xl bg-black/20 border border-white/10 backdrop-blur-md p-8 text-center text-white">
                <UserCircleIcon className="h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-semibold">No Employees Checked In Today</h3>
            </div>
        )}
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <DailyWorkChart data={data.daily_work_chart} />
      </motion.div>
    </motion.div>
  );
}