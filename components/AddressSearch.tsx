'use client';

import { X } from 'lucide-react';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useDebounce } from 'use-debounce';
import { fetchAddress } from '@/lib/geocoding';
import { GeocodeResult } from '@/types';

export interface AddressSearchRef {
  clear: () => void;
}

interface AddressSearchProps {
  onSelectAddress: (location: { lat: number; lng: number; address: string }) => void;
  onClear?: () => void;
  className?: string;
}

export const AddressSearch = forwardRef<AddressSearchRef, AddressSearchProps>(({ onSelectAddress, onClear, className = '' }, ref) => {
  const [query, setQuery] = useState('');
  const [isSelected, setIsSelected] = useState(false);
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      setQuery('');
      setResults([]);
      setIsOpen(false);
      setIsSelected(false);
    }
  }));

  useEffect(() => {
    let isActive = true;
    const fn = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 3 || isSelected) {
        if (isActive) {
          setResults([]);
          setIsOpen(false);
        }
        return;
      }
      if (isActive) setLoading(true);
      const data = await fetchAddress(debouncedQuery);
      if (isActive) {
        setResults(data);
        setIsOpen(true);
        setLoading(false);
      }
    };
    fn();
    return () => {
      isActive = false;
    };
  }, [debouncedQuery, isSelected]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: GeocodeResult) => {
    setIsSelected(true);
    setQuery(result.display_name);
    setIsOpen(false);
    onSelectAddress({
      lat: Number(result.lat),
      lng: Number(result.lon),
      address: result.display_name
    });
  };

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full bg-[#f4f8fc] border border-blue-100 shadow-sm rounded-lg py-3 px-4 pr-10 text-sm font-semibold text-blue-900 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Seu endereço ou CEP"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsSelected(false);
          }}
          onClick={() => !isSelected && query.trim().length >= 3 && results.length > 0 && setIsOpen(true)}
        />
        {query && (
          <button 
            type="button"
            className="absolute inset-y-0 right-2 flex items-center justify-center p-2 rounded-full hover:bg-slate-200 transition-colors z-10"
            onClick={(e) => { 
                e.stopPropagation(); 
                e.preventDefault();
                setQuery('');
                setResults([]);
                setIsSelected(false);
                setIsOpen(false);
                onClear?.();
            }}
            title="Limpar endereço"
          >
            <X className="w-6 h-6 text-slate-500 hover:text-red-500 transition-colors" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm font-medium text-slate-500 flex items-center justify-center">
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
               Buscando...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map((result, idx) => (
                <li key={idx}>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors border-b border-transparent hover:border-slate-100"
                    onClick={() => handleSelect(result)}
                  >
                    <span className="text-[13px] font-medium text-slate-600 line-clamp-2 leading-tight">{result.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 3 ? (
             <div className="px-4 py-3 text-sm font-medium text-slate-500">Nenhum endereço encontrado.</div>
          ) : null}
        </div>
      )}
    </div>
  );
});

AddressSearch.displayName = 'AddressSearch';
