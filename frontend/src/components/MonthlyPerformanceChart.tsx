"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyPerformanceData {
  month: string;
  lateness: number;
  shortfall: number;
  overtime: number;
}

export default function MonthlyPerformanceChart({ data }: { data: MonthlyPerformanceData[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-md">
      <h3 className="text-xl font-bold text-white mb-6">Monthly Performance Overview</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOvertime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorShortfall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'rgba(17, 24, 39, 0.8)', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                backdropFilter: 'blur(4px)',
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area type="monotone" dataKey="overtime" stroke="#22c55e" fillOpacity={1} fill="url(#colorOvertime)" strokeWidth={2} />
            <Area type="monotone" dataKey="shortfall" stroke="#ef4444" fillOpacity={1} fill="url(#colorShortfall)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}