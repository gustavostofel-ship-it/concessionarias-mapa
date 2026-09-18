export type Categoria = "carro" | "moto" | "alto_padrao" | "blindado";

export const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "carro", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "alto_padrao", label: "Alto Padrão" },
  { value: "blindado", label: "Blindado" },
];

export interface StatusTipo {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

export interface Contato {
  id?: string;
  concessionaria_id?: string;
  nome: string;
  telefone: string;
}

export interface Concessionaria {
  id: string;
  nome_loja: string;
  proprietario: string;
  status: string;
  categorias: Categoria[];
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  informacoes?: string;
  lat: number;
  lng: number;
  contatos?: Contato[];
}

export interface GeocodeResult {
  lat: number;
  lon: number; // Nominatim/Mapbox retornam lon em vez de lng
  display_name: string;
}
