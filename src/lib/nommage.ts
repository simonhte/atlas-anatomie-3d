// Accord de la latéralité en français (même règle que pipeline/config/noms-os.mjs).

/** ("Fémur","m","d") → "Fémur droit" ; ("Scapula","f","d") → "Scapula droite" */
export function avecCote(fr: string, genre: 'm' | 'f', cote: 'd' | 'g' | null): string {
  if (!cote) return fr;
  const mot = cote === 'd' ? 'droit' : 'gauche';
  return `${fr} ${mot}${genre === 'f' && cote === 'd' ? 'e' : ''}`;
}
