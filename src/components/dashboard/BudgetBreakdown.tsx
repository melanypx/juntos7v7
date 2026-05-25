'use client';

import type { SheetRow } from '@/lib/types';

interface Props {
  rows: SheetRow[];
}

function formatCLP(n: number) {
  return n.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

export default function BudgetBreakdown({ rows }: Props) {
  const byLinea = Object.entries(
    rows.reduce<Record<string, { monto: number; count: number }>>((acc, r) => {
      const key = r.lineaPresupuestaria || 'Sin línea';
      if (!acc[key]) acc[key] = { monto: 0, count: 0 };
      acc[key].monto += r.monto;
      acc[key].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1].monto - a[1].monto);

  const totalMonto = byLinea.reduce((acc, [, v]) => acc + v.monto, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Desglose por línea presupuestaria
      </h2>
      {byLinea.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-52">
          {byLinea.map(([linea, { monto, count }]) => {
            const pct = totalMonto > 0 ? (monto / totalMonto) * 100 : 0;
            return (
              <div key={linea}>
                <div className="flex justify-between items-baseline mb-1">
                  <span
                    className="text-xs text-gray-700 truncate max-w-[55%]"
                    title={linea}
                  >
                    {linea}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">
                    {formatCLP(monto)}{' '}
                    <span className="text-gray-400">({count})</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
