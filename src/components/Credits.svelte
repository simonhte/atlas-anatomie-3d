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

  <p>
    <b>Z-Anatomy – The libre 3D atlas of anatomy – CC BY-SA 4.0</b>, lui-même dérivé de
    « BodyParts3D – The Database Center for Life Science ».<br />
    Source : <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noopener">Z-Anatomy (GitHub)</a>.
    Licence : <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
  </p>
  <p class="petit">
    Structures issues de Z-Anatomy (absentes de BodyParts3D) : coccyx, cartilages costaux 8 à 10,
    grand dorsal, droit de l'abdomen, pyramidal, oblique interne, transverse de l'abdomen, carré des lombes,
    muscles masticateurs (temporal, masséter, ptérygoïdiens), muscles de la face, court extenseur des orteils,
    interosseux dorsaux du pied. Modifications : export depuis Blender, recalage sur le repère de
    BodyParts3D, conversion glTF, simplification et compression. Conformément à la licence CC BY-SA,
    ces modèles dérivés sont redistribués sous la même licence CC BY-SA 4.0. Les éléments de Z-Anatomy
    sous licence non commerciale (oreille interne, rein) ne sont pas utilisés.
  </p>

  <p>
    <b>HRA 3D Reference Object Library – HuBMAP (Human BioMolecular Atlas Program)</b>, modèle féminin
    du Visible Human Project, licence <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank" rel="noopener">CC BY 4.0</a>.
    Source : <a href="https://github.com/hubmapconsortium/ccf-3d-reference-object-library" target="_blank" rel="noopener">hubmapconsortium/ccf-3d-reference-object-library</a>.
  </p>
  <p class="petit">
    Structures issues de HuBMAP : utérus, vagin, ovaires, trompes utérines, ligaments de l'utérus et des ovaires.
    Modifications : recalage sur le bassin du modèle masculin (position approximative), conversion et compression.
  </p>
  <p class="petit">
    Nerfs (Z-Anatomy) : plexus brachial, nerfs des membres, nerfs crâniens… ; poumons, glande thyroïde, thymus,
    moelle spinale. Noms français et latins des vaisseaux, nerfs et organes : table de la Terminologia Anatomica 2
    fournie par Z-Anatomy (CC BY-SA 4.0), complétée par des traductions automatiques signalées dans les fiches.
  </p>

  <h3>Coupes de scanner</h3>
  <p class="petit">
    Scanner et segmentations du patient s1371 du jeu de données <b>TotalSegmentator</b> (version 2), licence
    <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank" rel="noopener">CC BY 4.0</a> —
    <a href="https://doi.org/10.5281/zenodo.8367169" target="_blank" rel="noopener">Zenodo 10.5281/zenodo.8367169</a>.
    Wasserthal J. et al., <i>TotalSegmentator: Robust Segmentation of 104 Anatomic Structures in CT Images</i>,
    Radiology: Artificial Intelligence, 2023. Modifications : coupes tous les 3 mm, densités compressées sur 8 bits,
    noms des structures traduits en français.
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
    <li><a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener">ts-fsrs</a> (algorithme de répétition espacée FSRS) — licence MIT</li>
    <li><a href="https://github.com/jpeg-js/jpeg-js" target="_blank" rel="noopener">jpeg-js</a> (fabrication des coupes) — licence BSD-3-Clause</li>
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
