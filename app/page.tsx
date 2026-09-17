import { supabase } from '@/lib/supabase';
import MapApp from '@/components/MapApp';
import { Concessionaria } from '@/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data, error } = await supabase
    .from('concessionarias')
    .select('*, contatos(*)')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(500);

  if (error) {
    console.error("Erro ao buscar concessionárias:", error);
  }

  const concessionarias = (data || []) as Concessionaria[];

  return (
    <main className="w-full h-screen">
      <MapApp initialConcessionarias={concessionarias} />
    </main>
  );
}
