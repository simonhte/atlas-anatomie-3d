<script lang="ts">
  // Page « Crédits et licences ». Les attributions ci-dessous sont exigées
  // par les licences des modèles et bibliothèques utilisés : ne pas les retirer.
  let { onFermer }: { onFermer: () => void } = $props();
</script>

<div class="fond" role="presentation" onclick={onFermer}></div>
<div class="fenetre" role="dialog" aria-modal="true" aria-labelledby="titre-credits">
  <button class="fermer" aria-label="Fermer" onclick={onFermer}>✕</button>
  <h2 id="titre-credits">Crédits et licences</h2>

  <h3>Modèles anatomiques 3D</h3>
  <p>
    <b>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</b><br />
    Source : <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noopener">BodyParts3D (DBCLS, LSDB Archive)</a>,
    version 4.0 (2013). Licence : <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank" rel="noopener">CC BY 4.0</a>.
    DOI : 10.18908/lsdba.nbdc00837-000.
  </p>
  <p class="petit">
    Modifications apportées : conversion OBJ → glTF, changement de repère (mm → m, axe vertical Y),
    simplification (niveau « léger »), quantification et compression meshopt, regroupement par système
    et région, noms français et latins ajoutés. Les en-têtes des fichiers OBJ d'origine mentionnent
    encore l'ancienne licence CC BY-SA 2.1 Japon ; la licence en vigueur publiée par le DBCLS
    (mise à jour du 27/02/2025) est la CC BY 4.0.
  </p>
  <p class="petit">
    Référence : Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K.
    <i>BodyParts3D: 3D structure database for anatomical concepts.</i> Nucleic Acids Res. 2009;37:D782–D785.
  </p>

  <h3>Contenu des fiches</h3>
  <p class="petit">
    Fiches rédigées pour ce projet à partir du programme d'anatomie de DFGSM2. Elles sont marquées
    « à vérifier » tant qu'elles n'ont pas été relues contre le cours : elles ne remplacent pas le cours
    de la faculté.
  </p>

  <h3>Logiciels libres</h3>
  <ul class="petit">
    <li><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> — licence MIT</li>
    <li><a href="https://github.com/gkjohnson/three-mesh-bvh" target="_blank" rel="noopener">three-mesh-bvh</a> — licence MIT</li>
    <li><a href="https://github.com/zeux/meshoptimizer" target="_blank" rel="noopener">meshoptimizer</a> — licence MIT</li>
    <li><a href="https://gltf-transform.dev" target="_blank" rel="noopener">glTF Transform</a> — licence MIT</li>
    <li><a href="https://svelte.dev" target="_blank" rel="noopener">Svelte</a> et <a href="https://vite.dev" target="_blank" rel="noopener">Vite</a> — licence MIT</li>
    <li><a href="https://marked.js.org" target="_blank" rel="noopener">marked</a> — licence MIT</li>
    <li>Polices <a href="https://github.com/IBM/plex" target="_blank" rel="noopener">IBM Plex</a> — SIL Open Font License 1.1</li>
  </ul>
  <p class="petit">Les identifiants de structures proviennent de la Foundational Model of Anatomy (FMA, University of Washington).</p>
</div>

<style>
  .fond { position: fixed; inset: 0; background: #000a; z-index: 30; }
  .fenetre {
    position: fixed; z-index: 31; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(640px, calc(100vw - 24px)); max-height: calc(100dvh - 40px); overflow: auto;
    background: var(--pan); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px;
  }
  h2 { font: 600 22px/1.2 var(--serif); margin: 0 0 8px; }
  h3 { font-size: 13px; color: var(--acc); text-transform: uppercase; letter-spacing: 0.04em; margin: 18px 0 6px; }
  p { margin: 6px 0; }
  .petit { font-size: 13.5px; color: #c5d0d6; }
  ul { padding-left: 18px; }
  a { color: var(--acc); }
  .fermer { position: absolute; right: 12px; top: 12px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--pan2); }
</style>
