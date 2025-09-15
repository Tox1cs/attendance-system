"use client";

import { UserGroupIcon, ClockIcon, ChartPieIcon } from '@heroicons/react/24/outline';
import { motion, Variants } from "framer-motion";
import MonthlyPerformanceChart from './MonthlyPerformanceChart';

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function ManagerDashboard({ data }: { data: any }) {
  const personalStats = [
      { name: 'Your First Check-in', stat: data.personal_stats.first_check_in, color: 'text-sky-400' },
      { name: 'Your Work Duration Today', stat: data.personal_stats.worked_today, color: 'text-green-400' },
  ];
  const teamStats = [
    { name: 'Total Team Members', stat: data.team_stats.total_team_members, icon: UserGroupIcon, color: 'text-purple-400' },
    { name: 'Present Today', stat: data.team_stats.present_today, icon: ClockIcon, color: 'text-green-400' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-white mb-4">Your Live Snapshot</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {personalStats.map((item) => (
            <div key={item.name} className="overflow-hidden rounded-lg bg-black/20 border border-white/10 backdrop-blur-md p-5 shadow-lg">
                <dt className="truncate text-sm font-medium text-gray-400">{item.name}</dt>
                <dd className={`mt-1 text-3xl font-bold ${item.color}`}>{item.stat}</dd>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-white mb-4">Team Overview Today</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teamStats.map((item) => (
            <div key={item.name} className="overflow-hidden rounded-lg bg-black/20 border border-white/10 backdrop-blur-md p-5 shadow-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-white/5 p-3">
                  <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="truncate text-sm font-medium text-gray-400">{item.name}</dt>
                  <dd className="text-3xl font-bold text-white">{item.stat}</dd>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

       <motion.div variants={itemVariants}>
            <MonthlyPerformanceChart data={data.monthly_performance} />
       </motion.div>
    </motion.div>
  );
}