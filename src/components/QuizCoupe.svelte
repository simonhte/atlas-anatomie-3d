<script lang="ts">
  // Coupe de scanner pour le quiz : une structure est surlignée en ambre,
  // sans aucune étiquette (il faut la reconnaître).
  import { FENETRES, tableFenetre, type IndexScanner, type Orientation } from '../lib/scanner';

  let { index, orientation, fichier, cible, reveler = false }: {
    index: IndexScanner;
    orientation: Orientation;
    fichier: string;
    /** n° de la structure à surligner */
    cible: number;
    /** après la réponse : contour plus marqué */
    reveler?: boolean;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();
  const o = $derived(index.orientations[orientation]);
  const BASE = $derived(`${import.meta.env.BASE_URL}coupes/${index.patient}/`);

  async function pixels(url: string) {
    const bmp = await createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  }

  $effect(() => {
    const f = fichier, or = orientation, id = cible, fort = reveler;
    Promise.all([pixels(`${BASE}${or}/${f}.jpg`), pixels(`${BASE}${or}/${f}.png`)]).then(([g, e]) => {
      if (!canvas) return;
      const table = tableFenetre(FENETRES[0]);
      canvas.width = o.largeur; canvas.height = o.hauteur;
      const ctx = canvas.getContext('2d')!;
      const img = ctx.createImageData(o.largeur, o.hauteur);
      for (let i = 0; i < o.largeur * o.hauteur; i++) {
        const v = table[g[4 * i]];
        const dedans = e[4 * i] === id;
        img.data[4 * i] = dedans ? v * 0.4 + 140 : v;
        img.data[4 * i + 1] = dedans ? v * 0.4 + (fort ? 110 : 95) : v;
        img.data[4 * i + 2] = dedans ? v * 0.4 + 20 : v;
        img.data[4 * i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
  });
</script>

<div class="coupe" style:aspect-ratio="{o.largeur} / {o.hauteur}">
  <canvas bind:this={canvas} aria-label="Coupe de scanner : structure surlignée à reconnaître"></canvas>
  <span class="d">D</span><span class="g">G</span>
</div>

<style>
  .coupe { position: relative; width: 100%; background: #000; border-radius: 8px; overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  span { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--acc); font-weight: 600; }
  .d { left: 6px; } .g { right: 6px; }
</style>
