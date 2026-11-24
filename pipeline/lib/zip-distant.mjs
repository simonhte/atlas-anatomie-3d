// Lecture d'une archive ZIP distante sans la télécharger entièrement :
// on lit l'index (« répertoire central ») à la fin du fichier, puis on ne
// récupère que les fichiers voulus, par requêtes HTTP partielles (Range).
import { inflateRawSync } from 'node:zlib';

// Certains serveurs refusent les requêtes sans identification du client.
const ENTETES = { 'User-Agent': 'atlas-anatomie-pipeline/1.0' };

export class ZipDistant {
  constructor(url) { this.url = url; this.telecharge = 0; }

  async plage(debut, fin, essai = 0) {
    const rep = await fetch(this.url, { headers: { ...ENTETES, Range: `bytes=${debut}-${fin}` } });
    // Trop de requêtes : on attend (délai indiqué par le serveur, sinon croissant) puis on réessaie
    if ((rep.status === 429 || rep.status >= 500) && essai < 8) {
      const attente = Number(rep.headers.get('retry-after')) || 5 * 2 ** essai;
      process.stdout.write(`(serveur occupé, nouvel essai dans ${attente} s) `);
      await new Promise((r) => setTimeout(r, attente * 1000));
      return this.plage(debut, fin, essai + 1);
    }
    if (rep.status !== 206) throw new Error(`Le serveur n'accepte pas les requêtes partielles (HTTP ${rep.status})`);
    const cr = rep.headers.get('content-range');
    if (cr) this.tailleTotale = Number(cr.split('/')[1]);
    const b = Buffer.from(await rep.arrayBuffer());
    this.telecharge += b.length;
    return b;
  }

  async ouvrir() {
    // taille totale lue dans l'en-tête Content-Range d'une requête d'un octet
    await this.plage(0, 0);
    this.taille = this.tailleTotale;
    const fin = await this.plage(Math.max(0, this.taille - 70000), this.taille - 1);
    const base = this.taille - fin.length;
    let eocd = -1;
    for (let i = fin.length - 22; i >= 0; i--) if (fin.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Fin de répertoire ZIP introuvable');
    let nb = fin.readUInt16LE(eocd + 10), taille = fin.readUInt32LE(eocd + 12), offset = fin.readUInt32LE(eocd + 16);
    // ZIP64 (archives > 4 Go ou > 65 535 fichiers)
    const loc = eocd - 20;
    if (loc >= 0 && fin.readUInt32LE(loc) === 0x07064b50) {
      const pos64 = Number(fin.readBigUInt64LE(loc + 8));
      const e64 = pos64 >= base ? fin.subarray(pos64 - base) : await this.plage(pos64, pos64 + 56);
      nb = Number(e64.readBigUInt64LE(32)); taille = Number(e64.readBigUInt64LE(40)); offset = Number(e64.readBigUInt64LE(48));
    }
    const rep = offset >= base ? fin.subarray(offset - base, offset - base + taille) : await this.plage(offset, offset + taille - 1);
    this.entrees = new Map();
    let p = 0;
    for (let k = 0; k < nb; k++) {
      if (rep.readUInt32LE(p) !== 0x02014b50) throw new Error('Répertoire central corrompu');
      const methode = rep.readUInt16LE(p + 10);
      let comp = rep.readUInt32LE(p + 20), brut = rep.readUInt32LE(p + 24);
      const ln = rep.readUInt16LE(p + 28), lx = rep.readUInt16LE(p + 30), lc = rep.readUInt16LE(p + 32);
      let local = rep.readUInt32LE(p + 42);
      const nom = rep.toString('utf8', p + 46, p + 46 + ln);
      // champs étendus ZIP64
      let x = p + 46 + ln;
      const finX = x + lx;
      while (x < finX) {
        const id = rep.readUInt16LE(x), t = rep.readUInt16LE(x + 2);
        if (id === 1) {
          let q = x + 4;
          if (brut === 0xffffffff) { brut = Number(rep.readBigUInt64LE(q)); q += 8; }
          if (comp === 0xffffffff) { comp = Number(rep.readBigUInt64LE(q)); q += 8; }
          if (local === 0xffffffff) { local = Number(rep.readBigUInt64LE(q)); q += 8; }
        }
        x += 4 + t;
      }
      this.entrees.set(nom, { methode, comp, brut, local });
      p = finX + lc;
    }
    return this;
  }

  /** Contenu (décompressé) d'un fichier de l'archive. */
  async lire(nom) {
    const e = this.entrees.get(nom);
    if (!e) throw new Error(`Absent de l'archive : ${nom}`);
    const tete = await this.plage(e.local, e.local + 29);
    const debut = e.local + 30 + tete.readUInt16LE(26) + tete.readUInt16LE(28);
    const donnees = e.comp ? await this.plage(debut, debut + e.comp - 1) : Buffer.alloc(0);
    return e.methode === 0 ? donnees : inflateRawSync(donnees);
  }
}
