"use client";

import { motion, Variants } from "framer-motion";
import { ChartPieIcon } from '@heroicons/react/24/outline';
import MonthlyPerformanceChart from './MonthlyPerformanceChart';

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function EmployeeDashboard({ data }: { data: any }) {
  const hasData = data.monthly_performance && data.monthly_performance.some((d: any) => d.worked_hours > 0);
  const personalStats = [
      { name: 'First Check-in Today', stat: data.personal_stats.first_check_in, color: 'text-sky-400' },
      { name: 'Work Duration Today', stat: data.personal_stats.worked_today, color: 'text-green-400' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white mb-4">Your Live Snapshot</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {personalStats.map((item) => (
                <div key={item.name} className="overflow-hidden rounded-lg bg-black/20 border border-white/10 backdrop-blur-md p-5 shadow-lg">
                    <dt className="truncate text-sm font-medium text-gray-400">{item.name}</dt>
                    <dd className={`mt-1 text-3xl font-bold ${item.color}`}>{item.stat}</dd>
                </div>
            ))}
            </div>
        </motion.div>
        <motion.div variants={itemVariants}>
            {hasData ? (
                <MonthlyPerformanceChart data={data.monthly_performance} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-white rounded-xl bg-black/20 border border-white/10 backdrop-blur-md p-12">
                    <ChartPieIcon className="h-12 w-12 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold">No Activity Data</h3>
                    <p className="mt-1 text-sm text-gray-400">Your performance chart will appear here once you have attendance data.</p>
                </div>
            )}
        </motion.div>
    </motion.div>
  );
}