// Historique annuler / rétablir.
// On enregistre des « instantanés » de l'état d'affichage (structures masquées,
// opacités, sélection…). Annuler revient à l'instantané précédent.

export class Historique<T> {
  private passe: T[] = [];
  private futur: T[] = [];

  constructor(private limite = 100) {}

  /** À appeler AVANT de modifier l'état, avec l'état courant. */
  enregistrer(etat: T): void {
    this.passe.push(structuredClone(etat));
    if (this.passe.length > this.limite) this.passe.shift();
    this.futur = [];
  }

  /** Renvoie l'état à restaurer, ou null s'il n'y a rien à annuler. */
  annuler(etatCourant: T): T | null {
    const e = this.passe.pop();
    if (e === undefined) return null;
    this.futur.push(structuredClone(etatCourant));
    return e;
  }

  retablir(etatCourant: T): T | null {
    const e = this.futur.pop();
    if (e === undefined) return null;
    this.passe.push(structuredClone(etatCourant));
    return e;
  }

  get peutAnnuler() { return this.passe.length > 0; }
  get peutRetablir() { return this.futur.length > 0; }
}
