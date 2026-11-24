// Test automatique du mode hors ligne avec Google Chrome (sans fenêtre) :
// 1) ouvre la version construite, attend l'installation du service worker ;
// 2) télécharge tout via le bouton « Hors ligne » ;
// 3) coupe le réseau, recharge, et vérifie que l'app et les modèles s'affichent.
// Usage : npm run build && npm run preview (dans un autre terminal), puis
//         node outils/tester-hors-ligne.mjs
import { chromium } from 'playwright-core';
import { appendFileSync } from 'node:fs';

const URL_APP = process.argv[2] ?? 'http://localhost:4173/';
const navigateur = await chromium.launch({ channel: 'chrome', headless: true });
const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 800 } });
const page = await contexte.newPage();
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));

await page.goto(URL_APP);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 60000 });
console.log('✓ service worker actif');
await page.waitForFunction(() => window.__atlas?.viewer && document.querySelector('canvas'), null, { timeout: 60000 });

await page.getByRole('button', { name: 'Utiliser sans connexion' }).click();
await page.getByRole('button', { name: /^Télécharger/ }).click();
await page.getByText("C'est prêt", { exact: false }).waitFor({ timeout: 300000 });
console.log('✓ téléchargement complet :', await page.locator('.groupes').innerText().then((t) => t.replace(/\s+/g, ' ')));
await page.getByRole('button', { name: 'Fermer' }).first().click();

await contexte.setOffline(true);
await page.reload();
await page.waitForFunction(() => !document.body.innerText.includes('Chargement des modèles'), null, { timeout: 60000 });
await page.waitForTimeout(3000);
const n = await page.evaluate(() => window.__atlas.viewer.maillages.size);
console.log(`✓ hors ligne : page rechargée, ${n} maillages affichés`);
await page.screenshot({ path: process.argv[3] ?? 'hors-ligne.png' });
// une coupe de scanner hors ligne
const coupe = await page.evaluate(async () => (await fetch('./coupes/s1371/axiale/100.jpg')).status).catch((e) => String(e));
console.log('✓ coupe de scanner hors ligne :', coupe);
// mise à jour : on simule une nouvelle version (sw.js modifié) → bandeau « Mettre à jour »
if (process.argv[4]) {
  await contexte.setOffline(false);
  appendFileSync(process.argv[4], `\n// test ${Date.now()}\n`);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.getByText('Une nouvelle version').waitFor({ timeout: 60000 });
  await Promise.all([page.waitForEvent('load', { timeout: 60000 }), page.getByRole('button', { name: 'Mettre à jour' }).click()]);
  console.log('✓ mise à jour proposée puis appliquée (page rechargée)');
}
console.log(erreurs.length ? `Erreurs : ${erreurs.join('\n')}` : '✓ aucune erreur dans la console');
await navigateur.close();
