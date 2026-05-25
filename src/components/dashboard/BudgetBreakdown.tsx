'use client';

import { useEffect, useState } from 'react';
import type { SheetRow, BudgetLine } from '@/lib/types';

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

/**
 * Intenta hacer match entre el código de la OC y las líneas del presupuesto.
 * Estrategia: coincidencia exacta → luego por prefijo (primeros 6 chars).
 */
function buildBudgetMap(budget: BudgetLine[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of budget) {
    const existing = map.get(b.codigo) ?? 0;
    map.set(b.codigo, existing + b.presupuesto);
  }
  return map;
}

function lookupBudget(codigo: string, budgetMap: Map<string, number>): number {
  // Exact match
  if (budgetMap.has(codigo)) return budgetMap.get(codigo)!;
  // Prefix match (e.g. "021-01" matches "021-01-01")
  for (const [key, val] of Array.from(budgetMap)) {
    if (key.startsWith(codigo + '-') || codigo.startsWith(key + '-')) {
      return val;
    }
  }
  return 0;
}

export default function BudgetBreakdown({ rows }: Props) {
  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [loadingBudget, setLoadingBudget] = useState(true);

  useEffect(() => {
    fetch('/api/budget')
      .then((r) => r.json())
      .then((data: BudgetLine[]) => {
        setBudget(Array.isArray(data) ? data : []);
      })
      .catch(() => setBudget([]))
      .finally(() => setLoadingBudget(false));
  }, []);

  // Agrupa ejecución por código
  const ejecutadoMap = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.lineaPresupuestaria || 'Sin línea';
    acc[key] = (acc[key] ?? 0) + r.monto;
    return acc;
  }, {});

  // Construye mapa de presupuesto
  const budgetMap = buildBudgetMap(budget);

  // Une presupuesto + ejecución — incluye líneas con cualquiera de los dos
  const allCodes = new Set([
    ...Object.keys(ejecutadoMap),
    ...Array.from(budgetMap.keys()),
  ]);

  const lines = Array.from(allCodes)
    .filter((c) => c !== 'Sin línea')
    .map((codigo) => {
      const ejecutado = ejecutadoMap[codigo] ?? 0;
      const presupuesto = lookupBudget(codigo, budgetMap);
      const disponible = presupuesto - ejecutado;
      const pct = presupuesto > 0 ? Math.min((ejecutado / presupuesto) * 100, 100) : 0;
      // Find description from budget data
      const budgetEntry = budget.find((b) => b.codigo === codigo);
      const descripcion = budgetEntry?.descripcion ?? '';
      return { codigo, descripcion, presupuesto, ejecutado, disponible, pct };
    })
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  // Totales generales
  const totalPresupuesto = lines.reduce((s, l) => s + l.presupuesto, 0);
  const totalEjecutado = lines.reduce((s, l) => s + l.ejecutado, 0);
  const totalDisponible = totalPresupuesto - totalEjecutado;
  const totalPct = totalPresupuesto > 0
    ? Math.min((totalEjecutado / totalPresupuesto) * 100, 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden col-span-1 lg:col-span-2">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Desglose por línea presupuestaria
        </h2>
        {loadingBudget && (
          <span className="text-xs text-gray-400">Cargando presupuesto…</span>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
      ) : (
        <>
          {/* Totales destacados */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: 'Total presupuestado', value: totalPresupuesto, color: 'text-gray-700' },
              { label: 'Total ejecutado', value: totalEjecutado, color: 'text-blue-700' },
              {
                label: 'Disponible',
                value: totalDisponible,
                color: totalDisponible < 0 ? 'text-red-600' : 'text-green-700',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white px-5 py-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{formatCLP(value)}</p>
              </div>
            ))}
          </div>

          {/* Barra de progreso global */}
          <div className="px-5 pt-3 pb-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Ejecución global</span>
              <span>{totalPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  totalPct >= 90 ? 'bg-red-500' : totalPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${totalPct.toFixed(1)}%` }}
              />
            </div>
          </div>

          {/* Tabla de líneas */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="px-4 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Código</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Descripción</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Presupuestado</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Ejecutado</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Disponible</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">% Uso</th>
                  <th className="px-4 py-2 w-24 text-gray-500 font-medium">Avance</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.codigo}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-gray-600 whitespace-nowrap">
                      {line.codigo}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate" title={line.descripcion}>
                      {line.descripcion || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">
                      {line.presupuesto > 0 ? formatCLP(line.presupuesto) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-blue-700 whitespace-nowrap">
                      {formatCLP(line.ejecutado)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${
                        line.disponible < 0
                          ? 'text-red-600'
                          : line.presupuesto === 0
                          ? 'text-gray-400'
                          : 'text-green-700'
                      }`}
                    >
                      {line.presupuesto > 0 ? formatCLP(line.disponible) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {line.presupuesto > 0 ? (
                        <span
                          className={`font-medium ${
                            line.pct >= 90
                              ? 'text-red-600'
                              : line.pct >= 70
                              ? 'text-amber-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {line.pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {line.presupuesto > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              line.pct >= 90
                                ? 'bg-red-500'
                                : line.pct >= 70
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${line.pct.toFixed(1)}%` }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
