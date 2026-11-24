// Visualiseur 3D : scène Three.js, caméra, chargement des paquets GLB,
// sélection au clic / au doigt, survol, masquage, opacité, rayons X, vues.
//
// Le visualiseur ne connaît que des identifiants de maillages (FJxxxx).
// Les noms, fiches et arborescence sont gérés par l'interface (Svelte).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { DISSECTION_INITIALE, estDisseque, type Dissection } from '../dissection';

// Accélère le lancer de rayons (sélection) avec une hiérarchie de volumes englobants
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;


export type NomVue = 'ant' | 'post' | 'latd' | 'latg' | 'sup' | 'inf';
export type Lod = 'lo' | 'hi';

export interface EtatAffichage {
  /** Maillages masqués */
  masques: string[];
  /** Opacité par système (0–1) */
  opacites: Record<string, number>;
  /** Systèmes affichés */
  systemesVisibles: Record<string, boolean>;
  rayonsX: boolean;
  selection: string | null;
  /** Dissection par couches (globale et par région) */
  dissection: Dissection;
}

/** Métadonnées utiles au visualiseur pour la dissection */
export interface MetaMaillage { couche: number; region: string }

export interface Ancre {
  id: string;
  x: number;
  y: number;
  /** Taille apparente à l'écran (px), pour prioriser les étiquettes */
  taille: number;
}

const ACCENT = new THREE.Color('#4fd1e0');
const AMBRE = new THREE.Color('#e8b45a');

interface InfoMaillage {
  mesh: THREE.Mesh;
  systeme: string;
  couleur: THREE.Color;
  /** Point d'ancrage de l'étiquette (sommet du maillage le plus proche du centre), repère local */
  ancre: THREE.Vector3;
  rayon: number;
}

