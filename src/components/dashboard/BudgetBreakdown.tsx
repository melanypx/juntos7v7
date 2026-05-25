'use client';

import { useEffect, useMemo, useState } from 'react';
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

interface TreeNode {
  codigo: string;        // "006" | "006-01" | "006-01-01"
  descripcion: string;
  presupuesto: number;
  ejecutado: number;
  level: number;         // 1, 2, or 3
  children: TreeNode[];
}

/**
 * Construye un árbol jerárquico de 3 niveles a partir de las líneas de
 * presupuesto y las OCs. Aggrega presupuesto + ejecución de abajo hacia arriba.
 */
function buildTree(budget: BudgetLine[], rows: SheetRow[]): TreeNode[] {
  // Mapa: código completo (3 niveles) → descripción del presupuesto
  const descByCode = new Map<string, string>();
  for (const b of budget) {
    descByCode.set(b.codigo, b.descripcion);
  }

  // Recolecta todos los códigos (de presupuesto + OCs)
  const allCodes = new Set<string>();
  for (const b of budget) allCodes.add(b.codigo);
  for (const r of rows) {
    if (r.lineaPresupuestaria) allCodes.add(r.lineaPresupuestaria);
  }

  // Normaliza códigos a 3 niveles (rellena con "00" si vienen en formato corto)
  function normalize(code: string): { top: string; mid: string; leaf: string } {
    const parts = code.split('-');
    const top = parts[0] ?? '';
    const mid = parts[1] ? `${top}-${parts[1]}` : `${top}-00`;
    const leaf = parts[2] ? `${mid}-${parts[2]}` : `${mid}-00`;
    return { top, mid, leaf };
  }

  // Suma ejecución por código exacto (tal como viene en la OC)
  const ejecPorCodigo = new Map<string, number>();
  for (const r of rows) {
    if (!r.lineaPresupuestaria) continue;
    ejecPorCodigo.set(
      r.lineaPresupuestaria,
      (ejecPorCodigo.get(r.lineaPresupuestaria) ?? 0) + r.monto
    );
  }

  // Suma presupuesto por código exacto
  const presPorCodigo = new Map<string, number>();
  for (const b of budget) {
    presPorCodigo.set(b.codigo, (presPorCodigo.get(b.codigo) ?? 0) + b.presupuesto);
  }

  // Construye los nodos hoja (nivel 3)
  const leafNodes = new Map<string, TreeNode>();
  for (const code of Array.from(allCodes)) {
    const { leaf } = normalize(code);
    if (!leafNodes.has(leaf)) {
      leafNodes.set(leaf, {
        codigo: leaf,
        descripcion: descByCode.get(leaf) ?? descByCode.get(code) ?? '',
        presupuesto: 0,
        ejecutado: 0,
        level: 3,
        children: [],
      });
    }
    const node = leafNodes.get(leaf)!;
    node.presupuesto += presPorCodigo.get(code) ?? 0;
    node.ejecutado += ejecPorCodigo.get(code) ?? 0;
  }

  // Agrupa hojas por mid (nivel 2)
  const midNodes = new Map<string, TreeNode>();
  for (const leaf of Array.from(leafNodes.values())) {
    const mid = leaf.codigo.split('-').slice(0, 2).join('-');
    if (!midNodes.has(mid)) {
      midNodes.set(mid, {
        codigo: mid,
        descripcion: '',
        presupuesto: 0,
        ejecutado: 0,
        level: 2,
        children: [],
      });
    }
    const node = midNodes.get(mid)!;
    node.presupuesto += leaf.presupuesto;
    node.ejecutado += leaf.ejecutado;
    node.children.push(leaf);
  }

  // Agrupa mids por top (nivel 1)
  const topNodes = new Map<string, TreeNode>();
  for (const mid of Array.from(midNodes.values())) {
    const top = mid.codigo.split('-')[0];
    if (!topNodes.has(top)) {
      topNodes.set(top, {
        codigo: top,
        descripcion: '',
        presupuesto: 0,
        ejecutado: 0,
        level: 1,
        children: [],
      });
    }
    const node = topNodes.get(top)!;
    node.presupuesto += mid.presupuesto;
    node.ejecutado += mid.ejecutado;
    node.children.push(mid);
  }

  // Ordena cada nivel por código
  const tops = Array.from(topNodes.values()).sort((a, b) =>
    a.codigo.localeCompare(b.codigo)
  );
  for (const t of tops) {
    t.children.sort((a, b) => a.codigo.localeCompare(b.codigo));
    for (const m of t.children) {
      m.children.sort((a, b) => a.codigo.localeCompare(b.codigo));
    }
  }
  return tops;
}

interface RowProps {
  node: TreeNode;
  expanded: Set<string>;
  toggle: (code: string) => void;
}

function pctColor(pct: number) {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-blue-500';
}

