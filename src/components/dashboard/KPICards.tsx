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

export default function KPICards({ rows }: Props) {
  const total = rows.reduce((acc, r) => acc + r.monto, 0);
  const totalOCs = rows.length;

  // Conteo por estado (case-insensitive, parcial)
  const pagados = rows.filter((r) =>
    r.estado?.toLowerCase().includes('pag')
  ).length;
  const pendientes = rows.filter((r) =>
    r.estado?.toLowerCase().includes('pend')
  ).length;

  const cards = [
    {
      label: 'Monto total',
      value: formatCLP(total),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total OCs',
      value: totalOCs.toString(),
      color: 'text-gray-700',
      bg: 'bg-gray-50',
    },
    {
      label: 'Pagados',
      value: pagados.toString(),
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pendientes',
      value: pendientes.toString(),
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} rounded-xl border border-gray-200 p-5`}
        >
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color} leading-tight`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
