<script lang="ts">
  // Fiche de cours de la structure sélectionnée.
  import { marked } from 'marked';
  import type { Fiche, Structure } from '../lib/types';
  import { nomComplet, nomRegion, nomSysteme } from '../lib/data';

  let { structure, fiche, onMasquer, onIsoler, onCadrer }: {
    structure: Structure | null;
    fiche: Fiche | null;
    onMasquer: () => void;
    onIsoler: () => void;
    onCadrer: () => void;
  } = $props();

  marked.setOptions({ gfm: true, breaks: false });
  const html = (md: string) => marked.parse(md, { async: false }) as string;
  const estARetenir = (t: string) => /retenir/i.test(t);
</script>

{#if !structure}
  <div class="vide">
    <p>Clique sur une structure du modèle ou cherche-la par son nom pour ouvrir sa fiche.</p>
    <p>Raccourcis : <kbd>H</kbd> masquer · <kbd>I</kbd> isoler · <kbd>A</kbd> tout afficher · <kbd>F</kbd> cadrer · <kbd>L</kbd> étiquettes · <kbd>X</kbd> rayons X · <kbd>⌘Z</kbd> annuler · <kbd>/</kbd> rechercher · <kbd>Échap</kbd> désélectionner</p>
  </div>
{:else}
  <article>
    <h3>{nomComplet(structure)}</h3>
    <div class="latin">{structure.la}</div>
    <div class="etiquettes">
      <span class="tag">{nomSysteme(structure.systeme)}</span>
      <span class="tag">{nomRegion(structure.region)}</span>
      <span class="tag">{structure.groupe}</span>
    </div>
    <div class="actions">
      <button class="chip" onclick={onCadrer}>Cadrer</button>
      <button class="chip" onclick={onIsoler}>Isoler</button>
      <button class="chip" onclick={onMasquer}>Masquer</button>
    </div>

    {#if fiche}
      {#if fiche.statut === 'a-verifier'}
        <p class="statut" title={fiche.fichier}>⚠ Fiche à vérifier avec ton cours avant de l'apprendre.</p>
      {/if}
      {#if fiche.structures.length > 1 && fiche.titre !== structure.fr}
        <p class="commune">Fiche commune : <b>{fiche.titre}</b></p>
      {/if}
      {#each fiche.sections as s (s.titre)}
        <section class:perle={estARetenir(s.titre)}>
          <h4>{s.titre}</h4>
          <!-- Contenu écrit par nous dans contenu/fiches (pas de saisie utilisateur) -->
          {@html html(s.markdown)}
        </section>
      {/each}
      <p class="source">Fichier : <code>{fiche.fichier}</code></p>
    {:else}
      <p class="statut">Pas encore de fiche pour cette structure.</p>
    {/if}
    <p class="source">FMA : {structure.fma} · BodyParts3D : {structure.id} · « {structure.en} »</p>
  </article>
{/if}

<style>
  .vide { color: var(--mut); font-size: 14.5px; }
  kbd { border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; font-size: 12px; font-family: var(--sans); }
  h3 { font: 600 22px/1.15 var(--serif); margin: 2px 40px 4px 0; text-wrap: balance; }
  .latin { color: var(--mut); font-style: italic; font-size: 14px; }
  .etiquettes { margin: 8px 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { font-size: 12px; padding: 2px 8px; border-radius: 20px; background: var(--pan2); border: 1px solid var(--line); }
  .actions { display: flex; gap: 6px; margin-bottom: 10px; }
  .statut { font-size: 13px; color: var(--warn); background: #3a2e17; border: 1px solid #5c4a22; border-radius: 8px; padding: 6px 10px; }
  .commune { font-size: 13px; color: var(--mut); }
  section { margin-top: 14px; }
  h4 { font-size: 12px; color: var(--acc); font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  section :global(p), section :global(li) { font-size: 14.5px; margin: 4px 0; }
  section :global(ul) { padding-left: 18px; margin: 4px 0; }
  section :global(strong) { color: #fff; }
  .perle { padding: 10px 12px; border-radius: 8px; background: #14323a; border: 1px solid #23535c; }
  .source { font-size: 11.5px; color: var(--mut); margin-top: 16px; word-break: break-all; }
  code { font-size: 11px; }
</style>
