<script lang="ts">
  // Composant racine : relie le visualiseur 3D, l'arborescence, la recherche
  // et les fiches. L'état d'affichage (masques, opacités, sélection…) est
  // centralisé ici et poussé au visualiseur ; chaque modification passe par
  // `modifier()` pour pouvoir être annulée.
  import { onMount } from 'svelte';
  import { Viewer, type EtatAffichage, type NomVue } from './lib/viewer/Viewer';
  import { chargerStructures, construireArbre, nomComplet, SYSTEMES, SYSTEMES_PRIORITAIRES, type NoeudArbre } from './lib/data';
  import { chargerFiches } from './lib/fiches';
  import { Historique } from './lib/history';
  import { IndexRecherche } from './lib/search';
  import type { Structure, Fiche } from './lib/types';
  import Recherche from './components/Recherche.svelte';
  import Arbre from './components/Arbre.svelte';
  import FicheVue from './components/Fiche.svelte';
  import Etiquettes from './components/Etiquettes.svelte';
  import Credits from './components/Credits.svelte';
  import Dissection from './components/Dissection.svelte';
  import Coupes from './components/Coupes.svelte';
  import Scanner from './components/Scanner.svelte';
  import { plansActifs, type Plans } from './lib/coupes';
  import Quiz from './components/Quiz.svelte';
  import ProgressionVue from './components/Progression.svelte';
  import { charger as chargerProgression, sauvegarder as sauverProgression, type Progression } from './lib/progression';
  import { cartesPossibles, construireCibles, idCible } from './lib/quiz';
  import type { IndexScanner } from './lib/scanner';
  import { DISSECTION_INITIALE, ETAPES, deplacer, etapeEffective } from './lib/dissection';

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
    // Modèle masculin par défaut : l'appareil génital féminin est masqué
    systemesVisibles: Object.fromEntries(SYSTEMES.map((s) => [s.id, s.id !== 'genital-f'])),
    rayonsX: false,
    selection: null,
    dissection: structuredClone(DISSECTION_INITIALE),
  });
  /** Région ciblée par le curseur de dissection (null = tout le corps) */
  let regionDissection: string | null = $state(null);
  // ------------------------------------------------------------ coupes
  let plans: Plans = $state({
    y: { actif: false, position: 1.1, inverser: false },
    z: { actif: false, position: 0, inverser: false },
    x: { actif: false, position: 0, inverser: false },
  });
  let bornes: Record<'x' | 'y' | 'z', [number, number]> = $state({ x: [-0.4, 0.4], y: [0, 1.8], z: [-0.25, 0.25] });
  let scannerOuvert = $state(false);
  /** Coupe imposée par le mode scanner (« couper le modèle à ce niveau ») */
  let coupeScanner: { axe: 'x' | 'y' | 'z'; position: number } | null = $state(null);
  $effect(() => {
    const liste = plansActifs(plans);
    viewer?.setCoupes(coupeScanner ? [...liste, { ...coupeScanner, inverser: false }] : liste);
  });
  function repereScanner(r: { axe: 'x' | 'y' | 'z'; valeur: number } | null, couper: boolean) {
    viewer?.setRepere(r);
    coupeScanner = r && couper ? { axe: r.axe, position: r.valeur } : null;
  }
  /** Clic sur une structure du scanner : on sélectionne la structure correspondante du modèle 3D. */
  function selectionDepuisScanner(lien: string, cote: 'g' | 'd' | null) {
    const candidates = structures.filter((s) => (s.fiche === lien || s.cle === lien) && (!cote || !s.cote || s.cote === cote));
    // on préfère la structure elle-même, puis les parties principales (pas un conduit ou une branche)
    const rang = (s: Structure) => (s.cle === lien ? 0 : /^(conduit|branche|affluent|arbre|tronc|partie|rameau|canal)/i.test(s.fr) ? 2 : 1);
    candidates.sort((a, b) => rang(a) - rang(b));
    if (candidates.length) selectionner(candidates[0].id, false);
  }

  /** Résultat de « Retirer et voir dessous » */
  let dessous: { muscle: string; ids: { id: string; part: number }[] } | null = $state(null);
  const historique = new Historique<EtatAffichage>();
  let peutAnnuler = $state(false);
  let peutRetablir = $state(false);

  let etiquettes = $state(false);
  let survol: { id: string; x: number; y: number } | null = $state(null);
  let chargement = $state('Chargement des modèles…');
  /** Chargement en arrière-plan (n'empêche pas d'utiliser l'app) */
  let chargementFond = $state('');
  let erreur = $state('');
  let creditsOuverts = $state(false);

  // ------------------------------------------------------------ quiz et progression
  let modeApp: 'explorer' | 'quiz' = $state('explorer');
  let progression: Progression = $state(chargerProgression());
  let progressionOuverte = $state(false);
  let indexScanner: IndexScanner | null = $state(null);
  /** En mode « pointer », le quiz écoute les clics sur le modèle */
  let ecouteClic: ((id: string | null, x: number, y: number) => void) | null = null;
  let etatAvantQuiz: EtatAffichage | null = null;
  /** Consigne du mode « pointer », affichée sur la scène */
  let consigne: string | null = $state(null);
  function changerConsigne(t: string | null) {
    consigne = t;
    // sur téléphone : on replie le panneau pour dégager le modèle, puis on le rouvre pour la correction
    if (matchMedia('(max-width: 900px)').matches) panneau = t ? null : 'fiche';
  }
  async function chargerIndexScanner() {
    if (!indexScanner) indexScanner = await (await fetch(`${import.meta.env.BASE_URL}coupes/s1371/index.json`)).json();
  }
  function sauverProg() { sauverProgression($state.snapshot(progression) as Progression); progression = progression; }
  function entrerQuiz() {
    etatAvantQuiz = $state.snapshot(etat);
    etiquettes = false; // les étiquettes donneraient les réponses
    effacerDessous();
    modeApp = 'quiz';
    if (matchMedia('(max-width: 900px)').matches) panneau = 'fiche';
  }
  function sortirQuiz() {
    modeApp = 'explorer';
    ecouteClic = null;
    viewer?.mettreEnEvidence([]);
    if (etatAvantQuiz) { etat = etatAvantQuiz; etatAvantQuiz = null; pousser(); }
  }
  /** Étape de dissection qui met une couche à nu (sa couche et les plus profondes restent visibles). */
  const etapePour = (couche: number) => ETAPES.reduce((m, e, i) => (e.seuil <= couche ? i : m), 0);
  /** Prépare le modèle pour une question du quiz. */
  function sceneQuiz(ids: string[] | null, opts: { surligner: boolean; cadrer: 'cible' | 'region' }) {
    if (!viewer) return;
    if (!ids) { viewer.mettreEnEvidence([]); return; }
    const cibles = ids.map((id) => parId.get(id)).filter((x): x is Structure => !!x);
    if (!cibles.length) return;
    const couche = Math.min(...cibles.map((x) => x.couche));
    const profonde = couche >= 5 && couche < 9; // vaisseaux, nerfs, organes (pas les os) : cachés par le squelette
    etat.masques = []; etat.selection = null;
    // structure interne surlignée : rayons X (elle reste opaque, le reste devient translucide)
    etat.rayonsX = profonde && opts.surligner;
    etat.dissection = { global: etapePour(couche), regions: {} };
    for (const k in etat.systemesVisibles) if (k !== 'genital-f' && k !== 'genital-m') etat.systemesVisibles[k] = true;
    if (profonde) etat.systemesVisibles.os = false;
    // « pointer » une structure profonde : on n'affiche que son système (sinon elle serait cachée)
    if (profonde && !opts.surligner) for (const k in etat.systemesVisibles) etat.systemesVisibles[k] = k === cibles[0].systeme;
    pousser();
    viewer.mettreEnEvidence(opts.surligner ? ids : []);
    if (opts.cadrer === 'cible') viewer.cadrer(ids);
    else viewer.vue('ant', structures.filter((x) => x.region === cibles[0].region && x.systeme === 'os').map((x) => x.id));
  }
  const toutesCartes = $derived(structures.length
    ? cartesPossibles(['identifier', 'pointer', 'fiche', 'coupe'], { systemes: [], regions: [], listePerso: false }, construireCibles(structures, fiches), fiches, [], indexScanner)
    : []);

  /** Sur téléphone : panneau ouvert en surimpression */
  let panneau: 'arbre' | 'fiche' | null = $state(null);
  let versionRendu = $state(0);

  type Qualite = 'auto' | 'basse' | 'haute';
  let qualite: Qualite = $state((localStorage.getItem('qualite') as Qualite) || 'auto');

  const selection = $derived(etat.selection ? parId.get(etat.selection) ?? null : null);
  const ficheSel = $derived(selection ? fiches.get(selection.fiche) ?? null : null);
  /** Liste personnelle : ajouter / retirer la structure sélectionnée */
  const dansListe = $derived(selection ? progression.liste.includes(idCible(selection)) : false);
  function basculerListe() {
    if (!selection) return;
    const k = idCible(selection);
    progression.liste = dansListe ? progression.liste.filter((x) => x !== k) : [...progression.liste, k];
    sauverProg();
  }

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
    if (dessous && id !== null && !dessous.ids.some((x) => x.id === id)) effacerDessous();
    modifier((e) => {
      e.selection = id;
      // Sélectionner une structure masquée la ré-affiche
      if (id) e.masques = e.masques.filter((m) => m !== id);
    });
    if (id && cadrer) {
      viewer?.cadrer([id]);
      // Structure profonde (sous des couches encore visibles) : rayons X pour la voir
      const s = parId.get(id);
      if (s && s.couche > ETAPES[etapeEffective(etat.dissection, s.region)].seuil && !etat.rayonsX) {
        etat.rayonsX = true;
        pousser();
      }
    }
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

  // ------------------------------------------------------------ dissection
  function dissequer(sens: 1 | -1) {
    modifier((e) => { e.dissection = deplacer(e.dissection, sens, regionDissection); });
  }
  function etapeDirecte(etape: number) {
    modifier((e) => {
      if (regionDissection) e.dissection = { ...e.dissection, regions: { ...e.dissection.regions, [regionDissection]: etape } };
      else e.dissection = { global: etape, regions: {} };
    });
  }
  /** Retire la structure sélectionnée et met en évidence ce qu'elle recouvrait. */
  function retirerEtVoirDessous() {
    const id = etat.selection;
    if (!id || !viewer) return;
    const ids = viewer.structuresRecouvertes(id).slice(0, 10);
    modifier((e) => { e.masques = [...e.masques, id]; e.selection = null; });
    dessous = { muscle: id, ids };
    viewer.mettreEnEvidence(ids.map((x) => x.id));
    if (matchMedia('(max-width: 900px)').matches) panneau = 'fiche';
  }
  function effacerDessous() {
    dessous = null;
    viewer?.mettreEnEvidence([]);
  }

  /** Vues régionales : cadrage sur les structures de la région */
  const VUES_REGIONALES: { id: string; nom: string; filtre: (s: Structure) => boolean; vue?: NomVue }[] = [
    { id: 'tete', nom: 'Tête', filtre: (s) => s.region === 'tete' },
    { id: 'cou', nom: 'Cou', filtre: (s) => /^vertebre-c|^atlas$|^axis$|^hyoide$/.test(s.cle) },
    { id: 'dos', nom: 'Dos', filtre: (s) => s.region === 'dos' || s.region === 'rachis', vue: 'post' },
    { id: 'thorax', nom: 'Thorax', filtre: (s) => s.region === 'thorax' && s.systeme === 'os' },
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

  // ------------------------------------------------------------ sexe du modèle
  /** Le modèle de base est masculin ; « féminin » remplace l'appareil génital
   *  masculin par les organes féminins (HuBMAP, recalés sur le bassin). */
  const sexe = $derived(etat.systemesVisibles['genital-f'] && !etat.systemesVisibles['genital-m'] ? 'f' : 'm');
  function choisirSexe(x: 'm' | 'f') {
    modifier((e) => { e.systemesVisibles['genital-m'] = x === 'm'; e.systemesVisibles['genital-f'] = x === 'f'; });
  }

  // ------------------------------------------------------------ chargement
  /** Système de chaque paquet GLB (ex. « genital-f-bassin » -> « genital-f ») */
  let systemeDuPaquet = new Map<string, string>();
  const paquetsHiCharges = new Set<string>();
  async function chargerHi() {
    if (!viewer) return;
    // les systèmes prioritaires d'abord
    const paquets = [...systemeDuPaquet.keys()]
      .filter((p) => !paquetsHiCharges.has(p))
      .sort((a, b) => +!SYSTEMES_PRIORITAIRES.includes(systemeDuPaquet.get(a)!) - +!SYSTEMES_PRIORITAIRES.includes(systemeDuPaquet.get(b)!));
    for (const p of paquets) {
      paquetsHiCharges.add(p);
      await viewer.chargerPaquet(`${import.meta.env.BASE_URL}models/${p}.hi.glb`, systemeDuPaquet.get(p)!);
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
    v.onClic = (id, x, y) => {
      if (modeApp === 'quiz') { ecouteClic?.(id, x, y); return; } // pas de sélection libre pendant le quiz
      selectionner(id);
    };

    (async () => {
      try {
        structures = await chargerStructures();
        arbre = construireArbre(structures);
        v.setMeta(new Map(structures.map((s) => [s.id, { couche: s.couche, region: s.region }])));
        index = new IndexRecherche(structures.map((s) => {
          const f = fiches.get(s.fiche);
          return { id: s.id, noms: [nomComplet(s), s.fr, s.la, s.en, f && f.structures.length === 1 ? f.titre : ''] };
        }));
        systemeDuPaquet = new Map(structures.map((s) => [s.paquet, s.systeme]));
        const tous = [...systemeDuPaquet.keys()];
        const prioritaires = tous.filter((p) => SYSTEMES_PRIORITAIRES.includes(systemeDuPaquet.get(p)!));
        const autres = tous.filter((p) => !prioritaires.includes(p));
        const lo = (p: string) => v.chargerPaquet(`${import.meta.env.BASE_URL}models/${p}.lo.glb`, systemeDuPaquet.get(p)!);
        // 1) peau, muscles, squelette en version légère : affichage rapide
        let n = 0;
        await Promise.all(prioritaires.map(async (p) => { await lo(p); chargement = `Chargement des modèles… ${++n}/${prioritaires.length}`; }));
        pousser();
        v.vue('ant');
        chargement = '';
        // bornes des curseurs de coupe = boîte du modèle
        const b = v.boiteModele;
        bornes = { x: [b.min.x, b.max.x], y: [b.min.y, b.max.y], z: [b.min.z, b.max.z] };
        plans = { y: { ...plans.y, position: (b.min.y + b.max.y) * 0.62 }, z: { ...plans.z, position: (b.min.z + b.max.z) / 2 }, x: { ...plans.x, position: (b.min.x + b.max.x) / 2 } };
        // 2) vaisseaux, nerfs et organes en arrière-plan (4 paquets à la fois)
        let m = 0;
        chargementFond = `Vaisseaux, nerfs et organes : 0/${autres.length}`;
        for (let i = 0; i < autres.length; i += 4) {
          await Promise.all(autres.slice(i, i + 4).map(async (p) => { await lo(p); chargementFond = `Vaisseaux, nerfs et organes : ${++m}/${autres.length}`; }));
          pousser();
        }
        chargementFond = '';
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
      case 'd': dissequer(e.shiftKey ? -1 : 1); break;
      case 'r': retirerEtVoirDessous(); break;
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
      <div class="modes" role="group" aria-label="Mode">
        <button class="btn" class:on={modeApp === 'explorer'} onclick={() => modeApp === 'quiz' && sortirQuiz()}>Explorer</button>
        <button class="btn" class:on={modeApp === 'quiz'} onclick={() => modeApp === 'explorer' && entrerQuiz()}>Quiz</button>
      </div>
      <button class="btn" onclick={async () => { progressionOuverte = true; await chargerIndexScanner(); }}>Progression</button>
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

    <div class="sexe" role="group" aria-label="Modèle">
      <span>Modèle</span>
      <button class="chip" class:on={sexe === 'm'} onclick={() => choisirSexe('m')}>Masculin</button>
      <button class="chip" class:on={sexe === 'f'} onclick={() => choisirSexe('f')}>Féminin</button>
    </div>
    {#if sexe === 'f'}
      <p class="petit">Organes génitaux féminins issus d'un autre modèle (HuBMAP), recalés sur ce bassin masculin : position approximative.</p>
    {/if}

    <h2 class="titre-section">Dissection par couches</h2>
    <Dissection dissection={etat.dissection} bind:region={regionDissection} onDeplacer={dissequer} onEtape={etapeDirecte} />

    <h2 class="titre-section">Coupes</h2>
    <Coupes bind:plans {bornes} onScanner={() => { scannerOuvert = true; panneau = null; }} />

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
    {#if survol && parId.get(survol.id) && modeApp === 'explorer'}
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
    {#if scannerOuvert}
      <Scanner onSelection={selectionDepuisScanner} onRepere={repereScanner} onFermer={() => (scannerOuvert = false)} />
    {/if}
    {#if consigne && modeApp === 'quiz'}<div class="consigne" role="status">{consigne}</div>{/if}
    {#if chargement}<div class="etat">{chargement}</div>{/if}
    {#if chargementFond}<div class="fond-chargement">{chargementFond}</div>{/if}
    {#if erreur}<div class="etat erreur">Erreur : {erreur}</div>{/if}
    <div class="aide">Glisser : tourner · Clic droit ou 2 doigts : déplacer · Molette ou pincer : zoom · Clic ou appui : sélectionner</div>
    <div class="couches" aria-label="Dissection rapide">
      <button class="btn" title="Recouvrir (⇧D)" onclick={() => dissequer(-1)}>▲ Recouvrir</button>
      <button class="btn" title="Disséquer (D)" onclick={() => dissequer(1)}>▼ Disséquer</button>
    </div>
    <nav class="barre-mobile">
      <button class="btn" class:on={panneau === 'arbre'} onclick={() => (panneau = panneau === 'arbre' ? null : 'arbre')}>Structures</button>
      <button class="btn" class:on={panneau === 'fiche'} onclick={() => (panneau = panneau === 'fiche' ? null : 'fiche')}>Fiche</button>
      <button class="btn" class:on={etat.rayonsX} onclick={() => modifier((s) => { s.rayonsX = !s.rayonsX; })}>Rayons X</button>
      <button class="btn" class:on={etiquettes} onclick={() => { etiquettes = !etiquettes; viewer?.demanderRendu(); }}>Étiquettes</button>
    </nav>
  </main>

  <aside id="cote-droit" aria-label="Fiche de la structure">
    <button class="fermer" aria-label="Fermer" onclick={() => (panneau = null)}>✕</button>
    {#if modeApp === 'quiz'}
      <Quiz {structures} {fiches} {progression} scanner={indexScanner} chargerScanner={chargerIndexScanner}
        onSauver={sauverProg} onScene={sceneQuiz} onEcouteClic={(f) => (ecouteClic = f)} distanceEcran={(ids, x, y) => viewer?.distanceEcran(ids, x, y) ?? Infinity} onConsigne={changerConsigne} onQuitter={sortirQuiz} />
    {:else}
    <FicheVue structure={selection} fiche={ficheSel} {dansListe} onListe={basculerListe}
      onMasquer={masquerSelection} onIsoler={isolerSelection}
      onCadrer={() => etat.selection && viewer?.cadrer([etat.selection])}
      onRetirer={retirerEtVoirDessous}
      dessous={dessous ? { muscle: parId.get(dessous.muscle) ?? null, liste: dessous.ids.map((x) => ({ structure: parId.get(x.id)!, part: x.part })).filter((x) => x.structure) } : null}
      onChoisirDessous={(id) => selectionner(id, false)}
      onFermerDessous={() => { if (dessous) { const m = dessous.muscle; effacerDessous(); modifier((e) => { e.masques = e.masques.filter((x) => x !== m); }); } }} />
    {/if}
  </aside>
</div>

{#if progressionOuverte}
  <ProgressionVue {progression} possibles={toutesCartes} onRemplacer={(p) => { progression = p; sauverProg(); }} onFermer={() => (progressionOuverte = false)} />
{/if}

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
  .modes { display: flex; gap: 2px; padding: 2px; border: 1px solid var(--line); border-radius: 10px; }
  .modes .btn { border: 0; height: 32px; }
  aside { overflow: auto; background: var(--pan); padding: 14px; position: relative; }
  #cote-gauche { border-right: 1px solid var(--line); }
  #cote-droit { border-left: 1px solid var(--line); }
  .fermer { display: none; }
  .systeme { display: flex; align-items: center; gap: 8px; padding: 3px 8px; border-bottom: 1px solid var(--line); }
  .systeme label { flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 30px; }
  .systeme input[type='checkbox'] { width: 16px; height: 16px; flex: none; accent-color: var(--acc); }
  .systeme input[type='range'] { width: 64px; accent-color: var(--acc); }
  .pastille { width: 12px; height: 12px; border-radius: 3px; flex: none; }
  .sexe { display: flex; align-items: center; gap: 6px; margin: 10px 0 4px; }
  .sexe span { font-size: 13.5px; color: var(--mut); margin-right: 4px; }
  .consigne { position: absolute; z-index: 3; left: 50%; top: 96px; transform: translateX(-50%); background: var(--acc); color: var(--acc-ink); font-weight: 600; padding: 8px 14px; border-radius: 10px; box-shadow: 0 6px 20px #0008; max-width: calc(100% - 20px); text-align: center; }
  .fond-chargement { position: absolute; left: 12px; top: 92px; font-size: 12px; color: var(--mut); background: #0e1418b0; padding: 4px 8px; border-radius: 6px; z-index: 2; }
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
  .aide { position: absolute; left: 12px; right: 140px; bottom: 12px; font-size: 12.5px; color: var(--mut); background: #0e1418b0; padding: 6px 10px; border-radius: 8px; }
  .barre-mobile { display: none; }
  .couches { position: absolute; right: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 6px; z-index: 2; }
  .couches .btn { background: #151d23ee; justify-content: center; }

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
    .couches { right: 8px; bottom: calc(max(8px, env(safe-area-inset-bottom)) + 54px); flex-direction: row; }
    .couches .btn { height: 40px; }
  }
</style>
