<script lang="ts">
  // Étiquettes avec lignes de rappel, rangées dans deux colonnes (gauche et
  // droite de l'écran) pour ne jamais se chevaucher, comme dans un atlas.
  import type { Viewer } from '../lib/viewer/Viewer';
  import type { Structure } from '../lib/types';
  import { nomComplet } from '../lib/data';
  import { disposerEtiquettes } from '../lib/etiquettes';

  let { viewer, parId, selection, version }: {
    viewer: Viewer;
    parId: Map<string, Structure>;
    selection: string | null;
    version: number;
  } = $props();

  let largeur = $state(0);
  let hauteur = $state(0);

  const placees = $derived.by(() => {
    void version; // recalcul à chaque rendu de la scène
    const ancres = viewer.ancres();
    const max = largeur < 600 ? 8 : 16;
    return disposerEtiquettes(ancres, { largeur, hauteur, max, prioritaire: selection, hautReserve: largeur < 900 ? 56 : 90 })
      .map((e) => ({ ...e, nom: parId.get(e.id) ? nomComplet(parId.get(e.id)!) : e.id }));
  });
</script>

<div class="calque" bind:clientWidth={largeur} bind:clientHeight={hauteur}>
  <svg width={largeur} height={hauteur} aria-hidden="true">
    {#each placees as e (e.id)}
      <line x1={e.ax} y1={e.ay} x2={e.lx} y2={e.ly} class:sel={e.id === selection} />
      <circle cx={e.ax} cy={e.ay} r="2.5" class:sel={e.id === selection} />
    {/each}
  </svg>
  {#each placees as e (e.id)}
    <div class="etiquette" class:droite={e.cote === 'droite'} class:sel={e.id === selection} style:left="{e.cote === 'gauche' ? 8 : e.lx + 4}px" style:width="{e.largeurTexte}px" style:top="{e.ly}px">{e.nom}</div>
  {/each}
</div>

<style>
  .calque { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
  svg { position: absolute; inset: 0; }
  line { stroke: #93a3adaa; stroke-width: 1; }
  circle { fill: #e6ecef; }
  line.sel { stroke: var(--acc); stroke-width: 1.5; }
  circle.sel { fill: var(--acc); }
  .etiquette {
    position: absolute; transform: translateY(-50%); text-align: right;
    font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    text-shadow: 0 0 3px #0e1418, 0 0 6px #0e1418;
  }
  .etiquette.droite { text-align: left; }
  .etiquette.sel { color: var(--acc); border-color: var(--acc); font-weight: 600; }
</style>
