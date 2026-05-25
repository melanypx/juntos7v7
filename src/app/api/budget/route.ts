import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getBudgetData } from '@/lib/sheets';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const data = await getBudgetData();
    return NextResponse.json(data, {
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
