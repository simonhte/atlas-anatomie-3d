// Plugin Vite « hors ligne » : après la construction (npm run build), il
// recense tous les fichiers de dist/ avec une empreinte (hash) et leur taille,
// puis écrit :
//   - dist/hors-ligne.json : la liste, lue par l'app (bouton « Hors ligne ») ;
//   - dist/sw.js           : le service worker (outils/sw.js) avec cette liste.
// Le service worker change dès qu'un fichier change : le navigateur détecte
// alors la nouvelle version et l'app propose de recharger.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

export type Groupe = 'coeur' | 'essentiel' | 'coupes' | 'hd';
export interface FichierHL { u: string; h: string; t: number; g: Groupe }

function groupeDe(u: string): Groupe {
  if (u.startsWith('coupes/') && u !== 'coupes/s1371/index.json') return 'coupes';
  if (u.endsWith('.hi.glb')) return 'hd';
  if (u.endsWith('.lo.glb') || u === 'coupes/s1371/index.json') return 'essentiel';
  return 'coeur';
}

function lister(dossier: string, racine = dossier): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    return statSync(p).isDirectory() ? lister(p, racine) : [relative(racine, p).split(sep).join('/')];
  });
}

export function horsLigne(): Plugin {
  let dist = 'dist';
  return {
    name: 'atlas-hors-ligne',
    apply: 'build',
    configResolved(c) { dist = c.build.outDir.startsWith('/') ? c.build.outDir : join(c.root, c.build.outDir); },
    closeBundle() {
      const fichiers: FichierHL[] = lister(dist)
        // .DS_Store (macOS) et copies « fichier 2.jpg » créées par la synchronisation iCloud : ignorés
        .filter((u) => !/(^|\/)\.DS_Store$/.test(u) && !/ \d+\.\w+$/.test(u) && u !== 'sw.js' && u !== 'hors-ligne.json')
        .sort()
        .map((u) => {
          const contenu = readFileSync(join(dist, u));
          return { u, h: createHash('sha256').update(contenu).digest('hex').slice(0, 12), t: contenu.length, g: groupeDe(u) };
        });
      const version = createHash('sha256').update(fichiers.map((f) => `${f.u}:${f.h}`).join('\n')).digest('hex').slice(0, 12);
      fichiers.push({ u: 'hors-ligne.json', h: version, t: 0, g: 'coeur' });
      writeFileSync(join(dist, 'hors-ligne.json'), JSON.stringify({ version, fichiers }));
      const modele = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
      const table = Object.fromEntries(fichiers.map((f) => [f.u, [f.h, f.g === 'coeur' ? 1 : 0]]));
      writeFileSync(join(dist, 'sw.js'), modele.replace('self.__VERSION__', JSON.stringify(version)).replace('self.__FICHIERS__', JSON.stringify(table)));
      const mo = (g: Groupe) => (fichiers.filter((f) => f.g === g).reduce((s, f) => s + f.t, 0) / 1e6).toFixed(1);
      console.log(`\n[hors ligne] version ${version} — cœur ${mo('coeur')} Mo, essentiel ${mo('essentiel')} Mo, coupes ${mo('coupes')} Mo, HD ${mo('hd')} Mo`);
    },
  };
}
