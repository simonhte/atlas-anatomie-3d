<script lang="ts">
  // Arborescence système → région → groupe → structure.
  // Chaque niveau peut être replié ; l'œil masque/affiche tout un ensemble.
  import type { NoeudArbre } from '../lib/data';
  import Arbre from './Arbre.svelte';

  let { noeuds, masques, selection, onSelection, onBasculer, onBasculerGroupe, niveau = 0 }: {
    noeuds: NoeudArbre[];
    masques: string[];
    selection: string | null;
    onSelection: (id: string) => void;
    onBasculer: (id: string) => void;
    onBasculerGroupe: (ids: string[], afficher: boolean) => void;
    niveau?: number;
  } = $props();

  const masquesSet = $derived(new Set(masques));
  const ouverts: Record<string, boolean> = $state({});

  function feuilles(n: NoeudArbre): string[] {
    return n.structure ? [n.structure] : (n.enfants ?? []).flatMap(feuilles);
  }
</script>

<ul class:racine={niveau === 0}>
  {#each noeuds as n (n.id)}
    {#if n.structure}
      <li class="feuille" class:masque={masquesSet.has(n.structure)} class:sel={selection === n.structure}>
        <button class="nom" onclick={() => onSelection(n.structure!)}>{n.nom}</button>
        <button class="oeil" title={masquesSet.has(n.structure) ? 'Afficher' : 'Masquer'} aria-label={`${masquesSet.has(n.structure) ? 'Afficher' : 'Masquer'} ${n.nom}`} onclick={() => onBasculer(n.structure!)}>
          {masquesSet.has(n.structure) ? '○' : '●'}
        </button>
      </li>
    {:else}
      {@const ids = feuilles(n)}
      {@const nbMasques = ids.filter((i) => masquesSet.has(i)).length}
      {@const ouvert = ouverts[n.id] ?? niveau === 0}
      <li class="branche">
        <div class="ligne">
          <button class="nom" aria-expanded={ouvert} onclick={() => (ouverts[n.id] = !ouvert)}>
            <span class="fleche" class:ouvert>▸</span>{n.nom} <small>{ids.length}</small>
          </button>
          <button class="oeil" title={nbMasques === ids.length ? 'Tout afficher' : 'Tout masquer'} aria-label={`${nbMasques === ids.length ? 'Afficher' : 'Masquer'} ${n.nom}`}
            onclick={() => onBasculerGroupe(ids, nbMasques === ids.length)}>
            {nbMasques === 0 ? '●' : nbMasques === ids.length ? '○' : '◐'}
          </button>
        </div>
        {#if ouvert && n.enfants}
          <Arbre noeuds={n.enfants} {masques} {selection} {onSelection} {onBasculer} {onBasculerGroupe} niveau={niveau + 1} />
        {/if}
      </li>
    {/if}
  {/each}
</ul>

<style>
  ul { list-style: none; margin: 0; padding: 0 0 0 12px; }
  ul.racine { padding: 0; }
  li { margin: 0; }
  .ligne, .feuille { display: flex; align-items: center; border-radius: 6px; }
  .ligne:hover, .feuille:hover { background: #222d35; }
  .nom { flex: 1; text-align: left; border: 0; background: none; padding: 5px 6px; font-size: 13.5px; min-height: 32px; }
  .branche > .ligne .nom { font-weight: 500; }
  small { color: var(--mut); font-size: 11.5px; margin-left: 4px; }
  .fleche { display: inline-block; width: 14px; color: var(--mut); transition: transform 0.15s; }
  .fleche.ouvert { transform: rotate(90deg); }
  .oeil { border: 0; background: none; color: var(--mut); width: 32px; height: 32px; font-size: 12px; }
  .oeil:hover { color: var(--acc); }
  .masque .nom { opacity: 0.45; text-decoration: line-through; }
  .sel { background: #14323a; }
  .sel .nom { color: var(--acc); font-weight: 600; }
</style>
