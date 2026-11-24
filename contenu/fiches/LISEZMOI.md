# Fiches de cours

Une fiche = un fichier Markdown, rangé par système (`os/`, puis plus tard `muscles/`, `organes/`…).
Tu peux les ouvrir et les corriger avec n'importe quel éditeur de texte (TextEdit en mode « texte brut », VS Code…).

## Format

```markdown
---
id: femur                  # identifiant (= nom du fichier, sans .md)
titre: Fémur               # nom affiché
latin: Femur               # nom latin (Terminologia Anatomica)
systeme: os
statut: a-verifier         # passe à « verifiee » quand tu l'as relue contre ton cours
structures: [femur]        # structures 3D décrites par cette fiche (clés de l'inventaire)
---

## Description et situation
Texte…

## Parties
- …

## À retenir pour l'examen
- …
```

- Chaque `## Titre` devient une rubrique de la fiche.
- La rubrique dont le titre contient « retenir » est mise en valeur (encadré).
- **Gras** avec `**texte**`, listes avec `- `.

## Rubriques selon le type de structure

| Type | Rubriques |
|---|---|
| Os | Description et situation · Parties · Reliefs · Articulations · Insertions musculaires · À retenir pour l'examen |
| Muscle | Description et situation · Origine · Terminaison · Action · Innervation · Vascularisation · À retenir |
| Organe | Description et situation · Configuration externe · Configuration interne · Moyens de fixité · Rapports · Vascularisation artérielle · Vascularisation veineuse · Drainage lymphatique · Innervation · À retenir |
| Vaisseau / nerf | Origine · Trajet · Rapports · Branches collatérales · Branches terminales · Territoire · À retenir |

## Exactitude

Les fiches ont été rédigées pour ce projet et sont toutes marquées `statut: a-verifier`.
L'app affiche un bandeau « à vérifier » tant que le statut n'est pas `verifiee`.
Quand un point est incertain, il est signalé dans la fiche par **(à vérifier)**.
Relis chaque fiche avec ton cours de Poitiers avant de l'apprendre, corrige ce qui diffère, puis passe le statut à `verifiee`.

Pour trouver le fichier d'une fiche depuis l'app : son chemin est écrit en bas de la fiche.
