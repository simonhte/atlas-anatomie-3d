<script lang="ts">
  // Quiz avec répétition espacée : configuration de la séance, questions,
  // correction, puis bilan. La planification (FSRS) est dans lib/progression.ts,
  // la génération des questions dans lib/quiz.ts.
  import { marked } from 'marked';
  import type { Fiche, Structure } from '../lib/types';
  import { SYSTEMES, REGIONS } from '../lib/data';
  import { Rating, choisirSeance, noteAuto, noter, type Note, type Progression } from '../lib/progression';
  import {
    cartesPossibles, distracteurs, idCible, melanger, qcmFiche, verifierSaisie, construireCibles,
    type Cible, type Filtres, type Mode, type CartePossible,
  } from '../lib/quiz';
  import type { IndexScanner } from '../lib/scanner';
  import QuizCoupe from './QuizCoupe.svelte';

  let { structures, fiches, progression, scanner, chargerScanner, onSauver, onScene, onEcouteClic, onQuitter, distanceEcran, onConsigne }: {
    /** Consigne affichée sur la scène 3D (mode « pointer »), null pour l'effacer */
    onConsigne: (texte: string | null) => void;
    /** Distance (px) entre un clic et une structure, pour tolérer les clics « presque justes » */
    distanceEcran: (ids: string[], x: number, y: number) => number;
    structures: Structure[];
    fiches: Map<string, Fiche>;
    progression: Progression;
    scanner: IndexScanner | null;
    chargerScanner: () => Promise<void>;
    onSauver: () => void;
    /** Prépare le modèle 3D : structures à montrer (surlignées ou non), ou null pour rendre la main */
    onScene: (ids: string[] | null, opts: { surligner: boolean; cadrer: 'cible' | 'region' }) => void;
    /** Mode « pointer » : reçoit l'id du maillage cliqué (null pour arrêter d'écouter) */
    onEcouteClic: (f: ((id: string | null, x: number, y: number) => void) | null) => void;
    onQuitter: () => void;
  } = $props();

  const cibles = $derived(construireCibles(structures, fiches));
  const parIdCible = $derived(new Map(cibles.map((c) => [idCible(c), c] as const)));

  // ------------------------------------------------------------ configuration
  const MODES: { id: Mode; nom: string; aide: string }[] = [
    { id: 'identifier', nom: 'Identifier', aide: 'Nommer la structure surlignée sur le modèle' },
    { id: 'pointer', nom: 'Pointer', aide: 'Cliquer la structure demandée sur le modèle' },
    { id: 'fiche', nom: 'Cours', aide: 'Innervation, insertions, vascularisation, rapports…' },
    { id: 'coupe', nom: 'Coupes', aide: 'Reconnaître une structure sur une coupe de scanner' },
  ];
  let modes: Mode[] = $state(['identifier']);
  let reponseLibre = $state(false);
  let filtres: Filtres = $state({ systemes: [], regions: [], listePerso: false });
  let taille = $state(20);
  const possibles = $derived(cartesPossibles(modes, filtres, cibles, fiches, progression.liste, scanner));
  const nbDues = $derived(possibles.filter((c) => progression.cartes[c.id] && progression.cartes[c.id].card.due <= new Date()).length);
  const nbNouvelles = $derived(possibles.filter((c) => !progression.cartes[c.id]).length);
  const basculer = <T,>(liste: T[], x: T) => (liste.includes(x) ? liste.filter((y) => y !== x) : [...liste, x]);
  const systemesQuiz = SYSTEMES.filter((s) => s.id !== 'peau');
  const regionsQuiz = REGIONS.filter((r) => r.id !== 'corps');

  // ------------------------------------------------------------ séance
  type Question =
    | { type: 'identifier'; carte: CartePossible; cible: Cible; options: string[] | null }
    | { type: 'pointer'; carte: CartePossible; cible: Cible }
    | { type: 'fiche'; carte: CartePossible; fiche: Fiche; rubrique: string; qcm: { bonne: string; options: string[] } | null }
    | { type: 'coupe'; carte: CartePossible; label: number; fichier: string; bonne: string; options: string[] };

  let etape: 'reglages' | 'question' | 'fin' = $state('reglages');
  let file: CartePossible[] = $state([]);
  let position = $state(0);
  let question: Question | null = $state(null);
  let saisie = $state('');
  let revele = $state(false);
  let resultat: { correct: boolean; message: string } | null = $state(null);
  let debut = 0;
  let score = $state({ bonnes: 0, total: 0 });

  async function commencer() {
    if (modes.includes('coupe') && !scanner) await chargerScanner();
    const ids = choisirSeance(progression, possibles.map((c) => c.id), taille);
    const parId = new Map(possibles.map((c) => [c.id, c] as const));
    file = ids.map((id) => parId.get(id)!).filter(Boolean);
    position = 0;
    score = { bonnes: 0, total: 0 };
    if (!file.length) return;
    etape = 'question';
    preparer();
  }

  function preparer() {
    const carte = file[position];
    resultat = null; revele = false; saisie = '';
    onEcouteClic(null);
    const [type, reste] = [carte.meta.type, carte.id.slice(carte.id.indexOf(':') + 1)];
    if (type === 'identifier' || type === 'pointer') {
      const cible = parIdCible.get(reste);
      if (!cible) return suivante();
      if (type === 'identifier') {
        const options = reponseLibre ? null : melanger([cible.nom, ...distracteurs(cible, cibles).map((c) => c.nom)]);
        question = { type, carte, cible, options };
        onScene(cible.ids, { surligner: true, cadrer: 'cible' });
      } else {
        question = { type, carte, cible };
        onScene(cible.ids, { surligner: false, cadrer: 'region' });
        onEcouteClic((id, x, y) => repondrePointer(id, x, y));
        onConsigne(`Clique sur : ${cible.nom}`);
      }
    } else if (type === 'fiche') {
      const [idFiche, rubrique] = [reste.slice(0, reste.indexOf(':')), reste.slice(reste.indexOf(':') + 1)];
      const fiche = fiches.get(idFiche);
      if (!fiche) return suivante();
      // QCM pour les rubriques courtes et comparables (innervation, origine…), sinon carte « à retourner »
      const qcm = ['Innervation', 'Origine', 'Terminaison', 'Territoire'].includes(rubrique) ? qcmFiche(fiche, rubrique, fiches) : null;
      question = { type, carte, fiche, rubrique, qcm };
      const ids = structures.filter((s) => s.fiche === idFiche).map((s) => s.id);
      onScene(ids.length ? ids : null, { surligner: true, cadrer: 'cible' });
    } else if (type === 'coupe' && scanner) {
      const st = scanner.structures.find((s) => s.nom === reste);
      if (!st) return suivante();
      // coupe axiale où la structure est bien visible (parmi les 3 plus grandes surfaces)
      const coupes = scanner.orientations.axiale.coupes
        .map((c) => ({ c, n: c.s.find((e) => e[0] === st.id)?.[3] ?? 0 }))
        .filter((x) => x.n > 60).sort((a, b) => b.n - a.n).slice(0, 3);
      if (!coupes.length) return suivante();
      const choix = coupes[Math.floor(Math.random() * coupes.length)].c;
      const voisins = choix.s.map((e) => scanner.structures.find((s) => s.id === e[0])!).filter((s) => s && s.fr !== st.fr);
      const autres = melanger([...new Set(voisins.map((s) => s.fr))]).slice(0, 3);
      question = { type, carte, label: st.id, fichier: choix.f, bonne: st.fr, options: melanger([st.fr, ...autres]) };
      onScene(null, { surligner: false, cadrer: 'cible' });
    }
    debut = performance.now();
  }

  function enregistrer(note: Note, correct: boolean) {
    if (!question) return;
    noter(progression, question.carte.id, question.carte.meta, note);
    score = { bonnes: score.bonnes + (correct ? 1 : 0), total: score.total + 1 };
    onSauver();
  }
  const lent = () => performance.now() - debut > 15000;

  function repondreQcm(choix: string) {
    if (!question || resultat) return;
    const bonne = question.type === 'identifier' ? question.cible.nom : question.type === 'coupe' ? question.bonne : question.type === 'fiche' && question.qcm ? question.qcm.bonne : '';
    const correct = choix === bonne;
    resultat = { correct, message: correct ? 'Bonne réponse !' : `Réponse : ${bonne}` };
    choixFait = choix;
    enregistrer(noteAuto(correct, { lent: lent() }), correct);
    if (question.type === 'identifier') onScene(question.cible.ids, { surligner: true, cadrer: 'cible' });
  }
  let choixFait = $state('');

  function repondreSaisie() {
    if (!question || question.type !== 'identifier' || resultat) return;
    const v = verifierSaisie(saisie, question.cible, cibles);
    resultat = {
      correct: v.correct,
      message: v.correct ? (v.incomplet ? `Oui, mais précise le côté : ${question.cible.nom}` : 'Bonne réponse !') : `Réponse : ${question.cible.nom}`,
    };
    enregistrer(noteAuto(v.correct, { aide: v.incomplet, lent: lent() }), v.correct);
  }

  function repondrePointer(id: string | null, x: number, y: number) {
    if (!question || question.type !== 'pointer' || resultat) return;
    // clic juste à côté d'une structure fine (nerf, vaisseau) : accepté jusqu'à 14 px
    const proche = distanceEcran(question.cible.ids, x, y) <= 14;
    if (!id && !proche) return; // clic dans le vide : on laisse réessayer
    const s = id ? structures.find((x) => x.id === id) : undefined;
    const correct = (!!id && question.cible.ids.includes(id)) || proche;
    const memeStructure = !correct && s && s.cle === question.cible.cle;
    resultat = {
      correct,
      message: correct ? 'Bonne réponse !' : memeStructure ? `Mauvais côté : c'est ${question.cible.nom} qu'il fallait montrer` : `Non, c'est : ${s ? s.fr : 'le vide'}. La structure demandée est surlignée.`,
    };
    enregistrer(noteAuto(correct, { lent: lent() }), correct);
    onEcouteClic(null);
    onConsigne(null);
    onScene(question.cible.ids, { surligner: true, cadrer: 'cible' });
  }

  function jeNeSaisPas() {
    if (!question || resultat) return;
    const nom = question.type === 'identifier' || question.type === 'pointer' ? question.cible.nom : question.type === 'coupe' ? question.bonne : '';
    resultat = { correct: false, message: `Réponse : ${nom}` };
    enregistrer(Rating.Again, false);
    onEcouteClic(null);
    onConsigne(null);
    if (question.type === 'identifier' || question.type === 'pointer') onScene(question.cible.ids, { surligner: true, cadrer: 'cible' });
  }

  /** Carte de cours sans QCM : on révèle, puis on s'auto-évalue. */
  function autoEvaluer(note: Note) {
    enregistrer(note, note !== Rating.Again);
    suivante();
  }

  function suivante() {
    position++;
    if (position >= file.length) { etape = 'fin'; onEcouteClic(null); onScene(null, { surligner: false, cadrer: 'region' }); return; }
    preparer();
  }
  function quitter() {
    onEcouteClic(null);
    onConsigne(null);
    onScene(null, { surligner: false, cadrer: 'region' });
    onQuitter();
  }
  const md = (t: string) => marked.parse(t, { async: false }) as string;
  const rubriqueTexte = (q: Question) => (q.type === 'fiche' ? q.fiche.sections.find((s) => s.titre === q.rubrique)?.markdown ?? '' : '');
