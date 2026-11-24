// Plans de coupe du modèle 3D (état partagé entre l'interface et le visualiseur).
export interface PlanCoupe { actif: boolean; position: number; inverser: boolean }
export type Plans = Record<'y' | 'z' | 'x', PlanCoupe>;

/** Liste des plans actifs, au format attendu par Viewer.setCoupes(). */
export function plansActifs(p: Plans): { axe: 'x' | 'y' | 'z'; position: number; inverser: boolean }[] {
  return (['y', 'z', 'x'] as const).filter((a) => p[a].actif).map((a) => ({ axe: a, position: p[a].position, inverser: p[a].inverser }));
}
