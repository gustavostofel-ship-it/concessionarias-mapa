export type Categoria = "carro" | "moto" | "alto_padrao" | "blindado";

export const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "carro", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "alto_padrao", label: "Alto Padrão" },
  { value: "blindado", label: "Blindado" },
];

export type StatusConcessionaria = "CREDENCIADA" | "PRÉ CREDENCIADA" | "SUSPENSA";

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
  status: StatusConcessionaria | string;
  categorias: Categoria[];
  endereco: string;
  bairro: string;
  cidade: string;
  regiao: string;
  estado: string;
  cep: string;
  horario_de_funcionamento?: string;
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
