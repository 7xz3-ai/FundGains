"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface PortfolioDiversityProps {
  data: {
    category: string;
    valueCents: bigint;
  }[];
}

const COLORS = {
  Growth: "#2D9FFF", // Trust Blue
  Stability: "#10B981", // Deep Emerald
  Commodities: "#C5A059", // Gold
};

export function PortfolioDiversity({ data }: PortfolioDiversityProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.category,
      value: Number(item.valueCents) / 100,
    }));
  }, [data]);

  const total = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  if (total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-md border border-white/10 shadow-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-white">Portfolio Diversity</h3>
        <div className="text-xs text-white/40 uppercase tracking-widest">
          Risk Analysis
        </div>
      </div>

      <div className="h-[240px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name as keyof typeof COLORS] || "#888"} 
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
              }}
              itemStyle={{ color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold text-white">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-tighter">
            Total Value
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {chartData.map((item) => {
          const percent = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] }}
                />
                <span className="text-sm text-white/70">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">${item.value.toLocaleString()}</span>
                <span className="text-xs text-white/30 w-10 text-right">{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
