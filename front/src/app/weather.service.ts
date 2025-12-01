import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { WeatherForecast, WeatherApiResponse, GeocodeResponse } from './model/model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly API_BASE_URL = 'https://api.openweathermap.org';
  private readonly GEOCODE_CACHE = new Map<string, { lat: number; lon: number }>();
  private readonly WEATHER_CACHE = new Map<string, WeatherForecast[]>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(private http: HttpClient) { }

  /**
   * Géocode un lieu (nom de ville) en coordonnées lat/lon
   */
  geocodeLocation(location: string): Observable<{ lat: number; lon: number }> {
    // Vérifier le cache
    if (this.GEOCODE_CACHE.has(location)) {
      return of(this.GEOCODE_CACHE.get(location)!);
    }

    const url = `${this.API_BASE_URL}/geo/1.0/direct`;
    const params = {
      q: location,
      limit: '1',
      appid: environment.weatherApiKey
    };

    return this.http.get<GeocodeResponse[]>(url, { params }).pipe(
      retry(2),
      map(response => {
        if (response && response.length > 0) {
          const result = {
            lat: response[0].lat,
            lon: response[0].lon
          };
          // Mettre en cache
          this.GEOCODE_CACHE.set(location, result);
          return result;
        }
        throw new Error('Lieu non trouvé');
      }),
      catchError(error => {
        console.error('Erreur de géocodage:', error);
        return throwError(() => new Error('Impossible de géocoder le lieu'));
      })
    );
  }

  /**
   * Récupère les prévisions météo pour les 5 prochains jours
   */
  getWeatherForecast(lat: number, lon: number): Observable<WeatherForecast[]> {
    const cacheKey = `${lat},${lon}`;
    
    // Vérifier le cache
    const cached = this.WEATHER_CACHE.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    const url = `${this.API_BASE_URL}/data/2.5/forecast`;
    const params = {
      lat: lat.toString(),
      lon: lon.toString(),
      appid: environment.weatherApiKey,
      units: 'metric',
      lang: 'fr'
    };

    return this.http.get<WeatherApiResponse>(url, { params }).pipe(
      retry(2),
      map(response => {
        const forecasts = this.transformWeatherData(response);
        // Mettre en cache
        this.WEATHER_CACHE.set(cacheKey, forecasts);
        // Nettoyer le cache après la durée spécifiée
        setTimeout(() => {
          this.WEATHER_CACHE.delete(cacheKey);
        }, this.CACHE_DURATION);
        return forecasts;
      }),
      catchError(error => {
        console.error('Erreur de récupération météo:', error);
        return throwError(() => new Error('Impossible de récupérer les prévisions météo'));
      })
    );
  }

  /**
   * Transforme les données de l'API en format WeatherForecast
   * Groupe les prévisions par jour et prend la moyenne/meilleure valeur
   */
  private transformWeatherData(response: WeatherApiResponse): WeatherForecast[] {
    const dailyForecasts = new Map<string, WeatherForecast>();

    response.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = this.formatDateKey(date);

      // Prendre la prévision de midi (12h) si disponible, sinon la première de la journée
      const hour = date.getHours();
      const isBestTime = hour >= 11 && hour <= 14;

      if (!dailyForecasts.has(dateKey) || isBestTime) {
        const weather = item.weather[0];
        dailyForecasts.set(dateKey, {
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          temperature: item.main.temp,
          temperatureMin: item.main.temp_min,
          temperatureMax: item.main.temp_max,
          description: weather.description,
          icon: weather.icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed * 3.6 // Conversion m/s en km/h
        });
      } else {
        // Mettre à jour min/max si nécessaire
        const existing = dailyForecasts.get(dateKey)!;
        if (item.main.temp_min < existing.temperatureMin) {
          existing.temperatureMin = item.main.temp_min;
        }
        if (item.main.temp_max > existing.temperatureMax) {
          existing.temperatureMax = item.main.temp_max;
        }
      }
    });

    return Array.from(dailyForecasts.values()).slice(0, 5); // Limiter à 5 jours
  }

  /**
   * Formate une date en clé string (YYYY-MM-DD)
   */
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

