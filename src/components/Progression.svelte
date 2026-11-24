<script lang="ts">
  // Tableau de bord : progression par système et par région, export / import
  // d'un fichier pour passer d'un appareil à l'autre.
  import { SYSTEMES, REGIONS, nomRegion, nomSysteme } from '../lib/data';
  import { bilanPar, estDue, estMaitrisee, fusionner, progressionVide, valider, type Progression } from '../lib/progression';
  import type { CartePossible } from '../lib/quiz';

  let { progression, possibles, onRemplacer, onFermer }: {
    progression: Progression;
    /** Toutes les cartes possibles (tous modes, sans filtre) */
    possibles: CartePossible[];
    onRemplacer: (p: Progression) => void;
    onFermer: () => void;
  } = $props();

  const maintenant = new Date();
  const vues = $derived(Object.values(progression.cartes));
  const total = $derived({
    vues: vues.length,
    maitrisees: vues.filter((e) => estMaitrisee(e)).length,
    dues: vues.filter((e) => estDue(e, maintenant)).length,
  });
  const semaine = $derived(progression.journal.filter((j) => maintenant.getTime() - new Date(j.t).getTime() < 7 * 86400000));
  const tauxSemaine = $derived(semaine.length ? Math.round((100 * semaine.filter((j) => j.ok).length) / semaine.length) : null);
  const parSysteme = $derived(bilanPar(progression, possibles.map((c) => ({ id: c.id, groupe: c.meta.systeme })), maintenant));
  const parRegion = $derived(bilanPar(progression, possibles.map((c) => ({ id: c.id, groupe: c.meta.region })), maintenant));
  const ordreSys = (k: string) => SYSTEMES.findIndex((s) => s.id === k);
  const ordreReg = (k: string) => REGIONS.findIndex((r) => r.id === k);
  // Structures les plus ratées
  const difficiles = $derived(vues.filter((e) => e.echecs > 0).sort((a, b) => b.echecs / b.vues - a.echecs / a.vues || b.echecs - a.echecs).slice(0, 8));

  let message = $state('');
  function exporter() {
    const blob = new Blob([JSON.stringify(progression)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `atlas-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    message = 'Fichier enregistré dans tes téléchargements.';
  }
  async function importer(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const autre = valider(JSON.parse(await f.text()));
      onRemplacer(fusionner(progression, autre));
      message = `Progression importée et fusionnée (${Object.keys(autre.cartes).length} cartes dans le fichier).`;
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    (e.target as HTMLInputElement).value = '';
  }
  function reinitialiser() {
    if (confirm('Effacer toute ta progression sur cet appareil ? (Pense à exporter avant.) Cette action est définitive.')) {
      onRemplacer(progressionVide());
      message = 'Progression effacée.';
    }
  }
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
</script>

<div class="fond" role="presentation" onclick={onFermer}></div>
<div class="fenetre" role="dialog" aria-modal="true" aria-labelledby="titre-progression">
  <button class="fermer" aria-label="Fermer" onclick={onFermer}>✕</button>
  <h2 id="titre-progression">Ma progression</h2>

  <div class="tuiles">
    <div><b>{total.dues}</b><span>à réviser aujourd'hui</span></div>
    <div><b>{total.vues}</b><span>questions vues</span></div>
    <div><b>{total.maitrisees}</b><span>maîtrisées (≥ 21 j)</span></div>
    <div><b>{tauxSemaine ?? '–'}{tauxSemaine !== null ? ' %' : ''}</b><span>réussite sur 7 jours</span></div>
  </div>

  {#each [['Par système', parSysteme, ordreSys, nomSysteme], ['Par région', parRegion, ordreReg, nomRegion]] as [titre, bilan, ordre, nom] (titre)}
    <h3>{titre}</h3>
    <table>
      <thead><tr><th></th><th>Vues</th><th>Maîtrise</th><th>Réussite</th><th>À revoir</th></tr></thead>
      <tbody>
        {#each [...(bilan as Map<string, { total: number; vues: number; maitrisees: number; dues: number; taux: number | null }>).entries()].sort((a, b) => (ordre as (k: string) => number)(a[0]) - (ordre as (k: string) => number)(b[0])) as [k, b] (k)}
          <tr>
            <td>{(nom as (k: string) => string)(k)}</td>
            <td>{b.vues}/{b.total}</td>
            <td>
              <div class="jauge" title={`${b.maitrisees} maîtrisées, ${b.vues} vues sur ${b.total}`}>
                <div class="vu" style:width="{pct(b.vues, b.total)}%"></div>
                <div class="maitrise" style:width="{pct(b.maitrisees, b.total)}%"></div>
              </div>
            </td>
            <td>{b.taux === null ? '–' : `${Math.round(b.taux * 100)} %`}</td>
            <td>{b.dues || ''}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}

  {#if difficiles.length}
    <h3>Les plus difficiles pour toi</h3>
    <ul class="difficiles">
      {#each difficiles as e (e.meta.libelle + e.meta.type)}
        <li>{e.meta.libelle} <small>({e.echecs} erreur{e.echecs > 1 ? 's' : ''} / {e.vues})</small></li>
      {/each}
    </ul>
  {/if}

  <h3>Sauvegarde</h3>
  <p class="petit">Ta progression est enregistrée sur cet appareil. Pour passer du Mac à la tablette : exporte le fichier,
    envoie-le-toi (AirDrop, mail…), puis importe-le sur l'autre appareil. Les deux progressions sont fusionnées.</p>
  <div class="rangee">
    <button class="btn" onclick={exporter}>Exporter un fichier</button>
    <label class="btn">Importer un fichier<input type="file" accept="application/json,.json" onchange={importer} hidden /></label>
    <button class="btn danger" onclick={reinitialiser}>Tout effacer</button>
  </div>
  {#if message}<p class="message">{message}</p>{/if}
</div>

<style>
  .fond { position: fixed; inset: 0; background: #000a; z-index: 30; }
  .fenetre { position: fixed; z-index: 31; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(680px, calc(100vw - 24px)); max-height: calc(100dvh - 40px); overflow: auto; background: var(--pan); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; }
  h2 { font: 600 22px/1.2 var(--serif); margin: 0 0 12px; }
  h3 { font-size: 13px; color: var(--acc); text-transform: uppercase; letter-spacing: 0.04em; margin: 18px 0 6px; }
  .fermer { position: absolute; right: 12px; top: 12px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--pan2); }
  .tuiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
  .tuiles div { background: var(--pan2); border: 1px solid var(--line); border-radius: 10px; padding: 10px; display: grid; }
  .tuiles b { font-size: 24px; }
  .tuiles span { font-size: 12.5px; color: var(--mut); }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th { text-align: left; color: var(--mut); font-weight: 500; font-size: 12px; padding: 4px 6px; }
  td { padding: 4px 6px; border-top: 1px solid var(--line); }
  td:first-child { white-space: nowrap; }
  .jauge { position: relative; height: 8px; background: var(--bg); border-radius: 4px; min-width: 90px; overflow: hidden; }
  .jauge div { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
  .vu { background: #2f5561; }
  .maitrise { background: var(--good); }
  .difficiles { padding-left: 18px; margin: 0; font-size: 14px; }
  .difficiles small { color: var(--mut); }
  .petit { font-size: 13px; color: var(--mut); margin: 0 0 8px; }
  .rangee { display: flex; flex-wrap: wrap; gap: 8px; }
  label.btn { cursor: pointer; }
  .danger { border-color: #6b2d2d; color: #f3b0b0; }
  .message { font-size: 13.5px; color: var(--acc); }
</style>
