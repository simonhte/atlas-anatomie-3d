<script lang="ts">
  // « Coupe scanner » : vraies images de scanner (TotalSegmentator) en coupes
  // axiales, coronales ou sagittales, avec fenêtres de densité, nom de la
  // structure sous le pointeur, annotations, et repère sur le modèle 3D.
  import { onMount } from 'svelte';
  import { FENETRES, positionModele, tableFenetre, type IndexScanner, type Orientation } from '../lib/scanner';

  let { onSelection, onRepere, onFermer }: {
    /** Clic sur une structure annotée */
    onSelection: (lien: string, cote: 'g' | 'd' | null) => void;
    /** Position du plan correspondant sur le modèle 3D (null à la fermeture) ; couper = couper le modèle à ce niveau */
    onRepere: (r: { axe: 'x' | 'y' | 'z'; valeur: number } | null, couper: boolean) => void;
    onFermer: () => void;
  } = $props();

  const BASE = `${import.meta.env.BASE_URL}coupes/s1371/`;
  let index = $state<IndexScanner | null>(null);
  let erreur = $state('');
  let orientation: Orientation = $state('axiale');
  let numero = $state(0);
  let fenetre = $state(0);
  let annotations = $state(true);
  let couper = $state(false);
  let survol: { nom: string; x: number; y: number } | null = $state(null);

  let canvas = $state<HTMLCanvasElement>();
  let calque = $state<HTMLCanvasElement>();
  let gris: Uint8ClampedArray | null = null; // valeurs stockées (8 bits)
  let etiq: Uint8ClampedArray | null = null; // n° de structure par pixel
  let survolId = 0;

  const o = $derived(index ? index.orientations[orientation] : null);
  const coupe = $derived(o ? o.coupes[Math.min(numero, o.coupes.length - 1)] : null);
  const parId = $derived(new Map((index?.structures ?? []).map((s) => [s.id, s] as const)));

  onMount(() => {
    fetch(`${BASE}index.json`).then((r) => r.json()).then((j: IndexScanner) => {
      index = j;
      numero = Math.floor(j.orientations.axiale.coupes.length * 0.62); // niveau du foie environ
    }).catch((e) => (erreur = String(e)));
    return () => onRepere(null, false);
  });

  /** Lit une image sans gestion des couleurs (valeurs de pixels exactes). */
  async function pixels(url: string): Promise<{ data: Uint8ClampedArray; l: number; h: number }> {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    const un = new Uint8ClampedArray(bmp.width * bmp.height);
    for (let i = 0; i < un.length; i++) un[i] = d[4 * i];
    return { data: un, l: bmp.width, h: bmp.height };
  }

  // Chargement de la coupe courante
  let jeton = 0;
  $effect(() => {
    if (!coupe || !o) return;
    const j = ++jeton;
    const f = coupe.f, or = orientation;
    Promise.all([pixels(`${BASE}${or}/${f}.jpg`), pixels(`${BASE}${or}/${f}.png`)]).then(([g, e]) => {
      if (j !== jeton) return; // une autre coupe a été demandée entre-temps
      gris = g.data; etiq = e.data;
      dessiner();
    });
  });
  // Fenêtre, annotations, survol : redessin
  $effect(() => { void fenetre; void annotations; dessiner(); });
  // Repère sur le modèle 3D
  $effect(() => { if (index && coupe) onRepere(positionModele(index, orientation, coupe.mm), couper); });

  function dessiner() {
    if (!gris || !etiq || !o || !canvas) return;
    const table = tableFenetre(FENETRES[fenetre]);
    canvas.width = o.largeur; canvas.height = o.hauteur;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(o.largeur, o.hauteur);
    for (let i = 0; i < gris.length; i++) {
      let v = table[gris[i]];
      let r = v, g = v, b = v;
      if (survolId && etiq[i] === survolId) { r = v * 0.5 + 40; g = v * 0.5 + 105; b = v * 0.5 + 112; } // teinte cyan
      img.data[4 * i] = r; img.data[4 * i + 1] = g; img.data[4 * i + 2] = b; img.data[4 * i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    dessinerAnnotations();
  }

  function dessinerAnnotations() {
    if (!calque || !o || !coupe) return;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    calque.width = r.width * devicePixelRatio; calque.height = r.height * devicePixelRatio;
    const ctx = calque.getContext('2d')!;
    ctx.clearRect(0, 0, calque.width, calque.height);
    if (!annotations) return;
    const k = (r.width / o.largeur) * devicePixelRatio;
    ctx.font = `${12 * devicePixelRatio}px "IBM Plex Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const places: [number, number, number, number][] = [];
    // les plus grandes structures d'abord ; on saute celles qui chevaucheraient
    for (const [id, x, y] of [...coupe.s].sort((a, b) => b[3] - a[3]).slice(0, 18)) {
      const s = parId.get(id);
      if (!s) continue;
      const l = ctx.measureText(s.fr).width + 8 * devicePixelRatio, h = 16 * devicePixelRatio;
      // étiquette maintenue à l'intérieur de l'image
      const tx = Math.min(Math.max(x * k, l / 2), calque.width - l / 2), ty = Math.min(Math.max(y * k, h / 2), calque.height - h / 2);
      const boite: [number, number, number, number] = [tx - l / 2, ty - h / 2, tx + l / 2, ty + h / 2];
      if (places.some((b) => !(boite[2] < b[0] || boite[0] > b[2] || boite[3] < b[1] || boite[1] > b[3]))) continue;
      places.push(boite);
      ctx.fillStyle = '#0e1418c8';
      ctx.fillRect(boite[0], boite[1], l, h);
      ctx.fillStyle = '#e8f6f8';
      ctx.fillText(s.fr, tx, ty);
    }
  }

  function position(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * (o?.largeur ?? 1));
    const y = Math.floor(((e.clientY - r.top) / r.height) * (o?.hauteur ?? 1));
    return { x, y, id: etiq && o && x >= 0 && y >= 0 && x < o.largeur && y < o.hauteur ? etiq[y * o.largeur + x] : 0, rx: e.clientX - r.left, ry: e.clientY - r.top };
  }
  function bouger(e: PointerEvent) {
    const p = position(e);
    const s = p.id ? parId.get(p.id) : null;
    survol = s ? { nom: s.fr, x: p.rx, y: p.ry } : null;
    if (p.id !== survolId) { survolId = p.id; dessiner(); }
  }
  function cliquer(e: PointerEvent) {
    const p = position(e);
    const s = p.id ? parId.get(p.id) : null;
    if (s) onSelection(s.lien, s.cote);
  }
  function molette(e: WheelEvent) {
    if (!o) return;
    e.preventDefault();
    numero = Math.max(0, Math.min(o.coupes.length - 1, numero + (e.deltaY > 0 ? 1 : -1)));
  }
  function changerOrientation(x: Orientation) {
    if (!index) return;
    orientation = x;
    numero = Math.floor(index.orientations[x].coupes.length / 2);
  }
  function touche(e: KeyboardEvent) {
    if (!o) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { numero = Math.min(o.coupes.length - 1, numero + 1); e.preventDefault(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { numero = Math.max(0, numero - 1); e.preventDefault(); }
  }
</script>

<section class="scanner" aria-label="Coupe de scanner">
  <header>
    <div class="onglets" role="tablist">
      {#each [['axiale', 'Axiale'], ['coronale', 'Coronale'], ['sagittale', 'Sagittale']] as [v, n] (v)}
        <button class="chip" role="tab" aria-selected={orientation === v} class:on={orientation === v} onclick={() => changerOrientation(v as Orientation)}>{n}</button>
      {/each}
    </div>
    <button class="fermer" aria-label="Fermer la coupe scanner" onclick={onFermer}>✕</button>
  </header>

  {#if erreur}
    <p class="erreur">Impossible de charger les coupes : {erreur}</p>
  {:else if !o || !coupe}
    <p class="petit">Chargement des coupes…</p>
  {:else}
    <div class="image" tabindex="0" role="slider" aria-valuemin={1} aria-valuemax={o.coupes.length} aria-valuenow={numero + 1}
      aria-label={`Coupe ${orientation} (flèches pour changer de niveau)`}
      onwheel={molette} onkeydown={touche} style:aspect-ratio="{o.largeur} / {o.hauteur}">
      <canvas bind:this={canvas} onpointermove={bouger} onpointerleave={() => { survol = null; survolId = 0; dessiner(); }} onpointerup={cliquer}></canvas>
      <canvas class="calque" bind:this={calque}></canvas>
      {#if survol}<div class="bulle" style:left="{survol.x + 12}px" style:top="{survol.y + 8}px">{survol.nom}</div>{/if}
      <span class="repere d">{orientation === 'sagittale' ? 'A' : 'D'}</span>
      <span class="repere g">{orientation === 'sagittale' ? 'P' : 'G'}</span>
    </div>
    <div class="ligne">
      <input type="range" min="0" max={o.coupes.length - 1} bind:value={numero} aria-label="Niveau de coupe" />
      <span class="num">{numero + 1}/{o.coupes.length}</span>
    </div>
    <div class="ligne options">
      {#each FENETRES as f, i (f.nom)}
        <button class="chip" class:on={fenetre === i} onclick={() => (fenetre = i)}>{f.nom}</button>
      {/each}
    </div>
    <div class="ligne options">
      <label><input type="checkbox" bind:checked={annotations} /> Annotations</label>
      <label><input type="checkbox" bind:checked={couper} /> Couper le modèle 3D à ce niveau</label>
    </div>
    <p class="petit">
      Scanner réel (homme de 70 ans, sans pathologie, des cuisses à C6) — TotalSegmentator, CC BY 4.0.
      Ce n'est pas le même corps que le modèle 3D : le plan bleu montre le niveau correspondant (calé sur les vertèbres).
      Molette ou flèches : changer de coupe. Clic sur une structure : sa fiche.
    </p>
  {/if}
</section>

<style>
  .scanner {
    position: absolute; z-index: 4; left: 10px; top: 10px; bottom: 10px; width: min(480px, 58%);
    background: #0b1014f2; border: 1px solid var(--line); border-radius: 12px; padding: 10px; overflow: auto;
    display: flex; flex-direction: column; gap: 8px; box-shadow: 0 10px 30px #0009;
  }
  header { display: flex; align-items: center; justify-content: space-between; }
  .onglets { display: flex; gap: 6px; }
  .fermer { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--line); background: var(--pan2); }
  .image { position: relative; width: 100%; background: #000; border-radius: 6px; overflow: hidden; outline: none; }
  .image:focus-visible { outline: 2px solid var(--acc); }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: auto; touch-action: none; cursor: crosshair; }
  .calque { pointer-events: none; }
  .bulle { position: absolute; pointer-events: none; background: #000c; border: 1px solid var(--line); padding: 3px 8px; border-radius: 6px; font-size: 13px; white-space: nowrap; }
  .repere { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--acc); font-weight: 600; pointer-events: none; }
  .repere.d { left: 6px; }
  .repere.g { right: 6px; }
  .ligne { display: flex; align-items: center; gap: 8px; }
  .ligne input[type='range'] { flex: 1; accent-color: var(--acc); }
  .num { font-size: 12.5px; color: var(--mut); min-width: 56px; text-align: right; }
  .options { flex-wrap: wrap; }
  .options label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .petit { font-size: 12px; color: var(--mut); margin: 0; }
  .erreur { color: var(--bad); }
  @media (max-width: 900px) { .scanner { left: 0; right: 0; top: 0; bottom: 0; width: auto; border-radius: 0; } }
</style>
