'use client';

import { useState } from 'react';
import type { SheetRow, UserRole } from '@/lib/types';

interface Props {
  rows: SheetRow[];
  role: UserRole;
}

interface Column {
  key: keyof SheetRow;
  label: string;
}

function formatCLP(n: number) {
  return n.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

const VIEWER_COLUMNS: Column[] = [
  { key: 'estado',              label: 'Estado' },
  { key: 'lineaPresupuestaria', label: 'Línea' },
  { key: 'mes',                 label: 'Mes' },
  { key: 'proyecto',            label: 'Proyecto' },
  { key: 'nroOC',               label: 'OC' },
  { key: 'proveedor',           label: 'Proveedor' },
  { key: 'monto',               label: 'Monto' },
  { key: 'descripcion',         label: 'Descripción' },
];

const ADMIN_EXTRA_COLUMNS: Column[] = [
  { key: 'tipoDocumento', label: 'Tipo doc.' },
  { key: 'nroDocumento',  label: 'Nro doc.' },
  { key: 'fechaFactura',  label: 'Fecha factura' },
  { key: 'linkOC',        label: 'Link OC' },
  { key: 'linkFactura',   label: 'Link factura' },
  { key: 'linkPago',      label: 'Link pago' },
];

const PAGE_SIZE = 20;

// Los estados en el Sheet pueden variar — coloreamos por keyword
function estadoBadge(estado: string) {
  const lower = estado.toLowerCase();
  let cls = 'bg-gray-100 text-gray-600';
  if (lower.includes('pag')) cls = 'bg-green-100 text-green-700';
  else if (lower.includes('pend')) cls = 'bg-amber-100 text-amber-700';
  else if (lower.includes('rechaz') || lower.includes('cancel'))
    cls = 'bg-red-100 text-red-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {estado}
    </span>
  );
}

function cellContent(row: SheetRow, key: keyof SheetRow) {
  const value = row[key];

  if (key === 'monto') return formatCLP(row.monto);

  if (key === 'estado') return estadoBadge(row.estado);

  if (typeof value === 'string' && value.startsWith('http')) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Ver
      </a>
    );
  }

  return String(value ?? '');
}

export default function DataTable({ rows, role }: Props) {
  const [page, setPage] = useState(0);

  const columns =
    role === 'admin'
      ? [...VIEWER_COLUMNS, ...ADMIN_EXTRA_COLUMNS]
      : VIEWER_COLUMNS;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Detalle de OCs</h2>
        <span className="text-xs text-gray-400">{rows.length} registros</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-gray-500 font-medium whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-gray-400"
                >
                  Sin registros para los filtros seleccionados
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-xs truncate"
                    >
                      {cellContent(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200
                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200
                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
