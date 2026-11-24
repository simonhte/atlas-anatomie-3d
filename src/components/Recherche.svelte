<script lang="ts">
  // Champ de recherche avec liste de résultats navigable au clavier.
  import type { IndexRecherche } from '../lib/search';
  import type { Structure } from '../lib/types';
  import { nomComplet } from '../lib/data';

  let { index, parId, onChoisir }: {
    index: IndexRecherche | null;
    parId: Map<string, Structure>;
    onChoisir: (id: string) => void;
  } = $props();

  let requete = $state('');
  let actif = $state(0);
  let ouvert = $state(false);
  const resultats = $derived(index && requete.trim() ? index.chercher(requete, 15) : []);

  function choisir(id: string) {
    onChoisir(id);
    requete = '';
    ouvert = false;
    (document.activeElement as HTMLElement | null)?.blur();
  }
  function touche(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { actif = Math.min(actif + 1, resultats.length - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { actif = Math.max(actif - 1, 0); e.preventDefault(); }
    else if (e.key === 'Enter' && resultats[actif]) choisir(resultats[actif].id);
    else if (e.key === 'Escape') { requete = ''; (e.target as HTMLElement).blur(); }
  }
</script>

<div class="recherche">
  <input id="recherche" type="search" autocomplete="off" spellcheck="false"
    placeholder="Rechercher (ex. fémur, os coxale, scaphoide…)" aria-label="Rechercher une structure"
    bind:value={requete} onkeydown={touche}
    oninput={() => { actif = 0; ouvert = true; }} onfocus={() => (ouvert = true)}
    onblur={() => setTimeout(() => (ouvert = false), 150)} />
  {#if ouvert && requete.trim()}
    <div class="resultats" role="listbox">
      {#each resultats as r, i (r.id)}
        {@const s = parId.get(r.id)}
        {#if s}
          <button role="option" aria-selected={i === actif} class:actif={i === actif} onmousedown={(e) => e.preventDefault()} onclick={() => choisir(r.id)}>
            {nomComplet(s)} <small>{s.la}</small>
          </button>
        {/if}
      {:else}
        <p>Aucune structure trouvée.</p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .recherche { position: relative; flex: 1; max-width: 440px; }
  input { width: 100%; height: 38px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); padding: 0 12px; font-size: 16px; }
  input:focus { outline: 2px solid var(--acc); outline-offset: 1px; }
  .resultats { position: absolute; top: 42px; left: 0; right: 0; background: var(--pan2); border: 1px solid var(--line); border-radius: 8px; max-height: 360px; overflow: auto; z-index: 20; box-shadow: 0 10px 30px #0008; }
  button { display: block; width: 100%; text-align: left; padding: 9px 12px; border: 0; background: none; }
  button.actif, button:hover { background: #24313a; }
  small { color: var(--mut); margin-left: 6px; font-style: italic; }
  p { margin: 0; padding: 10px 12px; color: var(--mut); }
</style>
