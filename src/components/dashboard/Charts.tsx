'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { SheetRow } from '@/lib/types';

interface Props {
  rows: SheetRow[];
}

function formatM(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Charts({ rows }: Props) {
  const byMes = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      if (!r.mes) return acc;
      acc[r.mes] = (acc[r.mes] ?? 0) + r.monto;
      return acc;
    }, {})
  ).map(([mes, monto]) => ({ mes, monto }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Monto por mes</h2>
      {byMes.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byMes} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatM} tick={{ fontSize: 11 }} width={48} />
            <Tooltip
              formatter={(v: number) => [formatM(v), 'Monto']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="monto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
