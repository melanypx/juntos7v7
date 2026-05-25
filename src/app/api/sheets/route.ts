import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSheetData } from '@/lib/sheets';
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
    const data = await getSheetData();

    // Admin: ve todo. Viewer: solo su línea (o nada si no tiene línea asignada).
    let filtered = data;
    if (role !== 'admin') {
      if (!linea) {
        filtered = []; // viewer sin línea → no ve nada
      } else {
        // Match por prefijo: "019" matchea "019-01-01", "019" solo, etc.
        filtered = data.filter((row) =>
          row.lineaPresupuestaria === linea ||
          row.lineaPresupuestaria.startsWith(linea + '-')
        );
      }
    }

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sheets] Error al leer el Sheet:', err);
    return NextResponse.json(
      { error: 'Error al leer el Google Sheet', detail: msg },
      { status: 500 }
    );
  }
}
