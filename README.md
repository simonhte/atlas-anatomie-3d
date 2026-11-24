# Atlas 3D · Anatomie P2

Atlas d'anatomie humaine en 3D pour réviser la P2 (DFGSM2) : modèles anatomiques réels
(BodyParts3D), fiches de cours en français, et bientôt dissection par couches, coupes et quiz.

> État : **étape 2 — squelette, muscles et dissection par couches**.

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
3. **Compléments Z-Anatomy** (`npm run modeles:z-anatomy`, nécessite Blender) : exporte depuis l'atlas
   Z-Anatomy (CC BY-SA 4.0) les structures absentes de BodyParts3D, puis les **recale** : orientation et
   échelle globales calculées sur 18 os communs, puis ajustement local sur les os voisins de chaque
   structure (crâne pour les masticateurs, sacrum pour le coccyx…). Les copies en miroir de Blender sont
   corrigées. Résultat et paramètres : `pipeline/sortie/recalage-z-anatomy.json`.
4. Construit un GLB par système × région, en deux niveaux de détail :
   `hi` (maillage d'origine) et `lo` (≈ 25 % des triangles, pour les téléphones et le premier affichage).

Contenu actuel : peau, 473 maillages de muscles, 249 os et cartilages — 17,9 Mo en haute définition,
7,1 Mo en version légère.

**Manques de BodyParts3D comblés par Z-Anatomy** : coccyx, cartilages costaux 8 à 10, grand dorsal,
droit de l'abdomen, pyramidal, oblique interne, transverse, carré des lombes, temporal, masséter,
ptérygoïdiens, 16 muscles de la face, court extenseur des orteils, interosseux dorsaux du pied.

**Manques restants** : muscles du périnée (sauf releveur de l'anus et sphincter externe), buccinateur ;
nerfs, vaisseaux et organes (étape 3) ; modèle masculin uniquement.

### Installer Blender (pour l'étape Z-Anatomy seulement)

```bash
brew install --cask blender
```

## Dissection par couches

Couches (`couche` dans l'inventaire) : 0 peau · 1 muscles superficiels · 2 intermédiaires · 3 profonds · 9 os.
La couche de chaque muscle est fixée dans `pipeline/config/noms-muscles.mjs` (relative à sa région).
Le curseur agit sur tout le corps ou sur une région ; « Retirer et voir dessous » (touche R) masque
la structure sélectionnée et liste ce qu'elle recouvre depuis l'angle de vue actuel.

## Pourquoi cette stack

- **Vite + TypeScript** : démarrage instantané, code typé donc plus facile à maintenir.
- **Three.js** : la bibliothèque 3D web de référence (déjà utilisée par le prototype).
- **Svelte** : interface légère et lisible, peu de code à charger (important sur téléphone).
- **meshopt + glTF Transform** : modèles compressés et simplifiés automatiquement.

## Licences

Voir la page « Crédits » dans l'app. Modèles : BodyParts3D, © The Database Center for Life Science,
CC BY 4.0. Code : bibliothèques libres sous licence MIT.
