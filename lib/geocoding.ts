const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const fetchAddress = async (query: string) => {
  if (!query || query.trim().length < 3) return [];
  if (!MAPBOX_TOKEN) {
    console.error("NEXT_PUBLIC_MAPBOX_TOKEN não configurado.");
    return [];
  }
  try {
    // Verifica se a busca é um CEP brasileiro (formato: xxxxxxxx ou xxxxx-xxx)
    const trimmed = query.trim();
    const isCep = /^\d{5}[-\s]?\d{3}$/.test(trimmed);
    if (isCep) {
      const cleanCep = trimmed.replace(/\D/g, '');
      try {
        const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (cepResponse.ok) {
          const cepData = await cepResponse.json();
          if (cepData && !cepData.erro) {
            const street = cepData.logradouro || '';
            const neighborhood = cepData.bairro || '';
            const city = cepData.localidade || '';
            const state = cepData.uf || '';

            const structuredAddress = [street, neighborhood, city, state, 'Brasil']
              .filter(Boolean)
              .join(', ');

            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(structuredAddress)}.json?country=br&access_token=${MAPBOX_TOKEN}&limit=1`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.features && data.features.length > 0) {
                return data.features.map((item: any) => ({
                  lat: item.center[1],
                  lon: item.center[0],
                  display_name: `CEP ${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}: ${structuredAddress}`,
                }));
              }
            }
          }
        }
      } catch (cepError) {
        console.error("Erro ao buscar/geocodificar CEP:", cepError);
      }
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=br&types=address,poi,place&access_token=${MAPBOX_TOKEN}&limit=5`
    );
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();

    return data.features.map((item: any) => ({
      lat: item.center[1], // Mapbox retorna [lon, lat]
      lon: item.center[0],
      display_name: item.place_name,
    }));
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    return [];
  }
};
