import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { PollService } from '../poll-service.service';
import { WeatherService } from '../weather.service';
import { FullCalendarComponent } from '@fullcalendar/angular';
import frLocale from '@fullcalendar/core/locales/fr';
import { PollChoice, Poll, User, WeatherForecast } from '../model/model';
import { ActivatedRoute } from '@angular/router';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

/*FullCalendarModule.registerPlugins([ // register FullCalendar plugins
  dayGridPlugin,
  interactionPlugin,
  timeGridPlugin
]);*/


@Component({
  selector: 'app-create-poll-component',
  templateUrl: './create-poll-component.component.html',
  styleUrls: ['./create-poll-component.component.css'],
  providers: [MessageService, PollService, FullCalendarComponent]
})
export class CreatePollComponentComponent implements OnInit, OnDestroy {
  urlsondage = '';
  urlsondageadmin = '';
  urlsalon = '';
  urlpad = '';

  items: MenuItem[];
  options: CalendarOptions;

  step = 0;

  slugid: string;
  poll: Poll = {};

  events: EventInput[] = [];
  eventsfromics: EventInput[] = [];
  allevents: EventInput[] = [];


  calendarComponent: FullCalendarComponent;
  hasics = false;
  loadics = false;
  ics: string;

  // Weather properties
  weatherForecasts: Map<string, WeatherForecast> = new Map();
  loadingWeather = false;
  private destroy$ = new Subject<void>();

  @ViewChild('calendar') set content(content: FullCalendarComponent) {
    if (content) { // initially setter gets called with undefined
      this.calendarComponent = content;
      const calendarApi = this.calendarComponent.getApi();

      this.poll.pollChoices.forEach(pc => {

        const evt =
        {
          title: '',
          start: pc.startDate,
          end: pc.endDate,
          resourceEditable: false,
          eventResizableFromStart: false,
          extendedProps: {
            choiceid: pc.id,
            tmpId: this.getUniqueId(8)
          },
        };
        this.events.push(evt);
        calendarApi.addEvent(evt, true);

      });
      calendarApi.setOption('validRange', {
        start: this.getValidDate(),
      });

    }
  }
  submitted = false;


  constructor(
    public messageService: MessageService,
    public pollService: PollService,
    private actRoute: ActivatedRoute,
    private weatherService: WeatherService
  ) { }

  ngOnInit(): void {
    this.poll.pollChoices = [];
    this.items = [{
      label: 'Informations pour le rendez vous',
      command: () => {
        this.step = 0;
      }
    },
    {
      label: 'Choix de la date',
      command: () => {
        this.step = 1;
        this.loadWeatherForecast();
      }
    },
    {
      label: 'Résumé',
      command: () => {
        this.step = 2;
      }
    }
    ];



    this.options = {
      initialView: 'timeGridWeek',
      plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin],

      // dateClick: this.handleDateClick.bind(this), // bind is important!
      select: (selectionInfo) => {
        console.log(selectionInfo);
        const calendarApi = this.calendarComponent.getApi();
        console.log(this.getUniqueId(8));
        const evt = {
          title: '',
          start: selectionInfo.start,
          end: selectionInfo.end,
          resourceEditable: true,
          eventResizableFromStart: true,
          id: this.getUniqueId(8),

          extendedProps: {
//            tmpId: this.getUniqueId(8)
          },
        };
        calendarApi.addEvent(evt, true);
        this.events.push(evt);
        this.allevents.push(evt);
      },

      events: this.allevents,
      editable: true,
      droppable: true,
      //      selectMirror: true,
      eventResizableFromStart: true,
      selectable: true,
      locale: frLocale,
      themeSystem: 'bootstrap',
      slotMinTime: '08:00:00',
      slotMaxTime: '20:00:00',
      eventMouseEnter: (mouseEnterInfo) => {

      },
      eventDrop: (info) => {
        const evt = this.events.filter(e => e.id === info.event.id).pop();
        evt.start = info.event.start;
        evt.end = info.event.end;
      },
      eventResize: (info) => {
        const evt = this.events.filter(e => e.id === info.event.id).pop();
        const index = this.events.indexOf(evt);
        evt.start = info.event.start;
        evt.end = info.event.end;
      },
      eventClick: (info) => {
        const evt = this.events.filter(e => e.id === info.event.id).pop();
        if (evt != null){
        const index = this.events.indexOf(evt);
        if (index > -1) {
          this.events.splice(index, 1);
        }
        const index1 = this.allevents.indexOf(evt);
        if (index1 > -1) {
          this.allevents.splice(index1, 1);
        }
        info.event.remove();
      }

      },
      validRange: {
        start: Date.now()
      },
      dayCellDidMount: (arg) => {
        this.addWeatherIconToCell(arg);
      }
    };

