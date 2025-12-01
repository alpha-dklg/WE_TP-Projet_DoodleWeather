export interface Poll {
 createdAt?: Date;
 description?: string;
 has_meal?: boolean;
 id?: number;
 location?: string;
 padURL?: string;
 pollChoices?: PollChoice[];
 selectedChoice ?: PollChoice;
 pollComments?: PollCommentElement[];
 pollMealPreferences?: PollCommentElement[];
 slug?: string;
 slugAdmin?: string;
 title?: string;
 tlkURL?: string;
 updatedAt?: Date;
 clos ?: boolean;
}

export interface PollChoice {
 endDate?: Date;
 id?: number;
 startDate?: Date;
 users?: User[];
}

export interface User {
 id?: number;
 username?: string;
 mail?: string;
}

export interface ChoiceUser {
  username?: string;
  mail?: string;
  pref?: string;
  ics?: string;
  choices?: number[];
 }

export interface PollCommentElement {
 content?: string;
 id?: number;
 auteur?: string;
}

export interface EventDTO{
  startDate?: Date;
  endDate?: Date;
  description?: string;
}


export interface EventDTOAndSelectedChoice {
  eventdtos?: EventDTO[];
  selectedChoices?: number[];
}

export interface WeatherForecast {
  date: Date;
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  description: string;
  icon: string; // Code icône OpenWeatherMap (ex: "01d", "02n")
  humidity: number;
  windSpeed: number;
}

export interface WeatherApiResponse {
  list: Array<{
    dt: number; // timestamp
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    wind: {
      speed: number;
    };
  }>;
}

export interface GeocodeResponse {
  lat: number;
  lon: number;
  name: string;
}