function NodeRow({ node, expanded, toggle }: RowProps) {
  const isOpen = expanded.has(node.codigo);
  const hasChildren = node.children.length > 0;
  const disponible = node.presupuesto - node.ejecutado;
  const pct =
    node.presupuesto > 0 ? Math.min((node.ejecutado / node.presupuesto) * 100, 100) : 0;
  const indent = (node.level - 1) * 24;

  // Estilo según nivel
  const bg =
    node.level === 1 ? 'bg-gray-50 font-semibold' : node.level === 2 ? 'bg-white' : 'bg-white';
  const textSize = node.level === 1 ? 'text-sm' : 'text-xs';

  return (
    <>
      <tr
        className={`${bg} border-b border-gray-100 hover:bg-blue-50 transition-colors ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        onClick={() => hasChildren && toggle(node.codigo)}
      >
        <td className={`py-2.5 pr-4 ${textSize}`} style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <span className="text-gray-400 inline-block w-3 text-center">
                {isOpen ? '▾' : '▸'}
              </span>
            ) : (
              <span className="inline-block w-3" />
            )}
            <span className="font-mono text-gray-700">{node.codigo}</span>
            {node.descripcion && (
              <span className="text-gray-500 ml-2 truncate max-w-xs" title={node.descripcion}>
                {node.descripcion}
              </span>
            )}
          </div>
        </td>
        <td className={`px-4 py-2.5 text-right text-gray-600 whitespace-nowrap ${textSize}`}>
          {node.presupuesto > 0 ? formatCLP(node.presupuesto) : '—'}
        </td>
        <td className={`px-4 py-2.5 text-right font-medium text-blue-700 whitespace-nowrap ${textSize}`}>
          {formatCLP(node.ejecutado)}
        </td>
        <td
          className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${textSize} ${
            node.presupuesto === 0
              ? 'text-gray-400'
              : disponible < 0
              ? 'text-red-600'
              : 'text-green-700'
          }`}
        >
          {node.presupuesto > 0 ? formatCLP(disponible) : '—'}
        </td>
        <td className={`px-4 py-2.5 text-right whitespace-nowrap ${textSize}`}>
          {node.presupuesto > 0 ? (
            <span
              className={
                pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-600'
              }
            >
              {pct.toFixed(1)}%
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 w-32">
          {node.presupuesto > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${pctColor(pct)}`}
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
          )}
        </td>
      </tr>
      {isOpen &&
        node.children.map((c) => (
          <NodeRow key={c.codigo} node={c} expanded={expanded} toggle={toggle} />
        ))}
    </>
  );
}

export default function BudgetBreakdown({ rows }: Props) {
  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/budget')
      .then((r) => r.json())
      .then((d: BudgetLine[]) => setBudget(Array.isArray(d) ? d : []))
      .catch(() => setBudget([]))
      .finally(() => setLoading(false));
  }, []);

  const tree = useMemo(() => buildTree(budget, rows), [budget, rows]);

  const totalP = tree.reduce((s, n) => s + n.presupuesto, 0);
  const totalE = tree.reduce((s, n) => s + n.ejecutado, 0);
  const totalD = totalP - totalE;
  const totalPct = totalP > 0 ? Math.min((totalE / totalP) * 100, 100) : 0;

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function expandAll() {
    const all = new Set<string>();
    for (const t of tree) {
      all.add(t.codigo);
      for (const m of t.children) all.add(m.codigo);
    }
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Desglose por línea presupuestaria
        </h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-gray-400">Cargando…</span>}
          <button
            onClick={expandAll}
            className="text-xs text-blue-600 hover:underline"
            type="button"
          >
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:underline"
            type="button"
          >
            Colapsar
          </button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: 'Total presupuestado', value: totalP, color: 'text-gray-700' },
              { label: 'Total ejecutado', value: totalE, color: 'text-blue-700' },
              {
                label: 'Disponible',
                value: totalD,
                color: totalD < 0 ? 'text-red-600' : 'text-green-700',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white px-5 py-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{formatCLP(value)}</p>
              </div>
            ))}
          </div>

          {/* Barra global */}
          <div className="px-5 pt-3 pb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Ejecución global</span>
              <span>{totalPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${pctColor(totalPct)}`}
                style={{ width: `${totalPct.toFixed(1)}%` }}
              />
            </div>
          </div>

          {/* Árbol */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Código</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Presupuestado</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Ejecutado</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Disponible</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium whitespace-nowrap">% Uso</th>
                  <th className="px-4 py-2 text-gray-500 font-medium w-32">Avance</th>
                </tr>
              </thead>
              <tbody>
                {tree.map((n) => (
                  <NodeRow key={n.codigo} node={n} expanded={expanded} toggle={toggle} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">
            Click en una fila con ▸ para expandir el siguiente nivel.
          </p>
        </>
      )}
    </div>
  );
}
