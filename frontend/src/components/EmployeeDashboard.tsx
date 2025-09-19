"use client";

import { motion, Variants } from "framer-motion";
import { ChartPieIcon } from '@heroicons/react/24/outline';
import DailyWorkChart from './DailyWorkChart';

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function EmployeeDashboard({ data }: { data: any }) {
  const hasData = data.daily_work_chart && data.daily_work_chart.some((d: any) => d.worked_minutes > 0);

  if (!hasData) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-xl bg-black/20 border border-white/10 backdrop-blur-md p-12 min-h-[60vh] text-center text-white">
            <ChartPieIcon className="h-16 w-16 text-gray-500" />
            <h3 className="mt-4 text-xl font-semibold">No Activity This Month</h3>
            <p className="mt-2 text-gray-400">
                Your daily work chart will appear here once you have attendance data.
            </p>
        </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
           <DailyWorkChart data={data.daily_work_chart} />
        </motion.div>
    </motion.div>
  );
}