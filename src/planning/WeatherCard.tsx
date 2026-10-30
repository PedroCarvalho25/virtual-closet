import { useState } from 'react';
import { Linking } from 'react-native';
import { Button, Field, Label, Notice } from '@/components/ui';
import { Card } from '@/evolution/components';
import { useTask } from '@/hooks/useData';
import { formatDate } from '@/lib/dates';
import type { WeatherMood } from '@/preview/types';
import { getForecast, searchPlaces, type Place, type Forecast } from './weather';
export function WeatherCard({
  city = '',
  onChoose,
  date,
}: {
  city?: string;
  date?: string;
  onChoose?: (weather: WeatherMood) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(city),
    [places, setPlaces] = useState<Place[]>([]),
    [forecast, setForecast] = useState<Forecast | null>(null);
  const task = useTask();
  return (
    <Card title="Vista o dia que vem">
      <Button
        title={open ? 'Fechar previsão' : 'Consultar previsão por cidade'}
        secondary
        icon="cloud"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Label className="text-xs text-muted">
            Consulta opcional à Open-Meteo. Enviamos a cidade escolhida, sem usar o GPS nem enviar
            dados do seu closet.
          </Label>
          <Field label="Cidade da previsão" value={query} onChangeText={setQuery} maxLength={100} />
          <Button
            title="Buscar cidade"
            busy={task.busy}
            onPress={() =>
              void task.run(
                () => searchPlaces(query),
                (result) => {
                  setPlaces(result);
                  setForecast(null);
                  if (!result.length)
                    task.setSuccess('Nenhuma cidade encontrada. Tente nome e região.');
                },
              )
            }
          />
          {places.map((p) => (
            <Button
              key={p.id}
              title={`${p.name} · ${p.admin1 || p.country}`}
              secondary
              small
              busy={task.busy}
              onPress={() =>
                void task.run(
                  () => getForecast(p),
                  (value) => {
                    setForecast(value);
                    setPlaces([]);
                  },
                )
              }
            />
          ))}
          <Notice message={task.error} />
          <Notice message={task.success} kind="info" />
          {forecast && (
            <>
              <Label className="font-semibold">
                {forecast.place.name} · {forecast.place.admin1 || forecast.place.country}
              </Label>
              <Label className="text-xs text-muted">
                Consultada em {new Date(forecast.fetchedAt).toLocaleString('pt-BR')}. A previsão
                pode mudar.
              </Label>
              {forecast.days
                .filter((d) => !date || d.date === date)
                .map((d) => (
                  <Card key={d.date}>
                    <Label>
                      {formatDate(d.date)} · {Math.round(d.min)}–{Math.round(d.max)} °C
                    </Label>
                    <Label className="text-xs">Probabilidade de chuva: {d.rain}%</Label>
                    {onChoose && (
                      <Button
                        title="Usar este clima nas sugestões"
                        small
                        secondary
                        onPress={() => onChoose(d.mood)}
                      />
                    )}
                  </Card>
                ))}
              {date && !forecast.days.some((d) => d.date === date) && (
                <Label>A data do evento ainda está fora dos sete dias de previsão.</Label>
              )}
              <Button
                title="Dados meteorológicos: Open-Meteo"
                secondary
                small
                onPress={() => void Linking.openURL('https://open-meteo.com/')}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
}
