'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ProgressHistoryPoint } from '@/lib/types';

interface MiniLineChartProps {
  data: ProgressHistoryPoint[];
  color: string;
}

export default function MiniLineChart({ data, color }: MiniLineChartProps) {
  return (
    <ResponsiveContainer width={100} height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="progress"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
