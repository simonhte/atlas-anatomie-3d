# Atlas 3D · Anatomie P2

Atlas d'anatomie humaine en 3D pour réviser la P2 (DFGSM2) : modèles anatomiques réels
(BodyParts3D), fiches de cours en français, et bientôt dissection par couches, coupes et quiz.

> État : **étape 5 — quiz et répétition espacée**.

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
4. **Appareil génital féminin** (`npm run modeles:feminin`) : organes du modèle féminin HuBMAP
   (CC BY 4.0) recalés sur le bassin masculin (bassin, reins, vessie servent de repères) — position approximative.
5. Construit un GLB par système × région, en deux niveaux de détail :
   `hi` (maillage d'origine) et `lo` (≈ 25 % des triangles, pour les téléphones et le premier affichage).

Contenu actuel : environ 2 500 maillages — peau, muscles, os, artères, veines, nerfs, encéphale et moelle,
cœur, appareils respiratoire, digestif, urinaire, génitaux masculin et féminin, glandes, organes des sens —
41,8 Mo en haute définition, 16,4 Mo en version légère.

### Noms des vaisseaux, nerfs et organes

`pipeline/config/traduction.mjs` traduit automatiquement les noms anglais : table officielle
Terminologia Anatomica 2 (fournie par Z-Anatomy), synonymes, puis règles de grammaire (« branche
antérieure de l'artère… »). Les noms issus des règles sont signalés « traduction automatique » dans
l'app ; une quarantaine de noms très spécialisés restent en anglais. Le classement par appareil et les
fiches communes (un organe = une fiche pour tous ses segments) sont dans `pipeline/config/noms-organes.mjs`.

**Manques de BodyParts3D comblés par Z-Anatomy** : coccyx, cartilages costaux 8 à 10, grand dorsal,
droit de l'abdomen, pyramidal, oblique interne, transverse, carré des lombes, temporal, masséter,
ptérygoïdiens, 16 muscles de la face, court extenseur des orteils, interosseux dorsaux du pied.

**Manques restants** : muscles du périnée (sauf releveur de l'anus et sphincter externe), buccinateur ;
nerf phrénique, nerfs intercostaux et chaîne sympathique ; glandes parotides ; organes féminins
seulement approchés (autre modèle).

### Installer Blender (pour l'étape Z-Anatomy seulement)

```bash
brew install --cask blender
```

## Quiz et répétition espacée

- Bouton **Quiz** : quatre types de questions, combinables :
  - **Identifier** une structure surlignée sur le modèle (QCM ou réponse tapée, tolérante aux fautes ;
    le côté droit/gauche est demandé) ;
  - **Pointer** la structure demandée sur le modèle (clic ou appui, tolérance de 14 px pour les nerfs fins) ;
  - **Cours** : questions tirées des fiches (innervation, origine, terminaison, rapports, vascularisation…) —
    QCM quand la réponse est courte, sinon carte à retourner puis auto-évaluation ;
  - **Coupes** : reconnaître une structure surlignée sur une coupe de scanner réelle.
- Filtres : systèmes, régions, **liste personnelle** (bouton « ☆ Ma liste » dans les fiches).
- **Répétition espacée FSRS** (`ts-fsrs`) : une erreur fait revenir la question le jour même, une bonne réponse
  l'espace (jours, semaines…). Au plus 10 nouvelles questions par séance, les révisions dues passent d'abord.
- **Progression** : tableau de bord par système et par région, questions les plus ratées.
  Enregistrée sur l'appareil ; **export / import** d'un fichier pour passer du Mac à la tablette
  (les deux progressions sont fusionnées).
- Logique testée : `src/lib/progression.ts`, `src/lib/quiz.ts` (`tests/quiz.test.ts`).

## Coupes

- **Plans de coupe 3D** (axial, coronal, sagittal) : panneau « Coupes ». Les surfaces coupées sont remplies
  (teinte plus sombre de la structure) : on lit le modèle comme une coupe anatomique.
- **Coupe scanner** : vraies images de scanner (patient s1371 de TotalSegmentator, CC BY 4.0, des cuisses à C6),
  axiales, coronales et sagittales tous les 3 mm, fenêtres parties molles / poumon / os, structures annotées,
  nom au survol, clic = fiche, plan repère bleu sur le modèle 3D (hauteur calée sur les vertèbres T1–L5).
- Pipeline : `npm run modeles:coupes` (`pipeline/06-coupes-scanner.mjs`). Seul ce patient (≈ 63 Mo) est
  téléchargé dans l'archive de 3,2 Go, par requêtes partielles (`pipeline/lib/zip-distant.mjs`). Sortie :
  `public/coupes/` (≈ 13 Mo).

## Dissection par couches

Couches (`couche` dans l'inventaire) : 0 peau · 1 muscles superficiels · 2 intermédiaires · 3 profonds ·
5 vaisseaux et nerfs · 7 organes · 9 os.
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
