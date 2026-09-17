import { supabase } from '@/lib/supabase';
import MapApp from '@/components/MapApp';
import { Concessionaria, StatusTipo } from '@/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [{ data: storesData, error: storesError }, { data: statusData, error: statusError }] = await Promise.all([
    supabase
      .from('concessionarias')
      .select('*, contatos(*)')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(500),
    supabase
      .from('status_tipos')
      .select('*')
      .order('ordem', { ascending: true }),
  ]);

  if (storesError) console.error("Erro ao buscar concessionárias:", storesError);
  if (statusError) console.error("Erro ao buscar status:", statusError);

  const concessionarias = (storesData || []) as Concessionaria[];
  const statusTipos = (statusData || []) as StatusTipo[];

  return (
    <main className="w-full h-screen">
      <MapApp initialConcessionarias={concessionarias} statusTipos={statusTipos} />
    </main>
  );
}
