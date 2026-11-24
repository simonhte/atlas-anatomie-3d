<script lang="ts">
  // Fiche de cours de la structure sélectionnée.
  import { marked } from 'marked';
  import type { Fiche, Structure } from '../lib/types';
  import { nomComplet, nomRegion, nomSysteme } from '../lib/data';

  let { structure, fiche, onMasquer, onIsoler, onCadrer, onRetirer, dessous, onChoisirDessous, onFermerDessous, dansListe = false, onListe }: {
    /** La structure est-elle dans la liste personnelle de révision ? */
    dansListe?: boolean;
    onListe?: () => void;
    structure: Structure | null;
    fiche: Fiche | null;
    onMasquer: () => void;
    onIsoler: () => void;
    onCadrer: () => void;
    /** Retirer la structure et montrer ce qu'elle recouvre */
    onRetirer: () => void;
    dessous: { muscle: Structure | null; liste: { structure: Structure; part: number }[] } | null;
    onChoisirDessous: (id: string) => void;
    onFermerDessous: () => void;
  } = $props();

  marked.setOptions({ gfm: true, breaks: false });
  const html = (md: string) => marked.parse(md, { async: false }) as string;
  const estARetenir = (t: string) => /retenir/i.test(t);
</script>

{#if dessous && dessous.muscle}
  <section class="dessous">
    <h4>Sous {nomComplet(dessous.muscle)}</h4>
    {#if dessous.liste.length}
      <p class="petit">Structures recouvertes, vues depuis l'angle actuel (en ambre sur le modèle) :</p>
      <ul>
        {#each dessous.liste as d (d.structure.id)}
          <li><button class="lien" onclick={() => onChoisirDessous(d.structure.id)}>{nomComplet(d.structure)}</button> <small>{Math.round(d.part * 100)} %</small></li>
        {/each}
      </ul>
    {:else}
      <p class="petit">Rien n'est visible sous cette structure depuis cet angle. Tourne le modèle et réessaie.</p>
    {/if}
    <button class="chip" onclick={onFermerDessous}>Remettre {dessous.muscle.fr.toLowerCase()}</button>
  </section>
{/if}

{#if !structure}
  <div class="vide">
    <p>Clique sur une structure du modèle ou cherche-la par son nom pour ouvrir sa fiche.</p>
    <p>Raccourcis : <kbd>D</kbd> disséquer · <kbd>⇧D</kbd> recouvrir · <kbd>R</kbd> retirer et voir dessous · <kbd>H</kbd> masquer · <kbd>I</kbd> isoler · <kbd>A</kbd> tout afficher · <kbd>F</kbd> cadrer · <kbd>L</kbd> étiquettes · <kbd>X</kbd> rayons X · <kbd>⌘Z</kbd> annuler · <kbd>/</kbd> rechercher · <kbd>Échap</kbd> désélectionner</p>
  </div>
{:else}
  <article>
    <h3>{nomComplet(structure)}</h3>
    <div class="latin">{structure.la || structure.en}</div>
    {#if structure.anglais}
      <p class="auto">Nom anglais (FMA) : pas encore de traduction française.</p>
    {:else if structure.auto}
      <p class="auto">Traduction automatique du nom anglais « {structure.en} » : à vérifier.</p>
    {/if}
    <div class="etiquettes">
      <span class="tag">{nomSysteme(structure.systeme)}</span>
      <span class="tag">{nomRegion(structure.region)}</span>
      <span class="tag">{structure.groupe}</span>
    </div>
    <div class="actions">
      <button class="chip" onclick={onCadrer}>Cadrer</button>
      <button class="chip" onclick={onIsoler}>Isoler</button>
      <button class="chip" onclick={onMasquer}>Masquer</button>
      {#if onListe}
        <button class="chip" class:on={dansListe} title="Liste personnelle de révision (filtre du quiz)" onclick={onListe}>{dansListe ? '★ Dans ma liste' : '☆ Ma liste'}</button>
      {/if}
      {#if structure.systeme !== 'os'}
        <button class="chip" title="Touche R" onclick={onRetirer}>Retirer et voir dessous</button>
      {/if}
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
  .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .dessous { margin: 0 0 16px; padding: 10px 12px; border-radius: 8px; background: #3a2e17; border: 1px solid #5c4a22; }
  .dessous h4 { color: var(--warn); }
  .dessous ul { list-style: none; padding: 0; margin: 6px 0 10px; }
  .dessous li { display: flex; justify-content: space-between; align-items: center; }
  .lien { border: 0; background: none; color: var(--ink); text-align: left; padding: 4px 0; text-decoration: underline; text-decoration-color: #e8b45a88; }
  .petit { font-size: 12.5px; color: var(--mut); margin: 0; }
  small { color: var(--mut); }
  .statut { font-size: 13px; color: var(--warn); background: #3a2e17; border: 1px solid #5c4a22; border-radius: 8px; padding: 6px 10px; }
  .commune { font-size: 13px; color: var(--mut); }
  .auto { font-size: 12px; color: var(--mut); font-style: italic; margin: 4px 0; }
  section { margin-top: 14px; }
  h4 { font-size: 12px; color: var(--acc); font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  section :global(p), section :global(li) { font-size: 14.5px; margin: 4px 0; }
  section :global(ul) { padding-left: 18px; margin: 4px 0; }
  section :global(strong) { color: #fff; }
  .perle { padding: 10px 12px; border-radius: 8px; background: #14323a; border: 1px solid #23535c; }
  .source { font-size: 11.5px; color: var(--mut); margin-top: 16px; word-break: break-all; }
  code { font-size: 11px; }
</style>