</script>

<section class="quiz">
  <header>
    <h3>Quiz</h3>
    <button class="chip" onclick={quitter}>Quitter</button>
  </header>

  {#if etape === 'reglages'}
    <h4>Type de questions</h4>
    <div class="choix">
      {#each MODES as m (m.id)}
        <button class="chip" class:on={modes.includes(m.id)} title={m.aide} onclick={() => (modes = basculer(modes, m.id))}>{m.nom}</button>
      {/each}
    </div>
    {#if modes.includes('identifier')}
      <label class="option"><input type="checkbox" bind:checked={reponseLibre} /> Identifier : réponse tapée (au lieu du QCM)</label>
    {/if}

    <h4>Systèmes <small>(aucun = tous)</small></h4>
    <div class="choix">
      {#each systemesQuiz as s (s.id)}
        <button class="chip" class:on={filtres.systemes.includes(s.id)} onclick={() => (filtres.systemes = basculer(filtres.systemes, s.id))}>
          <span class="pastille" style:background={s.couleur}></span>{s.nom}
        </button>
      {/each}
    </div>
    <h4>Régions <small>(aucune = toutes)</small></h4>
    <div class="choix">
      {#each regionsQuiz as r (r.id)}
        <button class="chip" class:on={filtres.regions.includes(r.id)} onclick={() => (filtres.regions = basculer(filtres.regions, r.id))}>{r.nom}</button>
      {/each}
    </div>
    <label class="option"><input type="checkbox" bind:checked={filtres.listePerso} /> Seulement ma liste ({progression.liste.length} structure{progression.liste.length > 1 ? 's' : ''})</label>
    <label class="option">Questions par séance
      <select class="chip" bind:value={taille}>{#each [10, 20, 30, 50] as n (n)}<option value={n}>{n}</option>{/each}</select>
    </label>

    <p class="resume">{possibles.length} questions possibles · <b>{nbDues}</b> à réviser · {nbNouvelles} nouvelles
      {#if modes.includes('coupe') && !scanner}<br /><small>(les questions de coupes seront comptées au démarrage)</small>{/if}</p>
    <button class="btn principal" disabled={!modes.length || (!possibles.length && !modes.includes('coupe'))} onclick={commencer}>Commencer</button>
    <p class="petit">Répétition espacée (FSRS) : ce que tu rates revient vite, ce que tu sais s'espace. Ta progression est enregistrée sur cet appareil.</p>

  {:else if etape === 'question' && question}
    <div class="avancement"><span>Question {position + 1}/{file.length}</span><span>{score.bonnes}/{score.total} bonnes</span></div>
    <div class="barre"><div style:width="{(position / file.length) * 100}%"></div></div>

    {#if question.type === 'identifier'}
      <p class="enonce">Quelle est la structure surlignée sur le modèle ?</p>
      {#if question.options}
        <div class="options">
          {#each question.options as o (o)}
            <button class="option-qcm" class:bonne={resultat && o === question.cible.nom} class:fausse={resultat && o === choixFait && o !== question.cible.nom}
              disabled={!!resultat} onclick={() => repondreQcm(o)}>{o}</button>
          {/each}
        </div>
      {:else}
        <form onsubmit={(e) => { e.preventDefault(); repondreSaisie(); }}>
          <input class="saisie" bind:value={saisie} disabled={!!resultat} placeholder="Nom de la structure (avec le côté)" autocomplete="off" spellcheck="false" />
          <button class="btn" disabled={!!resultat || !saisie.trim()}>Valider</button>
        </form>
      {/if}
    {:else if question.type === 'pointer'}
      <p class="enonce">Clique sur : <b>{question.cible.nom}</b></p>
      <p class="petit">Tu peux tourner et zoomer le modèle avant de cliquer.</p>
    {:else if question.type === 'fiche'}
      <p class="enonce"><span class="rubrique">{question.rubrique}</span><br /><b>{question.fiche.titre}</b></p>
      {#if question.qcm}
        <div class="options">
          {#each question.qcm.options as o (o)}
            <button class="option-qcm" class:bonne={resultat && o === question.qcm.bonne} class:fausse={resultat && o === choixFait && o !== question.qcm.bonne}
              disabled={!!resultat} onclick={() => repondreQcm(o)}>{o}</button>
          {/each}
        </div>
      {:else if !revele}
        <p class="petit">Récite la réponse dans ta tête (ou sur papier), puis vérifie.</p>
        <button class="btn" onclick={() => (revele = true)}>Afficher la réponse</button>
      {:else}
        <div class="reponse">{@html md(rubriqueTexte(question))}</div>
        <p class="petit">Comment ça s'est passé ?</p>
        <div class="notes">
          <button class="chip mauvais" onclick={() => autoEvaluer(Rating.Again)}>À revoir</button>
          <button class="chip" onclick={() => autoEvaluer(Rating.Hard)}>Difficile</button>
          <button class="chip" onclick={() => autoEvaluer(Rating.Good)}>Bien</button>
          <button class="chip" onclick={() => autoEvaluer(Rating.Easy)}>Facile</button>
        </div>
      {/if}
      {#if question.fiche.statut === 'a-verifier'}<p class="petit">⚠ Fiche encore « à vérifier » avec ton cours.</p>{/if}
    {:else if question.type === 'coupe' && scanner}
      <p class="enonce">Quelle structure est surlignée sur cette coupe ?</p>
      <QuizCoupe index={scanner} orientation="axiale" fichier={question.fichier} cible={question.label} reveler={!!resultat} />
      <div class="options">
        {#each question.options as o (o)}
          <button class="option-qcm" class:bonne={resultat && o === question.bonne} class:fausse={resultat && o === choixFait && o !== question.bonne}
            disabled={!!resultat} onclick={() => repondreQcm(o)}>{o}</button>
        {/each}
      </div>
    {/if}

    {#if resultat}
      <p class="resultat" class:ok={resultat.correct}>{resultat.message}</p>
      <button class="btn principal" onclick={suivante}>{position + 1 < file.length ? 'Question suivante' : 'Voir le bilan'}</button>
    {:else if !(question.type === 'fiche' && !question.qcm)}
      <button class="chip" onclick={jeNeSaisPas}>Je ne sais pas</button>
    {/if}

  {:else if etape === 'fin'}
    <p class="bilan"><b>{score.bonnes}/{score.total}</b> bonnes réponses</p>
    <p class="petit">Les questions ratées reviendront dans les prochaines séances ; les autres s'espacent.</p>
    <button class="btn principal" onclick={() => (etape = 'reglages')}>Nouvelle séance</button>
  {:else}
    <p class="petit">Aucune question à poser avec ces réglages.</p>
    <button class="btn" onclick={() => (etape = 'reglages')}>Retour</button>
  {/if}
</section>

<style>
  .quiz { display: grid; gap: 10px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h3 { font: 600 22px/1.15 var(--serif); margin: 0; }
  h4 { font-size: 12px; color: var(--acc); text-transform: uppercase; letter-spacing: 0.04em; margin: 6px 0 0; }
  h4 small { color: var(--mut); text-transform: none; letter-spacing: 0; font-weight: 400; }
  .choix { display: flex; flex-wrap: wrap; gap: 6px; }
  .pastille { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .option { display: flex; align-items: center; gap: 8px; font-size: 13.5px; }
  .option input { accent-color: var(--acc); }
  .resume { font-size: 14px; margin: 4px 0 0; }
  .principal { justify-content: center; background: var(--acc); color: var(--acc-ink); border-color: var(--acc); font-weight: 600; }
  .principal:disabled { background: var(--pan2); color: var(--mut); border-color: var(--line); }
  .petit { font-size: 12.5px; color: var(--mut); margin: 0; }
  .avancement { display: flex; justify-content: space-between; font-size: 13px; color: var(--mut); }
  .barre { height: 4px; background: var(--pan2); border-radius: 2px; overflow: hidden; }
  .barre div { height: 100%; background: var(--acc); transition: width 0.2s; }
  .enonce { font-size: 17px; margin: 4px 0; }
  .rubrique { font-size: 12px; color: var(--acc); text-transform: uppercase; letter-spacing: 0.04em; }
  .options { display: grid; gap: 6px; }
  .option-qcm { text-align: left; min-height: 44px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--pan2); font-size: 14px; }
  .option-qcm:not(:disabled):hover { border-color: var(--acc); }
  .option-qcm.bonne { background: #173a28; border-color: var(--good); }
  .option-qcm.fausse { background: #3d1b1b; border-color: var(--bad); }
  form { display: flex; gap: 6px; }
  .saisie { flex: 1; height: 40px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); padding: 0 10px; font-size: 16px; }
  .reponse { background: var(--pan2); border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; font-size: 14px; }
  .reponse :global(p), .reponse :global(li) { margin: 4px 0; }
  .reponse :global(ul) { padding-left: 18px; }
  .notes { display: flex; flex-wrap: wrap; gap: 6px; }
  .mauvais { border-color: var(--bad); }
  .resultat { margin: 0; padding: 8px 12px; border-radius: 8px; background: #3d1b1b; border: 1px solid var(--bad); }
  .resultat.ok { background: #173a28; border-color: var(--good); }
  .bilan { font-size: 20px; margin: 8px 0 0; }
</style>