    this.actRoute.paramMap.subscribe(params => {
      this.slugid = params.get('slugadminid');
      console.log(this.slugid);

      if (this.slugid != null) {

        this.pollService.getPollBySlugAdminId(this.slugid).subscribe(p => {
          if (p != null) {
            this.poll = p;
          } else {
            this.messageService.add(
              {
                severity: 'warn',
                summary: 'Un sondage avec cet identifiant n\'existe pas',
                detail: 'Le sondage n\'a pas été récupéré'
              }
            );
          }

        });
      }

    });



  }

  nextPage(): void {

    if (this.poll.title && this.poll.location && this.poll.description) {
      this.step = 1;
      // Charger la météo quand on passe à l'étape 1
      this.loadWeatherForecast();
      return;
    }
    this.messageService.add(
      {
        severity: 'warn',
        summary: 'Données incomplètes',
        detail: 'Veuillez remplir les champs requis'
      }
    );

    this.submitted = true;
  }

  nextPage1(): void {
    console.log(this.poll.id);
    if (this.poll.id == null) {
      this.events.forEach(e => {
        this.poll.pollChoices.push({
          startDate: e.start as any,
          endDate: e.end as any,
        });
      });
      this.pollService.createPoll(this.poll).subscribe(p1 => {
        this.poll = p1;
        this.urlsondage = window.location.protocol + '//' + window.location.host + '/answer/' + p1.slug;
        this.urlsondageadmin = window.location.protocol + '//' + window.location.host + '/admin/' + p1.slugAdmin;
        this.urlsalon = p1.tlkURL;
        this.urlpad = p1.padURL;
        this.step = 2;
      });
    } else {

      const toKeep: PollChoice[] = [];
      this.events.filter(c => c.extendedProps != null && c.extendedProps.choiceid != null).forEach(e => {
        toKeep.push(this.poll.pollChoices.filter(c1 => c1.id === e.extendedProps.choiceid)[0]);
      });
      this.poll.pollChoices = toKeep;
      this.poll.pollChoices.forEach(c => {
        const res = this.events.filter(c1 => c1.extendedProps != null &&
          c1.extendedProps.choiceid != null && c1.extendedProps.choiceid === c.id)[0];
        c.startDate = res.start as any;
        c.endDate = res.end as any;
      });

      this.events.filter(c => c.extendedProps == null || c.extendedProps.choiceid == null).forEach(e => {
        this.poll.pollChoices.push({
          startDate: e.start as any,
          endDate: e.end as any,
        });
      });
      console.log(this.events);
      console.log(this.poll.pollChoices);

      this.pollService.updtatePoll(this.poll).subscribe(p1 => {
        this.poll = p1;
        this.urlsondage = 'http://localhost:4200/answer/' + p1.slug;
        this.urlsondageadmin = 'http://localhost:4200/admin/' + p1.slugAdmin;
        this.urlsalon = p1.tlkURL;
        this.urlpad = p1.padURL;
        this.step = 2;
      });


    }

  }

  prevPage1(): void {

    this.step = this.step - 1;
  }


  private getUniqueId(parts: number): string {
    const stringArr = [];
    for (let i = 0; i < parts; i++) {
      // tslint:disable-next-line:no-bitwise
      const S4 = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      stringArr.push(S4);
    }
    return stringArr.join('-');
  }

  private getValidDate(): number {
    if (this.poll.id != null) {
      if ((this.poll.pollChoices[0].startDate as any - Date.now()) < 0) {
        return this.poll.pollChoices[0].startDate as any;
      }
    }
    return Date.now();

  }


  getICS(): void {
    this.loadics = true;
    this.pollService.getICS(this.slugid, this.ics).subscribe(res => {
      this.loadics = false;

      const calendarApi = this.calendarComponent.getApi();
      if (res.eventdtos.length > 0) {
        this.eventsfromics.forEach(eid => {
          const index = this.allevents.indexOf(eid);
          if (index > -1) {
            this.allevents.splice(index, 1);
          }
          calendarApi.getEventById(eid.id)?.remove();
        });
        this.eventsfromics = [];
      }
      console.log(res);

      res.eventdtos.forEach(evtdto => {      // calendarApi.next();
        const evt1 =
        {
          title: evtdto.description,
          start: evtdto.startDate,
          end: evtdto.endDate,
          resourceEditable: false,
          editable: false,
          droppable: false,
          selectable: false,
          eventResizableFromStart: false,
          id: this.getUniqueId(8),

          backgroundColor: 'red',
          extendedProps: {
            fromics: true
          },


        };
        const eventAPI = calendarApi.addEvent(evt1, true);
        this.eventsfromics.push(evt1);
        this.allevents.push(evt1);

      });

      const unselected = this.events.map(ev => ev.extendedProps.choiceid);
      res.selectedChoices.forEach(e => {
        const index = unselected.indexOf(e);
        if (index > -1) {
          unselected.splice(index, 1);
        }
        const evt1 = this.events.filter(ev => ev.extendedProps.choiceid === e)[0];

        const evt2 = calendarApi.getEventById(evt1.id);
        evt1.backgroundColor = 'red';
        evt1.extendedProps.selected = false;
        evt2.setProp('backgroundColor', 'red');
//        this.poll.pollChoices.filter(pc => pc.id === evt1.extendedProps.choiceid)[0].users.push({ id: -1 });
      });
      unselected.forEach(e => {
        const evt1 = this.events.filter(ev => ev.extendedProps.choiceid === e)[0];

        const evt2 = calendarApi.getEventById(evt1.id);
        evt1.backgroundColor = 'green';
        evt1.extendedProps.selected = true;
        evt2.setProp('backgroundColor', 'green');
        this.poll.pollChoices.filter(pc => pc.id === evt1.extendedProps.choiceid)[0].users.push({ id: -1 });
      });
    }, (err) => {
      this.loadics = false;

      this.messageService.add(
        {
          severity: 'warn',
          summary: 'Ne peut récupérer l\'agenda à partir de l\'adresse de l\'ics',
          detail: 'Une erreur s\'est produite au moment de la récupération de l\'agenda'
        }
      );
    }
    );

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les prévisions météo pour le lieu spécifié
   */
  loadWeatherForecast(): void {
    if (!this.poll.location || this.poll.location.trim() === '') {
      return;
    }

    this.loadingWeather = true;
    this.weatherForecasts.clear();

    this.weatherService.geocodeLocation(this.poll.location)
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe({
        next: (coords) => {
          this.weatherService.getWeatherForecast(coords.lat, coords.lon)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (forecasts) => {
                forecasts.forEach(forecast => {
                  const dateKey = this.formatDateKey(forecast.date);
                  this.weatherForecasts.set(dateKey, forecast);
                });
                this.loadingWeather = false;
                // Ajouter les icônes météo une fois les données chargées
                // Utiliser requestAnimationFrame pour s'assurer que le DOM est prêt
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    if (this.calendarComponent) {
                      // Ajouter les icônes directement aux cellules visibles
                      this.addWeatherIconsToAllCells();
                      // Forcer également un re-rendu pour déclencher dayCellDidMount
                      this.refreshWeatherIcons();
                    }
                  }, 150);
                });
              },
              error: (error) => {
                console.error('Erreur chargement météo:', error);
                this.loadingWeather = false;
                // Pas de message d'erreur bloquant, juste un log
              }
            });
        },
        error: (error) => {
          console.error('Erreur géocodage:', error);
          this.loadingWeather = false;
          // Message discret si géocodage échoue
          this.messageService.add({
            severity: 'info',
            summary: 'Météo indisponible',
            detail: 'Impossible de récupérer la météo pour ce lieu',
            life: 3000
          });
        }
      });
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

  /**
   * Ajoute l'icône météo à une cellule de date
   */
  private addWeatherIconToCell(arg: any): void {
    // Retirer l'icône existante si elle existe
    const existingIcon = arg.el.querySelector('.weather-icon');
    if (existingIcon) {
      existingIcon.remove();
    }

    // Date de la cellule
    const cellDate = new Date(arg.date);
    const dateKey = this.formatDateKey(cellDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDateOnly = new Date(cellDate);
    cellDateOnly.setHours(0, 0, 0, 0);

    // Vérifier si c'est une date future (pas dans le passé) et dans les 5 prochains jours
    const daysDiff = Math.ceil((cellDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isFutureDate = daysDiff >= 0 && daysDiff <= 5;

    if (isFutureDate && this.weatherForecasts.has(dateKey)) {
      const forecast = this.weatherForecasts.get(dateKey)!;
      const iconUrl = `https://openweathermap.org/img/wn/${forecast.icon}@2x.png`;
      
      const iconEl = document.createElement('img');
      iconEl.src = iconUrl;
      iconEl.className = 'weather-icon';
      iconEl.alt = forecast.description;
      iconEl.title = this.getWeatherTooltip(forecast);
      
      // Trouver le conteneur de la cellule
      const dayFrame = arg.el.querySelector('.fc-daygrid-day-frame') || arg.el;
      if (dayFrame) {
        dayFrame.appendChild(iconEl);
      }
    }
  }

  /**
   * Ajoute les icônes météo à toutes les cellules visibles
   * Utilisé après le chargement des données météo
   */
  private addWeatherIconsToAllCells(): void {
    if (!this.calendarComponent) {
      return;
    }

    const calendarApi = this.calendarComponent.getApi();
    const view = calendarApi.view;
    
    if (!view) {
      return;
    }

    // Obtenir toutes les dates visibles dans la vue actuelle
    const start = view.activeStart;
    const end = view.activeEnd;
    const currentDate = new Date(start);
    
    // Parcourir toutes les dates visibles
    while (currentDate <= end) {
      const dateKey = this.formatDateKey(currentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cellDateOnly = new Date(currentDate);
      cellDateOnly.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.ceil((cellDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isFutureDate = daysDiff >= 0 && daysDiff <= 5;
      
      if (isFutureDate && this.weatherForecasts.has(dateKey)) {
        // Trouver la cellule correspondante dans le DOM
        const dayCells = document.querySelectorAll('.fc-daygrid-day');
        dayCells.forEach((cell: Element) => {
          const dayEl = cell as HTMLElement;
          const dayNumber = dayEl.querySelector('.fc-daygrid-day-number');
          
          if (dayNumber) {
            const dayText = dayNumber.textContent?.trim();
            const currentDay = currentDate.getDate().toString();
            
            // Vérifier si c'est la bonne cellule (même jour)
            if (dayText === currentDay || dayText === currentDay.padStart(2, '0')) {
              // Vérifier si l'icône n'existe pas déjà
              if (!dayEl.querySelector('.weather-icon')) {
                const forecast = this.weatherForecasts.get(dateKey)!;
                const iconUrl = `https://openweathermap.org/img/wn/${forecast.icon}@2x.png`;
                
                const iconEl = document.createElement('img');
                iconEl.src = iconUrl;
                iconEl.className = 'weather-icon';
                iconEl.alt = forecast.description;
                iconEl.title = this.getWeatherTooltip(forecast);
                
                const dayFrame = dayEl.querySelector('.fc-daygrid-day-frame');
                if (dayFrame) {
                  dayFrame.appendChild(iconEl);
                }
              }
            }
          }
        });
      }
      
      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  /**
   * Retourne le tooltip avec les détails météo
   */
  private getWeatherTooltip(forecast: WeatherForecast): string {
    return `${forecast.temperature.toFixed(0)}°C - ${forecast.description} - Vent: ${forecast.windSpeed.toFixed(0)} km/h - Humidité: ${forecast.humidity}%`;
  }

  /**
   * Retourne l'icône météo pour une date donnée
   */
  getWeatherIcon(date: Date): string | null {
    const dateKey = this.formatDateKey(date);
    const forecast = this.weatherForecasts.get(dateKey);
    return forecast ? `https://openweathermap.org/img/wn/${forecast.icon}@2x.png` : null;
  }

  /**
   * Rafraîchit toutes les icônes météo dans le calendrier
   * Force un re-rendu complet pour déclencher dayCellDidMount à nouveau
   */
  private refreshWeatherIcons(): void {
    if (!this.calendarComponent) {
      return;
    }

    const calendarApi = this.calendarComponent.getApi();
    
    // Forcer un re-rendu complet en changeant temporairement la vue
    // Cela déclenchera dayCellDidMount pour toutes les cellules
    const currentView = calendarApi.view.type;
    const currentDate = calendarApi.getDate();
    
    // Changer la vue puis la remettre pour forcer le re-rendu
    calendarApi.changeView(currentView === 'timeGridWeek' ? 'dayGridWeek' : 'timeGridWeek');
    setTimeout(() => {
      calendarApi.changeView(currentView);
      calendarApi.gotoDate(currentDate);
    }, 50);
  }
}
