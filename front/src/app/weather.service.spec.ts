import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherService } from './weather.service';
import { WeatherForecast, WeatherApiResponse, GeocodeResponse } from './model/model';
import { environment } from '../environments/environment';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WeatherService]
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    // Nettoyer les caches entre les tests
    (service as any).GEOCODE_CACHE.clear();
    (service as any).WEATHER_CACHE.clear();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  describe('geocodeLocation', () => {
    const testLocation = 'Paris';
    const mockGeocodeResponse: GeocodeResponse[] = [{
      lat: 48.8566,
      lon: 2.3522,
      name: 'Paris'
    }];

    it('devrait géocoder un lieu avec succès', (done) => {
      service.geocodeLocation(testLocation).subscribe({
        next: (result) => {
          expect(result).toEqual({ lat: 48.8566, lon: 2.3522 });
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/geo/1.0/direct') && req.params.get('q') === testLocation
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('1');
      expect(req.request.params.get('appid')).toBe(environment.weatherApiKey);
      req.flush(mockGeocodeResponse);
    });

    it('devrait utiliser le cache si le lieu est déjà géocodé', (done) => {
      // Premier appel
      service.geocodeLocation(testLocation).subscribe({
        next: (result) => {
          expect(result).toEqual({ lat: 48.8566, lon: 2.3522 });

          // Deuxième appel - devrait utiliser le cache
          service.geocodeLocation(testLocation).subscribe({
            next: (cachedResult) => {
              expect(cachedResult).toEqual({ lat: 48.8566, lon: 2.3522 });
              // Vérifier qu'un seul appel HTTP a été fait
              httpMock.expectNone(req => req.url.includes('/geo/1.0/direct'));
              done();
            },
            error: done.fail
          });
        },
        error: done.fail
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/geo/1.0/direct')
      );
      req.flush(mockGeocodeResponse);
    });

    it('devrait gérer l\'erreur de géocodage quand le lieu n\'est pas trouvé', (done) => {
      service.geocodeLocation('InvalidLocation12345').subscribe({
        next: () => done.fail('Devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toContain('Impossible de géocoder le lieu');
          done();
        }
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/geo/1.0/direct')
      );
      req.flush([]); // Réponse vide = lieu non trouvé
    });

    it('devrait gérer les erreurs HTTP pendant le géocodage', (done) => {
      service.geocodeLocation(testLocation).subscribe({
        next: () => done.fail('Devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toContain('Impossible de géocoder le lieu');
          done();
        }
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/geo/1.0/direct')
      );
      req.error(new ErrorEvent('Network error'), {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    it('devrait réessayer en cas d\'échec', (done) => {
      let requestCount = 0;
      service.geocodeLocation(testLocation).subscribe({
        next: (result) => {
          expect(result).toEqual({ lat: 48.8566, lon: 2.3522 });
          expect(requestCount).toBeGreaterThan(1); // Devrait avoir retenté
          done();
        },
        error: done.fail
      });

      // Simuler un échec puis un succès
      httpMock.match(req => req.url.includes('/geo/1.0/direct')).forEach((req, index) => {
        requestCount++;
        if (index === 0) {
          req.error(new ErrorEvent('Network error'));
        } else {
          req.flush(mockGeocodeResponse);
        }
      });
    });
  });

  describe('getWeatherForecast', () => {
    const lat = 48.8566;
    const lon = 2.3522;
    const mockWeatherResponse: WeatherApiResponse = {
      list: [
        {
          dt: Math.floor(Date.now() / 1000) + 86400, // Demain
          main: {
            temp: 15.5,
            temp_min: 12.0,
            temp_max: 18.0,
            humidity: 65
          },
          weather: [{
            main: 'Clouds',
            description: 'nuageux',
            icon: '02d'
          }],
          wind: {
            speed: 5.5 // m/s
          }
        },
        {
          dt: Math.floor(Date.now() / 1000) + 172800, // Après-demain
          main: {
            temp: 20.0,
            temp_min: 17.0,
            temp_max: 22.0,
            humidity: 50
          },
          weather: [{
            main: 'Clear',
            description: 'ciel dégagé',
            icon: '01d'
          }],
          wind: {
            speed: 3.0 // m/s
          }
        }
      ]
    };

    it('devrait récupérer les prévisions météo avec succès', (done) => {
      service.getWeatherForecast(lat, lon).subscribe({
        next: (forecasts) => {
          expect(forecasts).toBeDefined();
          expect(Array.isArray(forecasts)).toBe(true);
          expect(forecasts.length).toBeGreaterThan(0);
          
          // Vérifier la structure des prévisions
          const forecast = forecasts[0];
          expect(forecast.date).toBeDefined();
          expect(forecast.temperature).toBeDefined();
          expect(forecast.temperatureMin).toBeDefined();
          expect(forecast.temperatureMax).toBeDefined();
          expect(forecast.description).toBeDefined();
          expect(forecast.icon).toBeDefined();
          expect(forecast.humidity).toBeDefined();
          expect(forecast.windSpeed).toBeDefined();
          
          // Vérifier la conversion du vent (m/s en km/h)
          expect(forecast.windSpeed).toBeCloseTo(5.5 * 3.6, 1);
          
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/data/2.5/forecast') &&
               req.params.get('lat') === lat.toString() &&
               req.params.get('lon') === lon.toString()
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('units')).toBe('metric');
      expect(req.request.params.get('lang')).toBe('fr');
      expect(req.request.params.get('appid')).toBe(environment.weatherApiKey);
      req.flush(mockWeatherResponse);
    });

    it('devrait utiliser le cache si les prévisions sont déjà chargées', (done) => {
      // Premier appel
      service.getWeatherForecast(lat, lon).subscribe({
        next: (forecasts1) => {
          expect(forecasts1.length).toBeGreaterThan(0);

          // Deuxième appel - devrait utiliser le cache
          service.getWeatherForecast(lat, lon).subscribe({
            next: (forecasts2) => {
              expect(forecasts2).toEqual(forecasts1);
              // Vérifier qu'un seul appel HTTP a été fait
              httpMock.expectNone(req => req.url.includes('/data/2.5/forecast'));
              done();
            },
            error: done.fail
          });
        },
        error: done.fail
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/data/2.5/forecast')
      );
      req.flush(mockWeatherResponse);
    });

    it('devrait gérer les erreurs HTTP pendant la récupération des prévisions', (done) => {
      service.getWeatherForecast(lat, lon).subscribe({
        next: () => done.fail('Devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toContain('Impossible de récupérer les prévisions météo');
          done();
        }
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/data/2.5/forecast')
      );
      req.error(new ErrorEvent('Network error'), {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    it('devrait limiter les prévisions à 5 jours', (done) => {
      // Créer une réponse avec plus de 5 jours de prévisions
      const manyForecasts: WeatherApiResponse = {
        list: Array.from({ length: 40 }, (_, i) => ({
          dt: Math.floor(Date.now() / 1000) + (i * 21600), // Toutes les 6 heures
          main: {
            temp: 15 + i,
            temp_min: 12 + i,
            temp_max: 18 + i,
            humidity: 50 + i
          },
          weather: [{
            main: 'Clear',
            description: 'ciel dégagé',
            icon: '01d'
          }],
          wind: {
            speed: 5.0
          }
        }))
      };

      service.getWeatherForecast(lat, lon).subscribe({
        next: (forecasts) => {
          expect(forecasts.length).toBeLessThanOrEqual(5);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/data/2.5/forecast')
      );
      req.flush(manyForecasts);
    });

    it('devrait transformer les données météo correctement', (done) => {
      // Réponse avec plusieurs prévisions pour le même jour (pour tester le groupement)
      const sameDayForecasts: WeatherApiResponse = {
        list: [
          {
            dt: new Date(2024, 0, 15, 10, 0, 0).getTime() / 1000, // 10h
            main: { temp: 12, temp_min: 10, temp_max: 14, humidity: 60 },
            weather: [{ main: 'Clouds', description: 'nuageux', icon: '02d' }],
            wind: { speed: 4.0 }
          },
          {
            dt: new Date(2024, 0, 15, 13, 0, 0).getTime() / 1000, // 13h (midi) - devrait être privilégié
            main: { temp: 18, temp_min: 15, temp_max: 20, humidity: 55 },
            weather: [{ main: 'Clear', description: 'ciel dégagé', icon: '01d' }],
            wind: { speed: 5.0 }
          },
          {
            dt: new Date(2024, 0, 15, 16, 0, 0).getTime() / 1000, // 16h
            main: { temp: 16, temp_min: 14, temp_max: 19, humidity: 58 },
            weather: [{ main: 'Clouds', description: 'nuageux', icon: '02d' }],
            wind: { speed: 4.5 }
          }
        ]
      };

      service.getWeatherForecast(lat, lon).subscribe({
        next: (forecasts) => {
          // Devrait avoir groupé les 3 prévisions en 1 journée
          expect(forecasts.length).toBe(1);
          
          const forecast = forecasts[0];
          // Devrait avoir pris la prévision de 13h (midi)
          expect(forecast.temperature).toBe(18);
          expect(forecast.description).toBe('ciel dégagé');
          expect(forecast.icon).toBe('01d');
          // Devrait avoir mis à jour min/max
          expect(forecast.temperatureMin).toBe(10); // Min de la journée
          expect(forecast.temperatureMax).toBe(20); // Max de la journée
          
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(
        req => req.url.includes('/data/2.5/forecast')
      );
      req.flush(sameDayForecasts);
    });
  });

  describe('transformWeatherData', () => {
    it('devrait gérer une réponse météo vide', () => {
      const emptyResponse: WeatherApiResponse = { list: [] };
      const result = (service as any).transformWeatherData(emptyResponse);
      expect(result).toEqual([]);
    });

    it('devrait formater la clé de date correctement', () => {
      const testDate = new Date(2024, 0, 15, 12, 0, 0); // 15 janvier 2024
      const dateKey = (service as any).formatDateKey(testDate);
      expect(dateKey).toBe('2024-01-15');
    });

    it('devrait gérer les mois et jours à un chiffre dans la clé de date', () => {
      const testDate = new Date(2024, 2, 5, 12, 0, 0); // 5 mars 2024
      const dateKey = (service as any).formatDateKey(testDate);
      expect(dateKey).toBe('2024-03-05');
    });
  });
});

