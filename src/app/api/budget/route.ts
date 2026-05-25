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
  const linea = meta.linea_presupuestaria?.trim();

  try {
    const data = await getBudgetData();

    let filtered = data;
    if (role !== 'admin') {
      if (!linea) {
        filtered = [];
      } else {
        filtered = data.filter((b) =>
          b.codigo === linea || b.codigo.startsWith(linea + '-')
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
