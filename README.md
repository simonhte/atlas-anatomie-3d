# Atlas 3D · Anatomie P2

Atlas d'anatomie humaine en 3D pour réviser la P2 (DFGSM2) : modèles anatomiques réels
(BodyParts3D), fiches de cours en français, et bientôt dissection par couches, coupes et quiz.

> État : **étape 1 — squelette complet + visualiseur**.

## Lancer l'app sur le Mac

Ouvre le Terminal, place-toi dans le dossier du projet, puis lance le serveur de développement :

```bash
cd ~/Documents/atlas-anatomie-3d
npm run dev
```

- `cd` : se déplacer dans le dossier du projet.
- `npm run dev` : démarre un petit serveur web local. Laisse cette fenêtre ouverte ; `Ctrl + C` pour l'arrêter.

Ouvre ensuite **http://localhost:5173** dans Safari ou Chrome.

La première fois seulement (ou après une mise à jour des dépendances) : `npm install`.

## Sur la tablette ou le téléphone (même Wi-Fi)

Quand `npm run dev` tourne, le Terminal affiche une ligne `Network: http://192.168.x.x:5173/`.
Tape cette adresse dans le navigateur de la tablette ou du téléphone, **connecté au même réseau Wi-Fi que le Mac**.
L'adresse change selon le réseau (maison, BU, partage de connexion) : relis-la à chaque fois.

Au doigt : 1 doigt = tourner · 2 doigts = pincer pour zoomer et déplacer · appui court = sélectionner.

## Commandes utiles

| Commande | Ce qu'elle fait |
|---|---|
| `npm run dev` | Lance l'app en local (avec rechargement automatique) |
| `npm test` | Lance les tests automatiques (recherche, noms, fiches, données…) |
| `npm run check` | Vérifie les types du code |
| `npm run build` | Fabrique la version à mettre en ligne dans `dist/` |
| `npm run modeles` | Refait tout le pipeline des modèles 3D (voir ci-dessous) |

## Organisation du dépôt

```
contenu/fiches/      Fiches de cours en Markdown (à relire et corriger ! voir LISEZMOI.md)
pipeline/            Scripts de fabrication des modèles 3D
  01-telecharger.mjs   télécharge BodyParts3D (≈ 140 Mo) dans sources/
  02-inventaire.mjs    associe chaque maillage à son identifiant FMA, son nom FR/latin, sa région
  03-construire-glb.mjs  convertit en GLB compressés (meshopt), 2 niveaux de détail, par région
  config/noms-os.mjs   table de traduction des noms d'os
  sortie/inventaire.json  résultat lisible de l'inventaire
public/models/       Modèles 3D générés (GLB)
public/data/         Métadonnées des structures (générées)
src/                 Code de l'application (Svelte + Three.js)
tests/               Tests automatiques
reference/           Prototype d'origine
```

## Pipeline des modèles

```bash
npm run modeles
```

1. Télécharge BodyParts3D 4.0 (licence CC BY 4.0) dans `sources/` (non versionné).
2. Lit l'en-tête de chaque fichier OBJ (identifiant FMA, nom anglais), classe par système grâce aux
   arborescences FMA, traduit en français et en latin. Les disques intervertébraux sont nommés
   d'après leur position réelle entre les vertèbres ; les doublons exacts sont écartés.
3. Construit un GLB par système × région, en deux niveaux de détail :
   `hi` (maillage d'origine) et `lo` (≈ 25 % des triangles, pour les téléphones et le premier affichage).

Squelette actuel : 242 maillages, 3,3 Mo en haute définition, 1,4 Mo en version légère.

**Manques connus de BodyParts3D** : pas de coccyx, pas de cartilages costaux 8 à 10,
très peu de nerfs (seulement des branches orbitaires), modèle masculin uniquement.

## Pourquoi cette stack

- **Vite + TypeScript** : démarrage instantané, code typé donc plus facile à maintenir.
- **Three.js** : la bibliothèque 3D web de référence (déjà utilisée par le prototype).
- **Svelte** : interface légère et lisible, peu de code à charger (important sur téléphone).
- **meshopt + glTF Transform** : modèles compressés et simplifiés automatiquement.

## Licences

Voir la page « Crédits » dans l'app. Modèles : BodyParts3D, © The Database Center for Life Science,
CC BY 4.0. Code : bibliothèques libres sous licence MIT.
