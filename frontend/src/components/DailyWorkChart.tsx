"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const hours = Math.floor(payload[0].value / 60);
      const minutes = payload[0].value % 60;
      return (
        <div className="rounded-lg border border-white/10 bg-gray-800/80 p-3 text-sm shadow-lg backdrop-blur-md">
          <p className="font-bold text-white">{`Day: ${label}`}</p>
          <p className="text-indigo-400">{`Worked: ${hours}h ${minutes}m`}</p>
        </div>
      );
    }
    return null;
};

export default function DailyWorkChart({ data }: { data: any[] }) {
  const today = new Date().getDate().toString();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-96 w-full rounded-xl border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-md"
    >
      <h3 className="text-xl font-bold text-white mb-6">Your Daily Work (This Month)</h3>
      <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorWork" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="m" />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
              />
              <ReferenceLine x={today} stroke="rgba(255, 255, 255, 0.3)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="worked_minutes" stroke="#818cf8" fillOpacity={1} fill="url(#colorWork)" strokeWidth={2} animationDuration={1000} />
          </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}