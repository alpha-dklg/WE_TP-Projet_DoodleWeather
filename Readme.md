# DoodleWeather - Planification de réunions avec prévisions météo

## Contexte

Ce projet s'inscrit dans le cadre d'un travail universitaire (Master 1 IL ISTIC - Web Engineering). Il s'agit d'une application de type doodle développée avec Quarkus.io pour le backend et Angular pour le frontend. L'application permet de créer et gérer des sondages de planification de réunions, avec gestion automatique de pads collaboratifs et de salons de discussion.

## Lancement

**Backend** (dans `api/`) :
```bash
docker-compose up --detach
./mvnw compile quarkus:dev
```

**Frontend** (dans `front/`) :
```bash
npm install
npm start
```

L'application est accessible sur `http://localhost:4200/`.

## Nouvelle fonctionnalité : Affichage météo

### Contexte du projet

Ce projet consistait à partir d'une application Web existante (DoodleStudent) et d'y ajouter une fonctionnalité front-end uniquement, consommant un service Web externe accessible sur Internet. Le projet a été renommé **DoodleWeather** pour mieux refléter l'intégration de la fonctionnalité météo. L'objectif pédagogique était de travailler sur l'intégration d'une API REST externe dans une application Angular existante, sans modifier le backend.

### Description de la fonctionnalité

Une fonctionnalité d'affichage des prévisions météo a été ajoutée au calendrier de sélection de dates. Des icônes météo s'affichent directement sur les dates des 5 prochains jours, avec un survol donnant plus de détails sur la météo du jour (température, description, vent, humidité), permettant aux utilisateurs de prendre en compte les conditions météorologiques lors de la planification de réunions en extérieur.

**Pourquoi cette fonctionnalité ?** Elle répond aux critères du projet : simple à implémenter (service Angular + composant), utile pour la planification, cohérente avec l'étape de sélection de dates, et pédagogique (consommation d'API REST externe, gestion des appels HTTP asynchrones avec RxJS, gestion des erreurs et des états de chargement).

**Intérêt** : Cette fonctionnalité illustre l'intégration d'une API REST externe (OpenWeatherMap) dans une application Angular existante, avec gestion des appels HTTP asynchrones, des états de chargement et des erreurs.

**Défis techniques** : Intégration dans FullCalendar via callbacks personnalisés, géocodage du lieu saisi, gestion des limites d'API (60 appels/min), et affichage conditionnel sans impacter l'expérience utilisateur existante.

**Difficultés de l'intégration** : L'ajout de cette fonctionnalité a nécessité de s'adapter à un code existant présentant certaines limitations. La logique métier est parfois mélangée avec la présentation, rendant le code moins modulaire. L'absence de gestion d'état centralisée et d'intercepteurs HTTP a compliqué la gestion des erreurs et des appels API. De plus, le risque de memory leaks (fuites mémoire) lié aux souscriptions non annulées a nécessité une attention particulière. Ces contraintes ont rendu l'intégration plus complexe qu'une implémentation from scratch, nécessitant une compréhension approfondie de l'architecture existante.

## L'application web avant l'ajout de la fonctionnalité 

Une démo de l'application avant l'ajout de la fonctionnalité d'affichage météo est accessible [ici](https://doodle.diverse-team.fr).

- Voici une petite [vidéo](https://drive.google.com/file/d/1GQbdgq2CHcddTlcoHqM5Zc8Dw5o_eeLg/preview) de présentation des fonctionnalités de l'application.
- Voici une petite [vidéo](https://drive.google.com/file/d/1l5UAsU5_q-oshwEW6edZ4UvQjN3-tzwi/preview) de présentation de l'architecture de l'application.
- Voici une petite [vidéo](https://drive.google.com/file/d/1jxYNfJdtd4r_pDbOthra360ei8Z17tX_/preview) de revue de code de l'application.

Un descriptif du cours, des TPs et des étapes du projet est lui accessible [ici](https://hackmd.diverse-team.fr/s/SJqu5DjSD)
