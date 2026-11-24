<script lang="ts">
  // Composant racine : relie le visualiseur 3D, l'arborescence, la recherche
  // et les fiches. L'état d'affichage (masques, opacités, sélection…) est
  // centralisé ici et poussé au visualiseur ; chaque modification passe par
  // `modifier()` pour pouvoir être annulée.
  import { onMount } from 'svelte';
  import { Viewer, type EtatAffichage, type NomVue } from './lib/viewer/Viewer';
  import { chargerStructures, construireArbre, nomComplet, SYSTEMES, type NoeudArbre } from './lib/data';
  import { chargerFiches } from './lib/fiches';
  import { Historique } from './lib/history';
  import { IndexRecherche } from './lib/search';
  import type { Structure, Fiche } from './lib/types';
  import Recherche from './components/Recherche.svelte';
  import Arbre from './components/Arbre.svelte';
  import FicheVue from './components/Fiche.svelte';
  import Etiquettes from './components/Etiquettes.svelte';
  import Credits from './components/Credits.svelte';

  let canvas: HTMLCanvasElement;
  let scene: HTMLElement;
  let viewer: Viewer | null = $state(null);

  let structures: Structure[] = $state([]);
  const parId = $derived(new Map(structures.map((s) => [s.id, s])));
  const fiches: Map<string, Fiche> = chargerFiches();
  let arbre: NoeudArbre[] = $state([]);
  let index: IndexRecherche | null = $state(null);

  let etat: EtatAffichage = $state({
    masques: [],
    opacites: Object.fromEntries(SYSTEMES.map((s) => [s.id, 1])),
    systemesVisibles: Object.fromEntries(SYSTEMES.map((s) => [s.id, true])),
    rayonsX: false,
    selection: null,
  });
  const historique = new Historique<EtatAffichage>();
  let peutAnnuler = $state(false);
  let peutRetablir = $state(false);

  let etiquettes = $state(false);
  let survol: { id: string; x: number; y: number } | null = $state(null);
  let chargement = $state('Chargement des modèles…');
  let erreur = $state('');
  let creditsOuverts = $state(false);
  /** Sur téléphone : panneau ouvert en surimpression */
  let panneau: 'arbre' | 'fiche' | null = $state(null);
  let versionRendu = $state(0);

  type Qualite = 'auto' | 'basse' | 'haute';
  let qualite: Qualite = $state((localStorage.getItem('qualite') as Qualite) || 'auto');

  const selection = $derived(etat.selection ? parId.get(etat.selection) ?? null : null);
  const ficheSel = $derived(selection ? fiches.get(selection.fiche) ?? null : null);

  // ------------------------------------------------------------ état + historique
  function modifier(f: (e: EtatAffichage) => void) {
    historique.enregistrer($state.snapshot(etat));
    f(etat);
    pousser();
  }
  function pousser() {
    viewer?.setEtat($state.snapshot(etat));
    peutAnnuler = historique.peutAnnuler;
    peutRetablir = historique.peutRetablir;
  }
  function annuler() {
    const e = historique.annuler($state.snapshot(etat));
    if (e) { etat = e; pousser(); }
  }
  function retablir() {
    const e = historique.retablir($state.snapshot(etat));
    if (e) { etat = e; pousser(); }
  }

  // ------------------------------------------------------------ actions
  function selectionner(id: string | null, cadrer = false) {
    modifier((e) => {
      e.selection = id;
      // Sélectionner une structure masquée la ré-affiche
      if (id) e.masques = e.masques.filter((m) => m !== id);
    });
    if (id && cadrer) viewer?.cadrer([id]);
    if (id && matchMedia('(max-width: 900px)').matches) panneau = 'fiche';
  }
  function masquerSelection() {
    if (!etat.selection) return;
    modifier((e) => { e.masques = [...e.masques, e.selection!]; e.selection = null; });
  }
  function isolerSelection() {
    if (!etat.selection) return;
    modifier((e) => { e.masques = structures.map((s) => s.id).filter((id) => id !== e.selection); });
    viewer?.cadrer([etat.selection]);
  }
  function toutAfficher() {
    modifier((e) => { e.masques = []; for (const k in e.systemesVisibles) e.systemesVisibles[k] = true; });
  }
  function basculer(id: string) {
    modifier((e) => {
      e.masques = e.masques.includes(id) ? e.masques.filter((m) => m !== id) : [...e.masques, id];
      if (e.selection === id) e.selection = null;
    });
  }
  /** Masquer/afficher un ensemble (une région, un groupe…) */
  function basculerGroupe(ids: string[], afficher: boolean) {
    modifier((e) => {
      const s = new Set(e.masques);
      for (const id of ids) afficher ? s.delete(id) : s.add(id);
      e.masques = [...s];
    });
  }
  function vue(nom: NomVue) { viewer?.vue(nom); }

  /** Vues régionales : cadrage sur les structures de la région */
  const VUES_REGIONALES: { id: string; nom: string; filtre: (s: Structure) => boolean; vue?: NomVue }[] = [
    { id: 'tete', nom: 'Tête', filtre: (s) => s.region === 'tete' },
    { id: 'cou', nom: 'Cou', filtre: (s) => /^vertebre-c|^atlas$|^axis$|^hyoide$/.test(s.cle) },
    { id: 'thorax', nom: 'Thorax', filtre: (s) => s.region === 'thorax' },
    { id: 'abdomen', nom: 'Abdomen', filtre: (s) => /^vertebre-l|^cote-1[12]$/.test(s.cle) },
    { id: 'bassin', nom: 'Pelvis', filtre: (s) => s.region === 'bassin' },
    { id: 'msup', nom: 'Membre sup.', filtre: (s) => s.region === 'membre-sup' && s.cote === 'd' },
    { id: 'minf', nom: 'Membre inf.', filtre: (s) => s.region === 'membre-inf' && s.cote === 'd' },
  ];
  function vueRegionale(id: string) {
    const v = VUES_REGIONALES.find((x) => x.id === id)!;
    viewer?.vue(v.vue ?? 'ant', structures.filter(v.filtre).map((s) => s.id));
  }

  function changerQualite(q: Qualite) {
    qualite = q;
    localStorage.setItem('qualite', q);
    if (q !== 'basse') chargerHi();
  }

  // ------------------------------------------------------------ chargement
  const paquetsHiCharges = new Set<string>();
  async function chargerHi() {
    if (!viewer) return;
    const paquets = [...new Set(structures.map((s) => s.paquet))].filter((p) => !paquetsHiCharges.has(p));
    for (const p of paquets) {
      paquetsHiCharges.add(p);
      await viewer.chargerPaquet(`${import.meta.env.BASE_URL}models/${p}.hi.glb`, p.split('-')[0]);
    }
  }

  onMount(() => {
    const v = new Viewer(canvas, scene);
    viewer = v;
    v.onRendu = () => { if (etiquettes) versionRendu++; };
    v.onSurvol = (id, x, y) => {
      const r = scene.getBoundingClientRect();
      survol = id ? { id, x: x - r.left, y: y - r.top } : null;
    };
    v.onClic = (id) => selectionner(id);

    (async () => {
      try {
        structures = await chargerStructures();
        arbre = construireArbre(structures);
        index = new IndexRecherche(structures.map((s) => {
          const f = fiches.get(s.fiche);
          return { id: s.id, noms: [nomComplet(s), s.fr, s.la, s.en, f && f.structures.length === 1 ? f.titre : ''] };
        }));
        // 1) niveau de détail bas, tous les paquets en parallèle : affichage rapide
        const paquets = [...new Set(structures.map((s) => s.paquet))];
        let n = 0;
        await Promise.all(paquets.map(async (p) => {
          await v.chargerPaquet(`${import.meta.env.BASE_URL}models/${p}.lo.glb`, p.split('-')[0]);
          chargement = `Chargement des modèles… ${++n}/${paquets.length}`;
        }));
        pousser();
        v.vue('ant');
        chargement = '';
        // 2) haute définition en arrière-plan (sauf téléphone en mode auto, ou mode « basse »)
        const petitEcran = matchMedia('(max-width: 900px)').matches;
        if (qualite === 'haute' || (qualite === 'auto' && !petitEcran)) await chargerHi();
      } catch (e) {
        erreur = e instanceof Error ? e.message : String(e);
        chargement = '';
      }
    })();

    // Expose le visualiseur pour les tests automatisés (Playwright)
    (window as unknown as { __atlas: unknown }).__atlas = { viewer: v, get etat() { return $state.snapshot(etat); } };
    return () => v.detruire();
  });

  // ------------------------------------------------------------ clavier
  function clavier(e: KeyboardEvent) {
    const cible = e.target as HTMLElement;
    if (cible.matches('input, textarea, select')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? retablir() : annuler(); return; }
    if (mod) return;
    switch (e.key.toLowerCase()) {
      case 'h': masquerSelection(); break;
      case 'i': isolerSelection(); break;
      case 'a': toutAfficher(); break;
      case 'l': etiquettes = !etiquettes; viewer?.demanderRendu(); break;
      case 'x': modifier((s) => { s.rayonsX = !s.rayonsX; }); break;
      case 'f': if (etat.selection) viewer?.cadrer([etat.selection]); break;
      case 'escape': if (creditsOuverts) creditsOuverts = false; else selectionner(null); break;
      case '/': e.preventDefault(); document.querySelector<HTMLInputElement>('#recherche')?.focus(); break;
    }
  }
