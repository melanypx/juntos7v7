import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import type { UserMetadata } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const meta = (user.user_metadata ?? {}) as UserMetadata;
  const role = meta.role ?? 'viewer';
  const linea = meta.linea_presupuestaria;

  return (
    <DashboardShell
      userEmail={user.email!}
      role={role}
      lineaFiltro={linea}
    />
  );
}
