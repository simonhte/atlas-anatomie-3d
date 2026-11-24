<script lang="ts">
  // Plans de coupe du modèle 3D : axial, coronal, sagittal, déplaçables.
  import type { Plans } from '../lib/coupes';

  let { plans = $bindable(), bornes, onScanner }: {
    plans: Plans;
    /** [min, max] du modèle sur chaque axe (m) */
    bornes: Record<'x' | 'y' | 'z', [number, number]>;
    onScanner: () => void;
  } = $props();

  const LIGNES: { axe: 'y' | 'z' | 'x'; nom: string; aide: string }[] = [
    { axe: 'y', nom: 'Axiale', aide: 'transversale : retire ce qui est au-dessus' },
    { axe: 'z', nom: 'Coronale', aide: 'frontale : retire ce qui est en avant' },
    { axe: 'x', nom: 'Sagittale', aide: 'retire la moitié gauche du sujet' },
  ];
</script>

<div class="coupes">
  {#each LIGNES as l (l.axe)}
    {@const p = plans[l.axe]}
    <div class="ligne">
      <label title={l.aide}>
        <input type="checkbox" bind:checked={p.actif} />
        {l.nom}
      </label>
      <input type="range" min={bornes[l.axe][0]} max={bornes[l.axe][1]} step="0.002" bind:value={p.position}
        disabled={!p.actif} aria-label={`Position du plan ${l.nom.toLowerCase()}`} />
      <button class="chip icone" title="Garder l'autre côté" aria-label={`Inverser le plan ${l.nom.toLowerCase()}`}
        class:on={p.inverser} disabled={!p.actif} onclick={() => (p.inverser = !p.inverser)}>⇅</button>
    </div>
  {/each}
  <button class="btn scanner" onclick={onScanner}>Coupe scanner (images réelles)</button>
  <p class="petit">Les surfaces coupées apparaissent pleines, dans une teinte plus sombre que la structure.</p>
</div>

<style>
  .coupes { display: grid; gap: 6px; }
  .ligne { display: grid; grid-template-columns: 96px minmax(0, 1fr) 32px; align-items: center; gap: 8px; }
  label { display: flex; align-items: center; gap: 6px; font-size: 13.5px; cursor: pointer; }
  input[type='checkbox'] { width: 16px; height: 16px; accent-color: var(--acc); }
  input[type='range'] { width: 100%; accent-color: var(--acc); }
  .icone { width: 32px; padding: 0; justify-content: center; }
  .scanner { justify-content: center; margin-top: 4px; }
  .petit { font-size: 12.5px; color: var(--mut); margin: 0; }
</style>