</script>

<svelte:window onkeydown={clavier} />

<div class="app" class:panneau-arbre={panneau === 'arbre'} class:panneau-fiche={panneau === 'fiche'}>
  <header>
    <h1>Atlas <span>3D</span> · Anatomie P2</h1>
    <Recherche {index} {parId} onChoisir={(id) => selectionner(id, true)} />
    <div class="outils">
      <button class="btn icone" title="Annuler (⌘Z)" aria-label="Annuler" disabled={!peutAnnuler} onclick={annuler}>↶</button>
      <button class="btn icone" title="Rétablir (⇧⌘Z)" aria-label="Rétablir" disabled={!peutRetablir} onclick={retablir}>↷</button>
      <button class="btn" onclick={() => (creditsOuverts = true)}>Crédits</button>
    </div>
  </header>

  <aside id="cote-gauche" aria-label="Systèmes et structures">
    <button class="fermer" aria-label="Fermer" onclick={() => (panneau = null)}>✕</button>
    <h2 class="titre-section">Systèmes</h2>
    {#each SYSTEMES as sys (sys.id)}
      <div class="systeme">
        <label>
          <input type="checkbox" checked={etat.systemesVisibles[sys.id]}
            onchange={(e) => modifier((s) => { s.systemesVisibles[sys.id] = (e.target as HTMLInputElement).checked; })} />
          <span class="pastille" style:background={sys.couleur}></span>{sys.nom}
        </label>
        <input type="range" min="0.05" max="1" step="0.05" aria-label={`Opacité : ${sys.nom}`}
          value={etat.opacites[sys.id]}
          onpointerdown={() => historique.enregistrer($state.snapshot(etat))}
          oninput={(e) => { etat.opacites[sys.id] = +(e.target as HTMLInputElement).value; pousser(); }} />
      </div>
    {/each}

    <h2 class="titre-section">Affichage</h2>
    <div class="rangee">
      <button class="chip" class:on={etiquettes} onclick={() => { etiquettes = !etiquettes; viewer?.demanderRendu(); }}>Étiquettes</button>
      <button class="chip" class:on={etat.rayonsX} onclick={() => modifier((s) => { s.rayonsX = !s.rayonsX; })}>Rayons X</button>
      <button class="chip" disabled={!etat.selection} onclick={isolerSelection}>Isoler</button>
      <button class="chip" disabled={!etat.selection} onclick={masquerSelection}>Masquer</button>
      <button class="chip" disabled={!etat.masques.length} onclick={toutAfficher}>Tout réafficher</button>
    </div>

    <h2 class="titre-section">Structures</h2>
    <Arbre noeuds={arbre} masques={etat.masques} selection={etat.selection}
      onSelection={(id) => selectionner(id, true)} onBasculer={basculer} onBasculerGroupe={basculerGroupe} />

    <h2 class="titre-section">Qualité des modèles</h2>
    <div class="rangee">
      {#each [['auto', 'Auto'], ['basse', 'Légère'], ['haute', 'Haute']] as [q, n] (q)}
        <button class="chip" class:on={qualite === q} onclick={() => changerQualite(q as Qualite)}>{n}</button>
      {/each}
    </div>
    <p class="petit">« Auto » : haute définition sur ordinateur et tablette, modèles légers sur téléphone.</p>
  </aside>

  <main bind:this={scene} class="scene">
    <canvas bind:this={canvas} aria-label="Modèle anatomique 3D"></canvas>
    {#if viewer && etiquettes}
      <Etiquettes {viewer} {parId} selection={etat.selection} version={versionRendu} />
    {/if}
    {#if survol && parId.get(survol.id)}
      <div class="bulle" style:left="{survol.x + 14}px" style:top="{survol.y + 10}px">{nomComplet(parId.get(survol.id)!)}</div>
    {/if}
    <div class="vues">
      <div class="rangee">
        {#each [['ant', 'Antérieure'], ['post', 'Postérieure'], ['latd', 'Latérale D'], ['latg', 'Latérale G'], ['sup', 'Supérieure'], ['inf', 'Inférieure']] as [v, n] (v)}
          <button class="chip" onclick={() => vue(v as NomVue)}>{n}</button>
        {/each}
      </div>
      <div class="rangee">
        {#each VUES_REGIONALES as r (r.id)}
          <button class="chip" onclick={() => vueRegionale(r.id)}>{r.nom}</button>
        {/each}
      </div>
    </div>
    {#if chargement}<div class="etat">{chargement}</div>{/if}
    {#if erreur}<div class="etat erreur">Erreur : {erreur}</div>{/if}
    <div class="aide">Glisser : tourner · Clic droit ou 2 doigts : déplacer · Molette ou pincer : zoom · Clic ou appui : sélectionner</div>
    <nav class="barre-mobile">
      <button class="btn" class:on={panneau === 'arbre'} onclick={() => (panneau = panneau === 'arbre' ? null : 'arbre')}>Structures</button>
      <button class="btn" class:on={panneau === 'fiche'} onclick={() => (panneau = panneau === 'fiche' ? null : 'fiche')}>Fiche</button>
      <button class="btn" class:on={etat.rayonsX} onclick={() => modifier((s) => { s.rayonsX = !s.rayonsX; })}>Rayons X</button>
      <button class="btn" class:on={etiquettes} onclick={() => { etiquettes = !etiquettes; viewer?.demanderRendu(); }}>Étiquettes</button>
    </nav>
  </main>

  <aside id="cote-droit" aria-label="Fiche de la structure">
    <button class="fermer" aria-label="Fermer" onclick={() => (panneau = null)}>✕</button>
    <FicheVue structure={selection} fiche={ficheSel}
      onMasquer={masquerSelection} onIsoler={isolerSelection}
      onCadrer={() => etat.selection && viewer?.cadrer([etat.selection])} />
  </aside>
</div>

{#if creditsOuverts}
  <Credits onFermer={() => (creditsOuverts = false)} />
{/if}

<style>
  .app {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr) 380px;
    grid-template-rows: 56px minmax(0, 1fr);
    height: 100dvh;
  }
  header {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 14px;
    border-bottom: 1px solid var(--line);
    background: var(--pan);
  }
  h1 { font: 600 19px/1 var(--serif); margin: 0; white-space: nowrap; }
  h1 span { color: var(--acc); }
  .outils { display: flex; gap: 6px; margin-left: auto; }
  aside { overflow: auto; background: var(--pan); padding: 14px; position: relative; }
  #cote-gauche { border-right: 1px solid var(--line); }
  #cote-droit { border-left: 1px solid var(--line); }
  .fermer { display: none; }
  .systeme { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--pan2); margin-bottom: 8px; }
  .systeme label { flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .systeme input[type='checkbox'] { width: 18px; height: 18px; accent-color: var(--acc); }
  .systeme input[type='range'] { width: 80px; accent-color: var(--acc); }
  .pastille { width: 12px; height: 12px; border-radius: 3px; }
  .rangee { display: flex; flex-wrap: wrap; gap: 6px; }
  .petit { font-size: 12.5px; color: var(--mut); margin: 8px 0 0; }

  .scene { position: relative; background: radial-gradient(ellipse at 50% 35%, #1d2a33 0%, var(--bg) 70%); overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
  .bulle { position: absolute; pointer-events: none; background: #000c; border: 1px solid var(--line); padding: 4px 9px; border-radius: 6px; font-size: 13px; white-space: nowrap; z-index: 3; }
  .vues { position: absolute; top: 10px; left: 10px; right: 10px; display: grid; gap: 6px; justify-items: center; z-index: 2; }
  /* une seule ligne par rangée, défilable si la scène est étroite */
  .vues .rangee { justify-content: safe center; flex-wrap: nowrap; overflow-x: auto; max-width: 100%; scrollbar-width: none; }
  .vues :global(.chip) { flex: none; }
  .vues :global(.chip) { background: #151d23e6; }
  .etat { position: absolute; inset: auto 0 50% 0; text-align: center; color: var(--mut); }
  .erreur { color: var(--bad); }
  .aide { position: absolute; left: 12px; bottom: 12px; font-size: 12.5px; color: var(--mut); background: #0e1418b0; padding: 6px 10px; border-radius: 8px; }
  .barre-mobile { display: none; }

  @media (max-width: 1100px) { .app { grid-template-columns: 260px minmax(0, 1fr) 320px; } }

  /* ---------- Téléphone et petite tablette : scène plein écran, panneaux en surimpression ---------- */
  @media (max-width: 900px) {
    .app { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
    header { flex-wrap: wrap; padding: 8px 10px; gap: 8px; padding-top: max(8px, env(safe-area-inset-top)); }
    h1 { font-size: 17px; }
    header :global(.recherche) { order: 3; flex-basis: 100%; max-width: none; }
    .scene { grid-row: 2; }
    aside {
      position: fixed; z-index: 10; left: 0; right: 0; bottom: 0;
      max-height: 62dvh; border: 0; border-top: 1px solid var(--line);
      border-radius: 14px 14px 0 0; box-shadow: 0 -10px 30px #0008;
      transform: translateY(105%); transition: transform 0.22s ease;
      padding-bottom: max(14px, env(safe-area-inset-bottom));
    }
    .panneau-arbre #cote-gauche, .panneau-fiche #cote-droit { transform: none; }
    .fermer { display: block; position: sticky; top: 0; float: right; z-index: 1; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--pan2); }
    .aide { display: none; }
    .vues { top: 8px; left: 8px; right: 8px; }
    .barre-mobile {
      display: flex; gap: 6px; position: absolute; left: 8px; right: 8px; bottom: max(8px, env(safe-area-inset-bottom));
      justify-content: center; z-index: 2;
    }
    .barre-mobile .btn { flex: 1; justify-content: center; background: #151d23ee; height: 44px; }
    .barre-mobile .btn.on { background: var(--acc); }
  }
</style>
