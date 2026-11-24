<script lang="ts">
  // Curseur de dissection : peau → muscles superficiels → intermédiaires →
  // profonds → squelette, pour tout le corps ou pour une seule région.
  import { ETAPES, REGIONS_DISSECTION, etapeEffective, type Dissection } from '../lib/dissection';
  import { nomRegion } from '../lib/data';

  let { dissection, region = $bindable(), onDeplacer, onEtape }: {
    dissection: Dissection;
    region: string | null;
    onDeplacer: (sens: 1 | -1) => void;
    onEtape: (etape: number) => void;
  } = $props();

  const etape = $derived(region ? etapeEffective(dissection, region) : dissection.global);
  const regionsDisssequees = $derived(Object.entries(dissection.regions).filter(([, n]) => n > dissection.global));
</script>

<div class="dissection">
  <label class="ligne">
    <span>Zone</span>
    <select class="chip" value={region ?? ''} onchange={(e) => (region = (e.target as HTMLSelectElement).value || null)}>
      <option value="">Tout le corps</option>
      {#each REGIONS_DISSECTION as r (r)}
        <option value={r}>{nomRegion(r)}</option>
      {/each}
    </select>
  </label>

  <div class="ligne">
    <button class="chip icone" aria-label="Recouvrir (couche précédente)" title="Recouvrir (⇧D)" disabled={etape === 0} onclick={() => onDeplacer(-1)}>▲</button>
    <input type="range" min="0" max={ETAPES.length - 1} step="1" value={etape}
      aria-label="Couche de dissection" aria-valuetext={ETAPES[etape].nom}
      oninput={(e) => onEtape(+(e.target as HTMLInputElement).value)} />
    <button class="chip icone" aria-label="Disséquer (couche suivante)" title="Disséquer (D)" disabled={etape === ETAPES.length - 1} onclick={() => onDeplacer(1)}>▼</button>
  </div>
  <p class="surface">En surface : <b>{ETAPES[etape].nom}</b></p>
  <ol class="etapes">
    {#each ETAPES as e, i (e.nom)}
      <li class:retiree={i < etape} class:courante={i === etape}>{e.nom}</li>
    {/each}
  </ol>
  {#if !region && regionsDisssequees.length}
    <p class="petit">Disséqué plus profondément : {regionsDisssequees.map(([r, n]) => `${nomRegion(r)} (${ETAPES[n].nom.toLowerCase()})`).join(', ')}</p>
  {/if}
  <p class="petit">Astuce : sélectionne un muscle puis « Retirer et voir dessous » (touche R) pour découvrir ce qu'il recouvre.</p>
</div>

<style>
  .dissection { display: grid; gap: 8px; }
  .ligne { display: flex; align-items: center; gap: 8px; }
  .ligne span { font-size: 13.5px; color: var(--mut); width: 40px; }
  select { flex: 1; }
  input[type='range'] { flex: 1; accent-color: var(--acc); }
  .icone { width: 32px; justify-content: center; padding: 0; }
  .surface { margin: 0; font-size: 14px; }
  .surface b { color: var(--acc); }
  .etapes { margin: 0; padding-left: 20px; font-size: 13px; color: var(--mut); }
  .etapes .retiree { text-decoration: line-through; opacity: 0.55; }
  .etapes .courante { color: var(--ink); font-weight: 600; }
  .petit { font-size: 12.5px; color: var(--mut); margin: 0; }
</style>