export class Viewer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  private loader = new GLTFLoader();
  private maillages = new Map<string, InfoMaillage>();
  private racine = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private etat: EtatAffichage = { masques: [], opacites: {}, systemesVisibles: {}, rayonsX: false, selection: null, dissection: DISSECTION_INITIALE };
  private meta = new Map<string, MetaMaillage>();
  /** Structures mises en évidence temporairement (ex. « ce que recouvre ce muscle ») */
  private evidence = new Set<string>();
  private survol: string | null = null;
  private aRendre = true;
  private anim: { t0: number; duree: number; de: [THREE.Vector3, THREE.Vector3]; vers: [THREE.Vector3, THREE.Vector3] } | null = null;
  private observateur: ResizeObserver;
  private boite = new THREE.Box3();
  /** Plans de coupe actifs (appliqués aux matériaux des structures uniquement) */
  private plans: THREE.Plane[] = [];
  /** Plan repère translucide (position de la coupe de scanner) */
  private repere: THREE.Group | null = null;

  /** Appelé à chaque rendu (pour repositionner les étiquettes) */
  onRendu: (() => void) | null = null;
  /** Survol à la souris : id du maillage et position du pointeur */
  onSurvol: ((id: string | null, x: number, y: number) => void) | null = null;
  /** Clic / appui : id du maillage touché (null = dans le vide) */
  onClic: ((id: string | null, x: number, y: number) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, private conteneur: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    // Limiter la résolution sur téléphone : gros gain de performance
    const mobile = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
    this.camera.position.set(0, 1, 5);

    // Éclairage sobre : lumière d'ambiance + « scialytique » qui suit la caméra
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4650, 1.1));
    const frontale = new THREE.DirectionalLight(0xffffff, 1.6);
    frontale.position.set(0.3, 0.5, 1);
    this.camera.add(frontale);
    this.scene.add(this.camera);
    this.scene.add(this.racine);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 8;
    this.controls.zoomToCursor = true;
    // Au doigt : 1 doigt = tourner, 2 doigts = pincer pour zoomer + déplacer
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', () => this.demanderRendu());

    // Les GLB sont compressés avec meshopt (voir pipeline/03-construire-glb.mjs)
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.raycaster.firstHitOnly = true;
    this.installerPointeur();

    this.observateur = new ResizeObserver(() => this.redimensionner());
    this.observateur.observe(conteneur);
    this.redimensionner();
    this.boucle();
  }

  // ------------------------------------------------------------------ chargement

  /**
   * Charge un paquet GLB. Si le paquet est déjà chargé dans un autre niveau de
   * détail, on remplace seulement les géométries (la sélection, l'opacité… sont conservées).
   */
  async chargerPaquet(url: string, systeme: string, couleurs: Record<string, string> = {}): Promise<void> {
    const gltf = await this.loader.loadAsync(url);
    gltf.scene.updateMatrixWorld(true);
    const nouveaux: THREE.Mesh[] = [];
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) nouveaux.push(o as THREE.Mesh);
    });
    for (const m of nouveaux) {
      // GLTFLoader nomme les nœuds d'après le GLB : « FJ3259 »
      const id = (m.name || m.parent?.name || '').replace(/_\d+$/, '');
      const existant = this.maillages.get(id);
      m.geometry.computeBoundsTree();
      if (existant) {
        // Remplacement du niveau de détail
        existant.mesh.geometry.disposeBoundsTree();
        existant.mesh.geometry.dispose();
        existant.mesh.geometry = m.geometry;
        existant.mesh.matrix.copy(m.matrixWorld);
        existant.mesh.matrixWorld.copy(m.matrixWorld);
        continue;
      }
      const src = m.material as THREE.MeshStandardMaterial;
      const couleur = couleurs[id] ? new THREE.Color(couleurs[id]) : src.color.clone();
      const mat = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.68, metalness: 0, transparent: false, side: this.plans.length ? THREE.DoubleSide : THREE.FrontSide });
      mat.clippingPlanes = this.plans;
      // Remplissage des surfaces coupées : quand un plan de coupe ouvre une
      // structure, on voit l'intérieur (faces arrière) ; on le peint d'une
      // teinte unie, plus sombre, pour donner l'aspect d'une section pleine.
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          '#include <dithering_fragment>\n  if (!gl_FrontFacing) gl_FragColor = vec4(diffuseColor.rgb * 0.6, 1.0);',
        );
      };
      mat.customProgramCacheKey = () => 'atlas-coupe';
      const mesh = new THREE.Mesh(m.geometry, mat);
      mesh.name = id;
      // On fige la transformation (quantification meshopt) dans la matrice
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(m.matrixWorld);
      mesh.matrixWorld.copy(m.matrixWorld);
      mesh.userData.id = id;
      this.racine.add(mesh);
      this.maillages.set(id, { mesh, systeme, couleur, ...this.calculerAncre(m.geometry) });
    }
    this.racine.updateMatrixWorld(true);
    this.boite.setFromObject(this.racine);
    this.appliquerEtat();
  }

  /** Sommet le plus proche du centre de la boîte : un point SUR la structure. */
  private calculerAncre(g: THREE.BufferGeometry) {
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const c = g.boundingBox!.getCenter(new THREE.Vector3());
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    let best = Infinity;
    const ancre = new THREE.Vector3();
    const pas = Math.max(1, Math.floor(p.count / 2000));
    for (let i = 0; i < p.count; i += pas) {
      v.fromBufferAttribute(p, i);
      const d = v.distanceToSquared(c);
      if (d < best) { best = d; ancre.copy(v); }
    }
    return { ancre, rayon: g.boundingSphere!.radius };
  }

  get nombreMaillages() { return this.maillages.size; }
  aMaillage(id: string) { return this.maillages.has(id); }

  // ------------------------------------------------------------------ état d'affichage

  setEtat(e: EtatAffichage) {
    this.etat = e;
    this.appliquerEtat();
  }

  /** Couche et région de chaque maillage (pour la dissection). */
  setMeta(meta: Map<string, MetaMaillage>) {
    this.meta = meta;
    this.appliquerEtat();
  }

  /** Met en évidence (couleur ambre) un ensemble de structures ; [] pour effacer. */
  mettreEnEvidence(ids: string[]) {
    this.evidence = new Set(ids);
    this.appliquerEtat();
  }

  /** Visible = système affiché, non masqué, non retiré par la dissection. */
  private visibleSelonEtat(id: string, info: InfoMaillage, masques: Set<string>) {
    if (this.etat.systemesVisibles[info.systeme] === false || masques.has(id)) return false;
    const m = this.meta.get(id);
    // La structure sélectionnée reste visible même si sa couche est retirée
    if (m && id !== this.etat.selection && estDisseque(m.couche, m.region, this.etat.dissection)) return false;
    return true;
  }

  private appliquerEtat() {
    const masques = new Set(this.etat.masques);
    for (const [id, info] of this.maillages) {
      const mat = info.mesh.material as THREE.MeshStandardMaterial;
      const sel = id === this.etat.selection;
      info.mesh.visible = this.visibleSelonEtat(id, info, masques);
      let op = this.etat.opacites[info.systeme] ?? 1;
      // Rayons X : tout devient translucide sauf la sélection
      // (les structures mises en évidence restent opaques, comme la sélection)
      if (this.etat.rayonsX && !sel && !this.evidence.has(id)) op = Math.min(op, 0.18);
      const transparent = op < 0.999;
      if (mat.transparent !== transparent) mat.needsUpdate = true;
      mat.transparent = transparent;
      mat.opacity = op;
      mat.depthWrite = !transparent;
      info.mesh.renderOrder = transparent ? 1 : 0;
      mat.color.copy(info.couleur);
      if (sel) {
        mat.emissive.copy(ACCENT).multiplyScalar(0.45);
        mat.color.lerp(ACCENT, 0.35);
      } else if (this.evidence.has(id)) {
        mat.emissive.copy(AMBRE).multiplyScalar(0.4);
        mat.color.lerp(AMBRE, 0.3);
      } else if (id === this.survol) {
        mat.emissive.copy(ACCENT).multiplyScalar(0.18);
      } else {
        mat.emissive.setRGB(0, 0, 0);
      }
    }
    this.demanderRendu();
  }

  // ------------------------------------------------------------------ pointeur

  private installerPointeur() {
    let depart: { x: number; y: number; t: number; id: number } | null = null;
    let nbPointeurs = 0;
    let rafSurvol = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      nbPointeurs++;
      depart = nbPointeurs === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null;
      this.anim = null; // l'utilisateur reprend la main
    });
    const fin = (e: PointerEvent) => {
      nbPointeurs = Math.max(0, nbPointeurs - 1);
      if (!depart || depart.id !== e.pointerId) return;
      const bouge = Math.hypot(e.clientX - depart.x, e.clientY - depart.y);
      const duree = performance.now() - depart.t;
      depart = null;
      // Un « clic » = peu de mouvement et appui court (sinon c'était une rotation)
      if (bouge < 8 && duree < 500 && e.button === 0) this.onClic?.(this.pick(e.clientX, e.clientY), e.clientX, e.clientY);
    };
    this.canvas.addEventListener('pointerup', fin);
    this.canvas.addEventListener('pointercancel', () => { nbPointeurs = 0; depart = null; });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      cancelAnimationFrame(rafSurvol);
      const { clientX: x, clientY: y } = e;
      rafSurvol = requestAnimationFrame(() => {
        const id = this.pick(x, y);
        if (id !== this.survol) {
          this.survol = id;
          this.appliquerEtat();
          this.canvas.style.cursor = id ? 'pointer' : 'grab';
        }
        this.onSurvol?.(id, x, y);
      });
    });
    this.canvas.addEventListener('pointerleave', () => {
      if (this.survol) { this.survol = null; this.appliquerEtat(); }
      this.onSurvol?.(null, 0, 0);
    });
  }

  /** Maillage visible sous le point écran (x, y), ou null. */
  pick(x: number, y: number): string | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const cibles = [...this.maillages.values()].filter((i) => i.mesh.visible).map((i) => i.mesh);
    // on ignore les points retirés par les plans de coupe
    const hits = this.raycaster.intersectObjects(cibles, false).filter((h) => this.plans.every((p) => p.distanceToPoint(h.point) >= 0));
    // En rayons X, on privilégie ce qui n'est pas quasi transparent
    const hit = hits.find((h) => ((h.object as THREE.Mesh).material as THREE.Material).opacity > 0.3) ?? hits[0];
    return hit ? (hit.object.userData.id as string) : null;
  }

  // ------------------------------------------------------------------ caméra et vues

  /** Boîte englobante d'un ensemble de maillages (tous les visibles par défaut). */
  boiteDe(ids?: string[]): THREE.Box3 {
    const b = new THREE.Box3();
    for (const [id, info] of this.maillages) {
      if (ids ? !ids.includes(id) : !info.mesh.visible) continue;
      info.mesh.geometry.computeBoundingBox();
      b.union(info.mesh.geometry.boundingBox!.clone().applyMatrix4(info.mesh.matrixWorld));
    }
    return b.isEmpty() ? this.boite.clone() : b;
  }

  /** Oriente la caméra selon une vue anatomique, en cadrant `ids` (ou tout le corps). */
  vue(nom: NomVue, ids?: string[]) {
    const b = this.boiteDe(ids);
    const centre = b.getCenter(new THREE.Vector3());
    const taille = b.getSize(new THREE.Vector3());
    const dir: Record<NomVue, [number, number, number]> = {
      ant: [0, 0, 1], post: [0, 0, -1],
      latd: [-1, 0, 0], // côté droit du sujet = x négatif
      latg: [1, 0, 0],
      // Vues sup./inf. : léger décalage pour que la face antérieure soit en haut de l'écran
      // (OrbitControls exige que camera.up reste l'axe Y)
      sup: [0, 1, -0.01], inf: [0, -1, 0.01],
    };
    const d = new THREE.Vector3(...dir[nom]).normalize();
    // Distance pour que la plus grande dimension visible tienne dans l'écran
    // Dimensions de la boîte vues depuis la caméra (largeur écran × hauteur écran)
    const [larg, haut] = nom === 'sup' || nom === 'inf' ? [taille.x, taille.z]
      : nom === 'ant' || nom === 'post' ? [taille.x, taille.y] : [taille.z, taille.y];
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    // Distance pour que la boîte tienne en hauteur ET en largeur, avec 15 % de marge
    // (et un peu plus en haut pour les boutons de vue qui recouvrent la scène)
    const dist = 1.15 * Math.max(haut / 2 / t / 0.85, larg / 2 / (t * this.camera.aspect));
    this.allerA(centre.clone().addScaledVector(d, Math.max(dist, 0.15)), centre);
  }

  /** Cadre une structure en gardant la direction de vue actuelle. */
  cadrer(ids: string[]) {
    const b = this.boiteDe(ids);
    const centre = b.getCenter(new THREE.Vector3());
    const r = b.getSize(new THREE.Vector3()).length() / 2;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // petites structures : ×3 pour garder le contexte anatomique ; grandes : ×1,6 pour bien les voir
    const marge = r > 0.08 ? 1.6 : 3;
    const dist = Math.max(0.15, (r * marge) / Math.sin(fov / 2) / Math.min(1, this.camera.aspect));
    const d = this.camera.position.clone().sub(this.controls.target).normalize();
    this.allerA(centre.clone().addScaledVector(d, dist), centre);
  }

  private allerA(pos: THREE.Vector3, cible: THREE.Vector3) {
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.anim = {
      t0: performance.now(),
      duree: reduit ? 1 : 650,
      de: [this.camera.position.clone(), this.controls.target.clone()],
      vers: [pos, cible],
    };
    this.demanderRendu();
  }

  /**
   * Structures que recouvre un maillage, vues depuis la caméra : on lance des
   * rayons depuis la caméra vers des points de sa surface, et on note la
   * première structure touchée JUSTE DERRIÈRE lui. Renvoie les ids triés par
   * surface recouverte (nombre de rayons), sans le maillage lui-même.
   */
  structuresRecouvertes(id: string, maxPoints = 400): { id: string; part: number }[] {
    const info = this.maillages.get(id);
    if (!info) return [];
    const pos = info.mesh.geometry.attributes.position;
    const pas = Math.max(1, Math.floor(pos.count / maxPoints));
    const cibles = [...this.maillages.values()].filter((i) => i.mesh.visible && i.mesh !== info.mesh).map((i) => i.mesh);
    const compte = new Map<string, number>();
    const p = new THREE.Vector3(), dir = new THREE.Vector3();
    let total = 0;
    for (let i = 0; i < pos.count; i += pas) {
      p.fromBufferAttribute(pos, i).applyMatrix4(info.mesh.matrixWorld);
      const dist = p.distanceTo(this.camera.position);
      dir.copy(p).sub(this.camera.position).normalize();
      this.raycaster.set(this.camera.position, dir);
      // on ne garde que ce qui est derrière la surface du muscle (pas devant)
      const hit = this.raycaster.intersectObjects(cibles, false).find((h) => h.distance > dist - 0.002);
      total++;
      if (hit) compte.set(hit.object.userData.id, (compte.get(hit.object.userData.id) ?? 0) + 1);
    }
    return [...compte.entries()]
      .map(([k, n]) => ({ id: k, part: n / Math.max(1, total) }))
      .filter((x) => x.part >= 0.02)
      .sort((a, b) => b.part - a.part);
  }

  /**
   * Plus petite distance (pixels) entre un point de l'écran et la surface visible
   * d'un ensemble de maillages (sommets échantillonnés) : sert à tolérer un clic
   * « presque » sur une structure fine (nerf, vaisseau).
   */
  distanceEcran(ids: string[], x: number, y: number): number {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    let min = Infinity;
    for (const id of ids) {
      const info = this.maillages.get(id);
      if (!info || !info.mesh.visible) continue;
      const p = info.mesh.geometry.attributes.position;
      const pas = Math.max(1, Math.floor(p.count / 3000));
      for (let i = 0; i < p.count; i += pas) {
        v.fromBufferAttribute(p, i).applyMatrix4(info.mesh.matrixWorld).project(this.camera);
        if (v.z > 1) continue;
        const sx = r.left + ((v.x + 1) / 2) * r.width, sy = r.top + ((1 - v.y) / 2) * r.height;
        min = Math.min(min, Math.hypot(sx - x, sy - y));
      }
    }
    return min;
  }

  // ------------------------------------------------------------------ coupes

  /** Boîte englobante de tout le modèle (pour les curseurs de coupe). */
  get boiteModele(): THREE.Box3 { return this.boite.clone(); }

  /**
   * Plans de coupe. Pour chaque plan : axe, position (m) et sens. Par défaut on
   * GARDE la partie située du côté des valeurs basses (sous un plan axial,
   * derrière un plan coronal, à droite du sujet pour un plan sagittal) ;
   * `inverser` garde l'autre côté.
   */
  setCoupes(liste: { axe: 'x' | 'y' | 'z'; position: number; inverser?: boolean }[]) {
    const n = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
    // plan.distanceToPoint(p) >= 0 => point conservé
    this.plans = liste.map((c) => (c.inverser
      ? new THREE.Plane(n[c.axe].clone(), -c.position)
      : new THREE.Plane(n[c.axe].clone().negate(), c.position)));
    for (const info of this.maillages.values()) {
      const mat = info.mesh.material as THREE.MeshStandardMaterial;
      mat.clippingPlanes = this.plans;
      const cote = this.plans.length ? THREE.DoubleSide : THREE.FrontSide;
      if (mat.side !== cote) { mat.side = cote; mat.needsUpdate = true; }
    }
    this.demanderRendu();
  }

  /** Affiche (ou retire avec null) un plan repère translucide à une position donnée. */
  setRepere(r: { axe: 'x' | 'y' | 'z'; valeur: number } | null) {
    if (this.repere) { this.scene.remove(this.repere); this.repere = null; }
    if (r) {
      const t = this.boite.getSize(new THREE.Vector3()).multiplyScalar(1.15);
      const c = this.boite.getCenter(new THREE.Vector3());
      const [l, h] = r.axe === 'y' ? [t.x, t.z] : r.axe === 'z' ? [t.x, t.y] : [t.z, t.y];
      const geo = new THREE.PlaneGeometry(l, h);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: ACCENT })));
      g.position.copy(c);
      if (r.axe === 'y') { g.rotation.x = -Math.PI / 2; g.position.y = r.valeur; }
      else if (r.axe === 'z') g.position.z = r.valeur;
      else { g.rotation.y = Math.PI / 2; g.position.x = r.valeur; }
      g.renderOrder = 2;
      this.repere = g;
      this.scene.add(g);
    }
    this.demanderRendu();
  }

  // ------------------------------------------------------------------ étiquettes

  /** Positions écran des points d'ancrage des maillages visibles (pour les étiquettes). */
  ancres(ids?: Iterable<string>, max = 40): Ancre[] {
    const cand: (Ancre & { monde: THREE.Vector3; dist: number })[] = [];
    const w = this.conteneur.clientWidth, h = this.conteneur.clientHeight;
    const liste = ids ? [...ids] : [...this.maillages.keys()];
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    for (const id of liste) {
      const info = this.maillages.get(id);
      if (!info || !info.mesh.visible) continue;
      const monde = info.ancre.clone().applyMatrix4(info.mesh.matrixWorld);
      const dist = monde.distanceTo(this.camera.position);
      const v = monde.clone().project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      const echelle = info.mesh.matrixWorld.getMaxScaleOnAxis();
      const taille = ((info.rayon * echelle) / (dist * Math.tan(fov / 2))) * h;
      cand.push({ id, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, taille, monde, dist });
    }
    // On ne garde que les plus grandes à l'écran, puis on élimine celles dont le
    // point d'ancrage est caché par une autre structure opaque.
    cand.sort((a, b) => b.taille - a.taille);
    const cibles = [...this.maillages.values()]
      .filter((i) => i.mesh.visible && (i.mesh.material as THREE.Material).opacity > 0.5)
      .map((i) => i.mesh);
    const res: Ancre[] = [];
    const dir = new THREE.Vector3();
    for (const c of cand) {
      if (res.length >= max) break;
      dir.copy(c.monde).sub(this.camera.position).normalize();
      this.raycaster.set(this.camera.position, dir);
      const hit = this.raycaster.intersectObjects(cibles, false)[0];
      if (hit && hit.object.userData.id !== c.id && hit.distance < c.dist - 0.003) continue;
      res.push({ id: c.id, x: c.x, y: c.y, taille: c.taille });
    }
    return res;
  }

  // ------------------------------------------------------------------ rendu

  demanderRendu() { this.aRendre = true; }

  private redimensionner() {
    const w = this.conteneur.clientWidth, h = this.conteneur.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.demanderRendu();
  }

  private boucle = () => {
    requestAnimationFrame(this.boucle);
    if (this.anim) {
      const t = Math.min(1, (performance.now() - this.anim.t0) / this.anim.duree);
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
      this.camera.position.lerpVectors(this.anim.de[0], this.anim.vers[0], k);
      this.controls.target.lerpVectors(this.anim.de[1], this.anim.vers[1], k);
      this.camera.lookAt(this.controls.target);
      if (t >= 1) this.anim = null;
      this.aRendre = true;
    }
    // update() renvoie true tant que l'inertie fait bouger la caméra
    if (this.controls.update()) this.aRendre = true;
    if (!this.aRendre) return; // rendu « à la demande » : économise la batterie
    this.aRendre = false;
    this.renderer.render(this.scene, this.camera);
    this.onRendu?.();
  };

  /** Capture d'écran (pour les tests visuels). */
  capture(): string {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  detruire() {
    this.observateur.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
