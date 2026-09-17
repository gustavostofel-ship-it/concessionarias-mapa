'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { Concessionaria, Categoria, CATEGORIAS, StatusTipo } from '@/types';
import { AddressSearch, AddressSearchRef } from './AddressSearch';

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

export default function MapApp({ initialConcessionarias, statusTipos }: MapAppProps) {
  const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<Concessionaria | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string }>({ distance: '', time: '' });

  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(TODAS);
  const [categoriaFilter, setCategoriaFilter] = useState<Categoria[]>([]);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const searchRefDesktop = useRef<AddressSearchRef>(null);
  const searchRefMobile = useRef<AddressSearchRef>(null);

  const handleRouteFound = useCallback((distance: string, time: string) => {
    setRouteInfo({ distance, time });
  }, []);

  const handleClearRouting = () => {
    setOrigin(null);
    setDestination(null);
    setRouteInfo({ distance: '', time: '' });
    setSearchedLocation(null);
    searchRefDesktop.current?.clear();
    searchRefMobile.current?.clear();
  };

  const toggleCategoria = (cat: Categoria) => {
    setCategoriaFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const matchesStatus = (store: Concessionaria) => {
    if (statusFilter === TODAS) return true;
    return store.status === statusFilter;
  };

  const matchesCategoria = (store: Concessionaria) => {
    if (categoriaFilter.length === 0) return true;
    return (store.categorias || []).some(c => categoriaFilter.includes(c));
  };

  const filteredStores = useMemo(() => {
    return initialConcessionarias.filter(s => matchesStatus(s) && matchesCategoria(s));
  }, [initialConcessionarias, statusFilter, categoriaFilter]);

  const filteredNearestStores = useMemo(() => {
    if (!searchedLocation) return [];

    const candidates = initialConcessionarias.filter(s => matchesStatus(s) && matchesCategoria(s));

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const computed = candidates
      .filter(s => s.lat != null && s.lng != null)
      .map(s => ({
        ...s,
        distancia_km: calculateDistance(searchedLocation.lat, searchedLocation.lng, s.lat, s.lng)
      }));

    computed.sort((a, b) => a.distancia_km - b.distancia_km);
    return computed.slice(0, 3);
  }, [initialConcessionarias, searchedLocation, statusFilter, categoriaFilter]);

  const renderRoutingAndFilters = () => (
    <div className="flex flex-col w-full bg-white">

      <div className="flex flex-col gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-w-full">
         <div className="flex items-start gap-2">
            <span className="w-20 text-[12px] font-bold text-emerald-600 uppercase mt-0.5">ORIGEM:</span>
            <span className="text-[13px] text-slate-500 font-medium leading-tight flex-1">{origin ? origin.address : 'Aguardando...'}</span>
         </div>
         <div className="flex items-start gap-2">
            <span className="w-20 text-[12px] font-bold text-blue-600 uppercase mt-0.5">DESTINO:</span>
            <span className="text-[13px] text-slate-500 font-medium leading-tight flex-1">{destination ? destination.nome_loja : 'Aguardando...'}</span>
         </div>

         {routeInfo.distance && routeInfo.time && (
            <div className="mt-2 text-sm bg-blue-50 rounded-lg p-3 flex gap-4 border border-blue-100">
              <div className="flex-1 text-center bg-white p-2 rounded shadow-sm border border-blue-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Distância</span>
                <p className="text-lg font-black text-slate-800">{routeInfo.distance}</p>
              </div>
              <div className="flex-1 text-center bg-white p-2 rounded shadow-sm border border-blue-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Tempo</span>
                <p className="text-lg font-black text-slate-800">{routeInfo.time}</p>
              </div>
            </div>
         )}

         {(origin || destination) && (
            <button
              onClick={handleClearRouting}
              className="w-full py-2.5 mt-2 bg-[#f4f8fc] hover:bg-blue-50 text-[#1e3a8a] font-black text-[13px] rounded-xl border border-blue-100 transition-colors uppercase tracking-widest cursor-pointer"
            >
              Limpar Rota
            </button>
         )}
      </div>

      {searchedLocation && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Concessionárias Mais Próximas</h2>
          </div>

          <div className="flex flex-col gap-2">
             {filteredNearestStores.length > 0 ? filteredNearestStores.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 border border-slate-200 hover:border-blue-300 rounded-xl bg-white shadow-sm transition-colors group">
                   <div className="flex flex-col flex-1 pr-3">
                      <span className="text-[13px] font-bold text-slate-800 leading-tight line-clamp-1">{s.nome_loja}</span>
                      <span className="text-[11px] font-bold text-emerald-600 mt-0.5">{(s as any).distancia_km?.toFixed(1)} km de distância</span>
                   </div>
                   <button
                      onClick={() => {
                         setOrigin(searchedLocation);
                         setDestination(s);
                         setRouteInfo({ distance: '', time: '' });
                         if (window.innerWidth < 768) setIsDrawerExpanded(false);
                      }}
                      className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded border border-transparent group-hover:shadow-md transition-all"
                   >
                      Traçar Rota
                   </button>
                </div>
             )) : (
               <p className="text-xs text-slate-500 font-medium">Nenhuma concessionária encontrada nesta região.</p>
             )}
          </div>
        </div>
      )}

      <div className="h-px bg-slate-100 w-full my-6"></div>

      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
      <div className="grid grid-cols-2 gap-y-3 gap-x-2 pb-4">
         {statusTipos.map(tipo => (
           <div key={tipo.id} className="flex items-center gap-2 cursor-pointer group" onClick={() => setStatusFilter(statusFilter === tipo.nome ? TODAS : tipo.nome)}>
             <div
               className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all ${statusFilter === tipo.nome ? 'ring-4 ring-offset-0 scale-110' : 'group-hover:scale-110'}`}
               style={{ backgroundColor: tipo.cor, boxShadow: statusFilter === tipo.nome ? `0 0 0 4px ${tipo.cor}33` : undefined }}
             ></div>
             <span className={`text-[13px] font-bold ${statusFilter === tipo.nome ? 'text-slate-900' : 'text-slate-500'}`}>{tipo.nome}</span>
           </div>
         ))}
         <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setStatusFilter(TODAS)}>
           <div className={`w-3.5 h-3.5 rounded-full bg-slate-800 flex-shrink-0 transition-all ${statusFilter === TODAS ? 'ring-4 ring-slate-200 scale-110' : 'group-hover:scale-110'}`}></div>
           <span className={`text-[13px] font-bold ${statusFilter === TODAS ? 'text-slate-900' : 'text-slate-500'}`}>Todas</span>
         </div>
      </div>

      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Categoria</p>
      <div className="flex flex-wrap gap-2 pb-2">
        {CATEGORIAS.map(cat => {
          const active = categoriaFilter.includes(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => toggleCategoria(cat.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );


  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-50 font-sans" style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '40px 40px' }}>

      {/* Card flutuante desktop */}
      <div className="hidden md:flex absolute top-4 left-4 w-[420px] z-[100] pointer-events-none flex-col gap-0 max-h-[calc(100vh-32px)]">
        <div className="bg-white rounded-xl shadow-2xl shadow-blue-900/10 border border-slate-200 pointer-events-auto flex flex-col w-full h-[calc(100vh-32px)] overflow-hidden">

          <div className="flex items-center px-5 py-4 gap-3 border-b border-gray-100 flex-shrink-0 z-50 bg-white">
              <h1 className="text-[20px] font-black text-[#1e3a8a] tracking-tight">Mapa de Concessionárias</h1>
          </div>

          <div className="p-5 flex-shrink-0 z-50 bg-white relative">
             <p className="text-[12px] font-bold text-blue-600 uppercase tracking-wide mb-2">BUSCAR ENDEREÇO / CLIENTE</p>
             <AddressSearch
                ref={searchRefDesktop}
                className="w-full"
                onSelectAddress={(loc) => {
                  setSearchedLocation(loc);
                }}
             />
          </div>

          <div className="bg-white px-5 pb-5 overflow-y-auto flex-1">
            {renderRoutingAndFilters()}
          </div>
        </div>
      </div>

      {/* Barra superior mobile */}
      <div className="md:hidden absolute top-0 left-0 w-full z-[1000] pointer-events-auto bg-white/95 backdrop-blur-md pb-4 pt-3 px-4 shadow-sm border-b border-slate-200">
        <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-[#1e3a8a] text-[15px] font-black tracking-tight">Mapa de Concessionárias</h1>
        </div>
        <AddressSearch
          ref={searchRefMobile}
          className="w-full"
          onSelectAddress={(loc) => { setSearchedLocation(loc); }}
        />
      </div>

      {/* Drawer mobile */}
      <div className="md:hidden absolute bottom-0 left-0 w-full z-[100] pointer-events-none overflow-hidden h-[100dvh]">
        <motion.div
          className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-200 pointer-events-auto flex flex-col"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.y > 60 || velocity.y > 200) setIsDrawerExpanded(false);
            else if (offset.y < -60 || velocity.y < -200) setIsDrawerExpanded(true);
          }}
          animate={{ y: isDrawerExpanded ? 0 : 'calc(100% - 70px)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ height: 'auto', maxHeight: '85vh' }}
        >
          <div
             className="w-full pt-3 pb-4 hover:cursor-grab active:cursor-grabbing flex-shrink-0 flex flex-col items-center justify-center bg-white rounded-t-3xl"
             onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            {!isDrawerExpanded && <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Ver Rota e Filtros</span>}
          </div>

          <div
             className="overflow-y-auto px-5 pb-8 hide-scrollbar flex flex-col flex-1 bg-white"
             onPointerDown={(e) => {
                e.stopPropagation();
             }}
          >
            {renderRoutingAndFilters()}
          </div>
        </motion.div>
      </div>

      <MapClient
        stores={filteredStores}
        statusTipos={statusTipos}
        origin={origin}
        destination={destination}
        searchedLocation={searchedLocation}
        onSetOriginFromPin={(s) => {
          setOrigin({ lat: s.lat, lng: s.lng, address: `Concessionária: ${s.nome_loja}` });
          setRouteInfo({ distance: '', time: '' });
          setSearchedLocation(null);
        }}
        onSetDestination={(s) => {
          setDestination(s);
          setRouteInfo({ distance: '', time: '' });
          setSearchedLocation(null);
        }}
        onSetOriginFromSearch={() => {
           if(searchedLocation) setOrigin(searchedLocation);
           setRouteInfo({ distance: '', time: '' });
        }}
        onSetDestinationFromSearch={() => {
           if(searchedLocation) setDestination({ lat: searchedLocation.lat, lng: searchedLocation.lng, nome_loja: searchedLocation.address } as Concessionaria);
           setRouteInfo({ distance: '', time: '' });
        }}
        onRouteFound={handleRouteFound}
        onClearEvent={handleClearRouting}
      />
    </div>
  );
}
