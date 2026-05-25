import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSheetData } from '@/lib/sheets';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const data = await getSheetData();
    return NextResponse.json(data, {
      headers: {
        // Cache por 5 minutos en Vercel Edge; sirve stale mientras revalida
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
