'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ProgressHistoryPoint } from '@/lib/types';

interface MiniLineChartProps {
  data: ProgressHistoryPoint[];
  color: string;
}

export default function MiniLineChart({ data, color }: MiniLineChartProps) {
  // Generate gradient ID based on color to ensure uniqueness
  const gradientId = `gradient-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width={100} height={40}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
            <stop offset="100%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="progress"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
