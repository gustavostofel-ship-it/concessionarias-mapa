'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Concessionaria, Categoria, CATEGORIAS, StatusTipo } from '@/types';
import { AddressSearch, AddressSearchRef } from './AddressSearch';
import { SlidersHorizontal, Map as MapIcon, List as ListIcon, Lock, X, Info, MapPin, User, Phone, Navigation, Zap } from 'lucide-react';

const MapClient = dynamic(() => import('./map/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-blue-600">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-md"></div>
        <span className="font-bold text-sm tracking-widest uppercase text-slate-500 animate-pulse">Carregando Mapa...</span>
      </div>
    </div>
  )
});

interface MapAppProps {
  initialConcessionarias: Concessionaria[];
  statusTipos: StatusTipo[];
}

const TODAS = '__TODAS__';
const LOGO_URL = 'https://aigdnfibsmwypcgnlyra.supabase.co/storage/v1/object/public/imagens/logo%20all%20blue.png';

function statusColor(nome: string, statusTipos: StatusTipo[]) {
  return statusTipos.find(t => t.nome === nome)?.cor || '#64748B';
}

function labelForCategoria(value: string) {
  return CATEGORIAS.find(c => c.value === value)?.label || value;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapApp({ initialConcessionarias, statusTipos: initialStatusTipos }: MapAppProps) {
  const [concessionarias, setConcessionarias] = useState<Concessionaria[]>(initialConcessionarias);
  const [statusTipos, setStatusTipos] = useState<StatusTipo[]>(initialStatusTipos);

  const [view, setView] = useState<'mapa' | 'lista'>('mapa');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(TODAS);
  const [categoriaFilter, setCategoriaFilter] = useState<Categoria[]>([]);

  const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<Concessionaria | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string }>({ distance: '', time: '' });
  const [focusStoreId, setFocusStoreId] = useState<string | null>(null);
  const searchRef = useRef<AddressSearchRef>(null);

  // Mantém os dados em tempo real: qualquer alteração no admin reflete aqui na hora.
  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase
        .from('concessionarias')
        .select('*, contatos(*)')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(500);
      if (data) setConcessionarias(data as Concessionaria[]);
    };
    const fetchStatusTipos = async () => {
      const { data } = await supabase.from('status_tipos').select('*').order('ordem', { ascending: true });
      if (data) setStatusTipos(data as StatusTipo[]);
    };

    const channel = supabase
      .channel('public-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'concessionarias' }, fetchStores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contatos' }, fetchStores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_tipos' }, fetchStatusTipos)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRouteFound = useCallback((distance: string, time: string) => {
    setRouteInfo({ distance, time });
  }, []);

  const handleClearOrigin = () => {
    setOrigin(null);
    setDestination(null);
    setRouteInfo({ distance: '', time: '' });
    searchRef.current?.clear();
  };

  const handleClearFilters = () => {
    setStatusFilter(TODAS);
    setCategoriaFilter([]);
  };

  const toggleCategoria = (cat: Categoria) => {
    setCategoriaFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const activeFilterCount = (statusFilter !== TODAS ? 1 : 0) + categoriaFilter.length;

  const matchesFilters = (store: Concessionaria) => {
    const statusOk = statusFilter === TODAS || store.status === statusFilter;
    // Precisa ter TODAS as categorias marcadas (não basta ter qualquer uma).
    const categoriaOk = categoriaFilter.length === 0 || categoriaFilter.every(c => (store.categorias || []).includes(c));
    return statusOk && categoriaOk;
  };

  const filteredStores = useMemo(() => {
    return concessionarias.filter(matchesFilters);
  }, [concessionarias, statusFilter, categoriaFilter]);

  const sortedStores = useMemo(() => {
    const withDistance = filteredStores
      .filter(s => s.lat != null && s.lng != null)
      .map(s => ({
        ...s,
        distancia_km: origin ? calculateDistance(origin.lat, origin.lng, s.lat, s.lng) : null,
      }));

    if (origin) {
      withDistance.sort((a, b) => (a.distancia_km ?? Infinity) - (b.distancia_km ?? Infinity));
    } else {
      withDistance.sort((a, b) => a.nome_loja.localeCompare(b.nome_loja));
    }
    return withDistance;
  }, [filteredStores, origin]);

  const nearestThree = useMemo(() => origin ? sortedStores.slice(0, 3) : [], [origin, sortedStores]);

  const handleUseDestination = (store: Concessionaria) => {
    setDestination(store);
    setRouteInfo({ distance: '', time: '' });
    setView('mapa');
    setFocusStoreId(store.id);
    setTimeout(() => setFocusStoreId(null), 100);
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-50 font-sans flex flex-col items-stretch">

      {/* Barra superior */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-[200]">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3 px-4 py-6 text-center">
          <img src={LOGO_URL} alt="Gênesis" className="h-9 md:h-11 w-auto object-contain" />
          <h1 className="text-2xl md:text-3xl font-black text-[#1e3a8a] tracking-tight">
            Mapa de Agências
          </h1>
          <p className="text-[13px] md:text-sm text-slate-500 -mt-2">
            Encontre abaixo a agência parceira mais próxima de você
          </p>

          <div className="w-full max-w-md">
            <AddressSearch
              ref={searchRef}
              className="w-full"
              onSelectAddress={(loc) => {
                setOrigin(loc);
                setRouteInfo({ distance: '', time: '' });
              }}
              onClear={handleClearOrigin}
            />
          </div>

          {/* Instrução de uso */}
          <div className="w-full max-w-md flex items-start gap-2 text-[12px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2 text-left">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p><strong>Escolha a agência mais próxima do seu endereço.</strong> Antes, filtre o tipo de veículo em "Filtros".</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setView('mapa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${view === 'mapa' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <MapIcon size={14} /> Mapa
              </button>
              <button
                onClick={() => setView('lista')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${view === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListIcon size={14} /> Lista
              </button>
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <SlidersHorizontal size={14} /> <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <Link
              href="/admin"
              className="flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              title="Acesso Administrativo"
            >
              <Lock size={16} />
            </Link>
          </div>

          {/* Barra de rota ativa */}
          {(origin || destination) && (
            <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-slate-800 text-white text-[12px] rounded-lg text-left">
              <span className="truncate max-w-[45%]"><strong className="text-emerald-400">Origem:</strong> {origin ? origin.address : 'aguardando...'}</span>
              <span className="truncate max-w-[45%]"><strong className="text-amber-400">Destino:</strong> {destination ? destination.nome_loja : 'aguardando...'}</span>
              {routeInfo.distance && (
                <span className="font-bold">{routeInfo.distance} • {routeInfo.time}</span>
              )}
              <button onClick={handleClearOrigin} className="ml-auto text-slate-300 hover:text-white underline text-[11px] font-bold">
                Limpar rota
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo principal */}
      {view === 'mapa' ? (
        <div className="relative w-full h-[70vh] min-h-[480px] md:h-[75vh]">
          <MapClient
            stores={filteredStores}
            statusTipos={statusTipos}
            origin={origin}
            destination={destination}
            focusStoreId={focusStoreId}
            onSetDestination={handleUseDestination}
            onClearOrigin={handleClearOrigin}
            onRouteFound={handleRouteFound}
          />

          {nearestThree.length > 0 && (
            <div className="absolute top-3 left-3 z-[100] w-[280px] max-w-[calc(100%-24px)] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                <Zap size={14} className="text-blue-600" />
                <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">3 mais próximas de você</h2>
              </div>
              <div className="flex flex-col divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                {nearestThree.map(store => (
                  <div key={store.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold text-slate-800 truncate">{store.nome_loja}</span>
                      <span className="text-[11px] font-bold text-emerald-600">{store.distancia_km?.toFixed(1)} km</span>
                    </div>
                    <button
                      onClick={() => handleUseDestination(store)}
                      className="flex-shrink-0 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded transition"
                    >
                      Destino
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full p-3 md:p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedStores.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                color={statusColor(store.status, statusTipos)}
                onUseDestination={() => handleUseDestination(store)}
              />
            ))}
            {sortedStores.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-400 font-medium">
                Nenhuma agência encontrada com os filtros atuais.
              </div>
            )}
          </div>
        </div>
      )}

      {isFilterOpen && (
        <FilterModal
          statusTipos={statusTipos}
          statusFilter={statusFilter}
          categoriaFilter={categoriaFilter}
          onSetStatus={setStatusFilter}
          onToggleCategoria={toggleCategoria}
          onClear={handleClearFilters}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </div>
  );
}

function StoreCard({ store, color, onUseDestination }: { store: Concessionaria & { distancia_km?: number | null }; color: string; onUseDestination: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit uppercase tracking-wider"
            style={{ backgroundColor: `${color}1A`, color, borderColor: `${color}55` }}
          >
            {store.status}
          </span>
          <h3 className="font-bold text-slate-800 leading-tight">{store.nome_loja}</h3>
        </div>
        {store.distancia_km != null && (
          <span className="flex-shrink-0 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg whitespace-nowrap">
            {store.distancia_km.toFixed(1)} km
          </span>
        )}
      </div>

      {store.categorias?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {store.categorias.map(c => (
            <span key={c} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
              {labelForCategoria(c)}
            </span>
          ))}
        </div>
      )}

      <div className="text-xs text-slate-500 space-y-1.5 leading-relaxed">
        <p className="flex items-start gap-1.5"><MapPin size={13} className="flex-shrink-0 mt-0.5" /> {store.endereco}, {store.bairro} — {store.cidade}/{store.estado}, {store.cep}</p>
        {store.proprietario && <p className="flex items-center gap-1.5"><User size={13} className="flex-shrink-0" /> {store.proprietario}</p>}
        {store.contatos && store.contatos.length > 0 && (
          <div className="flex flex-col gap-1">
            {store.contatos.map((c, i) => (
              <p key={c.id || i} className="flex items-center gap-1.5"><Phone size={13} className="flex-shrink-0" /> {c.nome}: {c.telefone}</p>
            ))}
          </div>
        )}
        {store.informacoes && <p className="italic pt-0.5">{store.informacoes}</p>}
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-1">
        <button
          onClick={onUseDestination}
          className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded shadow-sm transition"
        >
          Usar como Destino
        </button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded border border-slate-200 transition"
        >
          <Navigation size={12} /> Abrir no Google Maps
        </a>
      </div>
    </div>
  );
}

function FilterModal({ statusTipos, statusFilter, categoriaFilter, onSetStatus, onToggleCategoria, onClear, onClose }: {
  statusTipos: StatusTipo[];
  statusFilter: string;
  categoriaFilter: Categoria[];
  onSetStatus: (s: string) => void;
  onToggleCategoria: (c: Categoria) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-800">Filtros</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => onSetStatus(TODAS)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${statusFilter === TODAS ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
          >
            Todos
          </button>
          {statusTipos.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => onSetStatus(tipo.nome)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
              style={statusFilter === tipo.nome
                ? { backgroundColor: tipo.cor, borderColor: tipo.cor, color: '#fff' }
                : { backgroundColor: '#fff', borderColor: '#cbd5e1', color: '#475569' }}
            >
              {tipo.nome}
            </button>
          ))}
        </div>

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoria</p>
        <p className="text-[11px] text-slate-400 mb-2">Marcando mais de uma, mostra só quem tem todas ao mesmo tempo.</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIAS.map(cat => {
            const active = categoriaFilter.includes(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => onToggleCategoria(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onClear} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm">
            Limpar filtros
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white transition-colors text-sm">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
