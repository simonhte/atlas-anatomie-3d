<script lang="ts">
  // Fenêtre « Hors ligne » : ce qui est déjà sur l'appareil, et bouton pour
  // tout télécharger (par groupes) afin de réviser sans connexion.
  import { onMount } from 'svelte';
  import { GROUPES, chargerListe, mo, presents, supprimer, swPossible, telecharger, type Groupe, type ListeHL } from '../lib/horsLigne';

  let { onFermer }: { onFermer: () => void } = $props();

  let liste = $state<ListeHL | null>(null);
  let deja = $state(new Set<string>());
  let choix = $state<Record<Groupe, boolean>>({ coeur: true, essentiel: true, coupes: true, hd: !matchMedia('(max-width: 900px)').matches });
  let progres = $state<{ fait: number; total: number } | null>(null);
  let message = $state('');
  let espace = $state('');
  let persistant = $state<boolean | null>(null);
  let arret: AbortController | null = null;

  const parGroupe = $derived(Object.fromEntries(GROUPES.map((g) => {
    const f = liste?.fichiers.filter((x) => x.g === g.id) ?? [];
    return [g.id, { total: f.reduce((s, x) => s + x.t, 0), present: f.filter((x) => deja.has(x.u)).reduce((s, x) => s + x.t, 0), n: f.length, nPresent: f.filter((x) => deja.has(x.u)).length }];
  })) as Record<Groupe, { total: number; present: number; n: number; nPresent: number }>);
  const aTelecharger = $derived(GROUPES.filter((g) => choix[g.id]).reduce((s, g) => s + parGroupe[g.id].total - parGroupe[g.id].present, 0));

  async function rafraichir() {
    if (!liste) return;
    deja = await presents(liste);
    const est = await navigator.storage?.estimate?.();
    if (est?.usage !== undefined) espace = `${mo(est.usage)} utilisés${est.quota ? ` sur ${mo(est.quota)} disponibles` : ''}`;
    persistant = (await navigator.storage?.persisted?.()) ?? null;
  }

  onMount(async () => {
    if (!swPossible()) return;
    try { liste = await chargerListe(); await rafraichir(); } catch (e) { message = e instanceof Error ? e.message : String(e); }
  });

  async function lancer() {
    if (!liste) return;
    message = '';
    arret = new AbortController();
    const groupes = GROUPES.filter((g) => choix[g.id]).map((g) => g.id);
    try {
      await telecharger(liste, groupes, deja, (fait, total) => { progres = { fait, total }; deja = new Set(deja); }, arret.signal);
      message = arret.signal.aborted ? 'Téléchargement interrompu (ce qui est déjà téléchargé est gardé).' : "C'est prêt : tu peux réviser sans connexion.";
    } catch (e) {
      message = arret.signal.aborted ? 'Téléchargement interrompu.' : `Erreur : ${e instanceof Error ? e.message : e}. Ce qui est déjà téléchargé est gardé ; tu peux relancer.`;
    }
    progres = null; arret = null;
    await rafraichir();
  }

  async function effacer(g: Groupe) {
    if (!liste || !confirm('Retirer ces fichiers de cet appareil ? Ils seront retéléchargés au besoin.')) return;
    await supprimer(liste, [g]);
    await rafraichir();
  }
</script>

<div class="fond" role="presentation" onclick={() => !progres && onFermer()}></div>
<div class="fenetre" role="dialog" aria-modal="true" aria-labelledby="titre-hl">
  <button class="fermer" aria-label="Fermer" onclick={onFermer} disabled={!!progres}>✕</button>
  <h2 id="titre-hl">Utiliser sans connexion</h2>

  {#if !swPossible()}
    <p class="petit">Le mode hors ligne fonctionne dans la version en ligne de l'atlas (adresse en https) ou installée sur
      l'écran d'accueil. Il n'est pas actif dans cette version de développement.</p>
  {:else if !liste}
    <p class="petit">{message || 'Lecture de la liste des fichiers…'}</p>
  {:else}
    <p class="petit">Coche ce que tu veux garder sur cet appareil, puis lance le téléchargement (de préférence en wifi).
      Ce que tu as déjà ouvert est gardé automatiquement.</p>
    <ul class="groupes">
      {#each GROUPES as g (g.id)}
        {@const p = parGroupe[g.id]}
        <li>
          <label>
            <input type="checkbox" bind:checked={choix[g.id]} disabled={g.id === 'coeur' || !!progres} />
            <span><b>{g.nom}</b> <small>{g.detail}</small></span>
          </label>
          <span class="taille">
            {#if p.nPresent === p.n}<span class="ok">✓ sur l'appareil</span>{:else}{mo(p.present)} / {mo(p.total)}{/if}
            {#if g.id !== 'coeur' && p.nPresent > 0 && !progres}<button class="lien" onclick={() => effacer(g.id)}>retirer</button>{/if}
          </span>
        </li>
      {/each}
    </ul>

    {#if progres}
      <div class="barre" role="progressbar" aria-valuenow={Math.round((100 * progres.fait) / (progres.total || 1))} aria-valuemin="0" aria-valuemax="100">
        <div style:width="{(100 * progres.fait) / (progres.total || 1)}%"></div>
      </div>
      <p class="petit">{mo(progres.fait)} sur {mo(progres.total)}…</p>
      <button class="btn" onclick={() => arret?.abort()}>Interrompre</button>
    {:else}
      <button class="btn principal" disabled={aTelecharger === 0} onclick={lancer}>
        {aTelecharger === 0 ? 'Tout est déjà sur l’appareil' : `Télécharger (${mo(aTelecharger)})`}
      </button>
    {/if}
    {#if message}<p class="message">{message}</p>{/if}
    <p class="petit bas">
      {espace}{espace && persistant !== null ? ' · ' : ''}{persistant === true ? 'stockage protégé' : persistant === false ? 'stockage non protégé : sur iPhone/iPad, ajoute l’atlas à l’écran d’accueil pour que tes données ne soient pas effacées' : ''}
    </p>
  {/if}
</div>

<style>
  .fond { position: fixed; inset: 0; background: #000a; z-index: 30; }
  .fenetre { position: fixed; z-index: 31; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 40px); overflow: auto; background: var(--pan); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; }
  h2 { font: 600 22px/1.2 var(--serif); margin: 0 0 12px; padding-right: 40px; }
  .fermer { position: absolute; right: 12px; top: 12px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--pan2); }
  .petit { font-size: 13px; color: var(--mut); margin: 0 0 10px; }
  .bas { margin-top: 14px; }
  .groupes { list-style: none; padding: 0; margin: 0 0 14px; display: grid; gap: 6px; }
  .groupes li { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: var(--pan2); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
  label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
  label input { margin-top: 4px; width: 18px; height: 18px; accent-color: var(--acc); }
  label small { display: block; color: var(--mut); font-size: 12.5px; }
  .taille { font-size: 12.5px; color: var(--mut); text-align: right; white-space: nowrap; display: grid; justify-items: end; }
  .ok { color: var(--good); }
  .lien { background: none; border: 0; color: var(--mut); text-decoration: underline; font-size: 12px; padding: 2px 0; cursor: pointer; }
  .barre { height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
  .barre div { height: 100%; background: var(--acc); transition: width 0.2s; }
  .principal { background: var(--acc); color: var(--acc-ink); border-color: var(--acc); font-weight: 600; }
  .principal:disabled { background: var(--pan2); color: var(--mut); border-color: var(--line); }
  .message { font-size: 13.5px; color: var(--acc); }
</style>
