import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getBudgetData } from '@/lib/sheets';
import type { UserMetadata } from '@/lib/types';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as UserMetadata;
  const role = meta.role ?? 'viewer';
  const raw = meta.linea_presupuestaria;
  const lineas: string[] = Array.isArray(raw)
    ? raw.map((l) => l.trim()).filter(Boolean)
    : raw
    ? [raw.trim()].filter(Boolean)
    : [];

  try {
    const data = await getBudgetData();

    let filtered = data;
    if (role !== 'admin') {
      if (lineas.length === 0) {
        filtered = [];
      } else {
        filtered = data.filter((b) =>
          lineas.some((l) => b.codigo === l || b.codigo.startsWith(l + '-'))
        );
      }
    }

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[budget] Error al leer PRESUPUESTO:', err);
    return NextResponse.json(
      { error: 'Error al leer el presupuesto' },
      { status: 500 }
    );
  }
}
