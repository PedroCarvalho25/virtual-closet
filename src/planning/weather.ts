import type { WeatherMood } from '@/preview/types';
export type Place = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
};
export type ForecastDay = {
  date: string;
  min: number;
  max: number;
  rain: number;
  mood: WeatherMood;
};
export type Forecast = { place: Place; fetchedAt: string; days: ForecastDay[] };
const cache = new Map<number, Forecast>();
export function forecastMood(min: number, max: number, rain: number): WeatherMood {
  return rain >= 55 ? 'rain' : max >= 28 ? 'warm' : min <= 14 ? 'cool' : 'mild';
}
export async function searchPlaces(name: string): Promise<Place[]> {
  if (name.trim().length < 3) throw new Error('Digite pelo menos três letras da cidade.');
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({
    name: name.trim(),
    count: '6',
    language: 'pt',
    format: 'json',
  }).toString();
  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('A busca de cidades está indisponível. Tente mais tarde.');
  const data = await response.json();
  return data.results || [];
}
export async function getForecast(place: Place): Promise<Forecast> {
  const cached = cache.get(place.id);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 30 * 60 * 1000) return cached;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
  }).toString();
  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
  if (!response.ok)
    throw new Error('A previsão está indisponível. Você ainda pode escolher o clima manualmente.');
  const { daily } = await response.json();
  if (!Array.isArray(daily?.time)) throw new Error('Não recebemos uma previsão válida.');
  const days = daily.time.flatMap((date: string, i: number) => {
    const min = daily.temperature_2m_min[i],
      max = daily.temperature_2m_max[i],
      rain = daily.precipitation_probability_max[i];
    return [min, max, rain].every(Number.isFinite)
      ? [{ date, min, max, rain, mood: forecastMood(min, max, rain) }]
      : [];
  });
  if (!days.length) throw new Error('Não há previsão disponível para este período.');
  const value = { place, fetchedAt: new Date().toISOString(), days };
  cache.set(place.id, value);
  return value;
}
