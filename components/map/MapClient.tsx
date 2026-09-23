'use client';

import { Concessionaria, CATEGORIAS, StatusTipo } from '@/types';
import { useEffect, useRef, useMemo, useState } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const MAP_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/mapbox/streets-v12";

interface MapClientProps {
  stores: Concessionaria[];
  statusTipos: StatusTipo[];
  origin: { lat: number; lng: number; address: string } | null;
  destination: Concessionaria | null;
  focusStoreId: string | null;
  onSetDestination: (store: Concessionaria) => void;
  onClearOrigin: () => void;
  onRouteFound: (distance: string, time: string) => void;
}

const BRASIL_CENTER = { lat: -15.7801, lng: -47.9292 };

function getPinColor(status: string, statusTipos: StatusTipo[]) {
  return statusTipos.find(t => t.nome === status)?.cor || '#64748B';
}

function getFirstTwoWords(name: string) {
  if (!name) return '';
  return name.split(' ').slice(0, 2).join(' ');
}

function labelForCategoria(value: string) {
  return CATEGORIAS.find(c => c.value === value)?.label || value;
}

export default function MapClient({ stores, statusTipos, origin, destination, focusStoreId, onSetDestination, onClearOrigin, onRouteFound }: MapClientProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<Concessionaria | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [showOriginPopup, setShowOriginPopup] = useState(false);

  const initialCenterLat = stores.length > 0 && stores[0].lat ? stores[0].lat : BRASIL_CENTER.lat;
  const initialCenterLng = stores.length > 0 && stores[0].lng ? stores[0].lng : BRASIL_CENTER.lng;
  const initialZoom = stores.length > 0 ? 11 : 4;

  const [viewState, setViewState] = useState({
    longitude: initialCenterLng,
    latitude: initialCenterLat,
    zoom: initialZoom,
    pitch: 0,
    bearing: 0
  });

  const [showTraffic, setShowTraffic] = useState(false);

  const visibleStores = useMemo(() => stores.filter(s => s.lat && s.lng), [stores]);

  useEffect(() => {
    if (origin && mapRef.current) {
      setShowOriginPopup(true);
      mapRef.current.flyTo({
        center: [origin.lng, origin.lat],
        zoom: 15,
        duration: 1500
      });
    }
  }, [origin]);

  useEffect(() => {
    if (!focusStoreId) return;
    const store = stores.find(s => s.id === focusStoreId);
    if (store && mapRef.current) {
      setPopupInfo(store);
      mapRef.current.flyTo({ center: [store.lng, store.lat], zoom: 16, duration: 800 });
    }
  }, [focusStoreId, stores]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!origin || !destination || !MAPBOX_TOKEN) return;
      try {
        const resp = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await resp.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteGeoJSON({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          });

          const distKm = (route.distance / 1000).toFixed(1) + ' km';
          const timeMins = Math.round(route.duration / 60) + ' min';
          onRouteFound(distKm, timeMins);

          if (mapRef.current) {
             const bounds = new mapboxgl.LngLatBounds();
             route.geometry.coordinates.forEach((coord: [number, number]) => {
               bounds.extend(coord);
             });
             mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000 });
          }
        }
      } catch (e) {
        console.error('Falha ao buscar rota:', e);
      }
    };

    if (origin && destination) {
      void fetchRoute();
    } else {
      setTimeout(() => {
        setRouteGeoJSON(null);
      }, 0);
    }
  }, [origin, destination, onRouteFound]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="absolute inset-0 z-0 h-full w-full flex items-center justify-center bg-slate-100 p-6 text-center">
        <p className="text-slate-600 font-semibold max-w-md">
          Configure a variável de ambiente <code className="bg-slate-200 px-1.5 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> para carregar o mapa.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 h-full w-full">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        ref={mapRef}
        mapStyle={MAP_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        cooperativeGestures={true}
      >
        <div style={{ position: 'absolute', right: 16, bottom: 24, zIndex: 50 }}>
          <NavigationControl position="bottom-right" showCompass={true} showZoom={false} />
        </div>

        {/* Controle de trânsito */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center justify-end gap-2 z-50">
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className="bg-white px-3 py-2 rounded-lg shadow-md text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-2"
          >
            <span>{showTraffic ? '🚦 Desligar Trânsito' : '🚦 Ligar Trânsito'}</span>
          </button>
        </div>

        {showTraffic && (
          <Source id="traffic-source" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
            <Layer
               id="traffic-line"
               type="line"
               source-layer="traffic"
               paint={{
                 'line-width': 1.5,
                 'line-color': [
                   'match',
                   ['get', 'congestion'],
                   'low', '#4caf50',
                   'moderate', '#ffeb3b',
                   'heavy', '#f44336',
                   'severe', '#8b0000',
                   'transparent'
                 ]
               }}
            />
          </Source>
        )}

        {visibleStores.map(store => (
          <Marker
            key={store.id}
            longitude={store.lng}
            latitude={store.lat}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(store);
              mapRef.current?.flyTo({ center: [store.lng, store.lat], zoom: 16, duration: 800 });
            }}
            style={{ zIndex: popupInfo?.id === store.id ? 40 : 10 }}
          >
            <div className="relative flex flex-col items-center cursor-pointer group">
              <div
                className="w-7 h-7 rounded-full border-[3px] border-white transition-transform group-hover:scale-125"
                style={{
                  backgroundColor: getPinColor(store.status, statusTipos),
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              />
              <div className="mt-1.5 bg-white/95 px-2 py-0.5 border border-slate-200/50 rounded shadow-sm text-[11px] font-black text-slate-800 whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                 {getFirstTwoWords(store.nome_loja)}
              </div>
            </div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
             longitude={popupInfo.lng}
             latitude={popupInfo.lat}
             anchor="top"
             onClose={() => setPopupInfo(null)}
             closeOnClick={false}
             closeButton={false}
             className="z-50"
             maxWidth="270px"
          >
            <div className="p-1 relative">
              <button
                onClick={() => setPopupInfo(null)}
                className="absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-800 transition-colors bg-white rounded-full hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <div className="flex flex-col gap-1 mb-3 pt-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit uppercase tracking-wider"
                  style={{
                    backgroundColor: `${getPinColor(popupInfo.status, statusTipos)}1A`,
                    color: getPinColor(popupInfo.status, statusTipos),
                    borderColor: `${getPinColor(popupInfo.status, statusTipos)}55`,
                  }}
                >
                  {popupInfo.status}
                </span>
                <h3 className="font-bold text-slate-800 leading-tight">{popupInfo.nome_loja}</h3>
                {popupInfo.categorias?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {popupInfo.categorias.map(c => (
                      <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
                        {labelForCategoria(c)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-1 mb-4 leading-relaxed">
                <p>📍 {popupInfo.endereco}, {popupInfo.bairro}</p>
                <p>{popupInfo.cidade} - {popupInfo.estado}, {popupInfo.cep}</p>
                {popupInfo.proprietario && <p>👤 {popupInfo.proprietario}</p>}
                {popupInfo.contatos && popupInfo.contatos.length > 0 && (
                  <div className="pt-1">
                    {popupInfo.contatos.map((c, i) => (
                      <p key={c.id || i}>📞 {c.nome}: {c.telefone}</p>
                    ))}
                  </div>
                )}
                {popupInfo.informacoes && <p className="pt-1 italic">{popupInfo.informacoes}</p>}
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                   onClick={() => { onSetDestination(popupInfo); setPopupInfo(null); }}
                   className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded shadow-sm transition"
                >
                   Usar como Destino
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${popupInfo.lat},${popupInfo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded border border-slate-200 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  Abrir no Google Maps
                </a>
              </div>
            </div>
          </Popup>
        )}

        {origin && (
          <Marker longitude={origin.lng} latitude={origin.lat} anchor="bottom">
             <div
               className="relative flex flex-col items-center z-40 cursor-pointer group"
               onClick={(e) => { e.stopPropagation(); setShowOriginPopup(true); }}
             >
              <div style={{ filter: 'drop-shadow(0 6px 8px rgb(0 0 0 / 0.4))' }}>
                 <svg viewBox="0 0 24 24" width="40" height="40" className="transition-transform group-hover:scale-110">
                     <path d="M12 1.5C7.305 1.5 3.5 5.305 3.5 10c0 5.25 8.5 12.5 8.5 12.5s8.5-7.25 8.5-12.5c0-4.695-3.805-8.5-8.5-8.5z" fill="#000000" stroke="#ffffff" strokeWidth="2.5"></path>
                     <circle cx="12" cy="9.5" r="3.5" fill="#ffffff"></circle>
                 </svg>
              </div>
            </div>
          </Marker>
        )}

        {origin && showOriginPopup && (
          <Popup
            longitude={origin.lng}
            latitude={origin.lat}
            anchor="bottom"
            offset={24}
            onClose={() => setShowOriginPopup(false)}
            closeOnClick={false}
            closeButton={false}
            className="z-50"
            maxWidth="280px"
          >
            <div className="p-1 pb-0 relative">
               <button
                 onClick={() => setShowOriginPopup(false)}
                 className="absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-800 transition-colors bg-transparent rounded-full hover:bg-slate-100 focus:outline-none"
                 title="Fechar"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
               <h3 className="font-bold text-[10px] mb-1 uppercase tracking-wider text-slate-400 pr-6 mt-1">Seu endereço</h3>
                <p className="text-sm font-semibold text-slate-800 mb-3 pr-2 line-clamp-2" title={origin.address}>{origin.address}</p>
                <button
                  onClick={() => { onClearOrigin(); setShowOriginPopup(false); }}
                  className="w-full px-2 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 text-[11px] font-bold rounded transition"
                >
                  Remover endereço
                </button>
             </div>
          </Popup>
        )}

        {destination && (
          <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className="absolute bottom-full mb-1 opacity-100 bg-[#ca8a04] text-white px-2 py-0.5 rounded shadow text-[9px] font-bold uppercase tracking-widest pointer-events-none whitespace-nowrap">
                 Destino
              </div>
              <div style={{ width: '32px', height: '32px', filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))' }}>
                 <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                     <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#e5e7eb" strokeWidth="1"></path>
                     <circle cx="12" cy="9" r="4" fill="#ca8a04"></circle>
                 </svg>
              </div>
            </div>
          </Marker>
        )}

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#2563eb',
                'line-width': 5,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
