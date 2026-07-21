#!/usr/bin/env node
// Producteur des fixtures DERIVEES du vendorage (iakaframe/specs/instructions/garde-vendor-check-cross-repo.md § 4.5).
//
// SYMETRIE : `iakaframe vendor-check` CONSTATE cote iakaframe ; ce script REPARE cote GUI. Le geste
// reste CONSCIENT et EXPLICITE — jamais de synchronisation automatique.
//
// POURQUOI CE SCRIPT EXISTE. Les fixtures methode / methode-wrapped / team ne sont PAS des copies :
// ce sont des formes canoniques SERIALISEES. Les re-vendorer par `cp` depuis le canon detruirait la
// forme sur laquelle methodMd.test.ts et teamMd.test.ts sont batis. Les serialiseurs
// (`serializeMethodMd`, `serializeTeamMd`) n'existaient que comme fonctions de bibliotheque, SANS
// point d'entree : prescrire « regenerez par le serialiseur » sans commande faisait retomber
// l'operateur sur la copie, exactement le geste interdit.
//
// IL IMPORTE LES SERIALISEURS, IL NE LES REECRIT PAS. Les porter cote CLI creerait une SECONDE
// SOURCE DE VERITE sur le format — la faute meme que la methode condamne.
//
// CE QU'IL REGENERE : le FRONTMATTER, depuis le canon iakaframe courant.
// CE QU'IL PRESERVE : le CORPS de chaque fixture, verbatim. Le corps des derivees est un stub
// redige a la main (`# La compagnie iakaframe (casting des 8)` n'est PAS le titre du canon) ; il
// est exempte par la garde, et l'ecraser avec le titre du canon serait une regression silencieuse.
//
// Usage :  node packages/core/scripts/gen-fixtures.mjs  [--canon <chemin iakaframe>] [--check]
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

// Le coeur est du TypeScript a imports « style bundler » (sans extension) : Node sait retirer les
// types (v22.18+) mais pas resoudre `./workflow`. Ce hook comble le seul ecart, sans dependance.
registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (e) {
      if (spec.startsWith('.') && !path.extname(spec)) return next(spec + '.ts', ctx);
      throw e;
    }
  },
});

const {
  parseMethodMd, serializeMethodMd,
  parseTeamMd, serializeTeamMd,
  readListLayout,
} = await import('../src/frontmatter.ts');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUI = path.join(HERE, '..', '..', '..');              // racine iakaFrameGUI
const FIXTURES = path.join(GUI, 'packages', 'core', '__tests__', 'fixtures');

// --- Resolution du canon iakaframe (§ 4.1 en sens inverse) ------------------------------------
// Meme logique que vendor-check : override d'environnement AUTORITAIRE (jamais de repli silencieux
// sur un autre depot que celui explicitement designe), puis depots voisins sous le meme chapeau.
// Un candidat n'est retenu que s'il porte le DOUBLE MARQUEUR library/ + methods/.
function isCanonRoot(p) {
  try {
    return fs.existsSync(path.join(p, 'library')) && fs.existsSync(path.join(p, 'methods'));
  } catch { return false; }
}

function resolveCanon(explicit) {
  const override = explicit || process.env.IAKAFRAME_HOME;
  if (override && String(override).trim() !== '') {
    const p = path.resolve(String(override).trim());
    if (!isCanonRoot(p)) {
      throw new Error(`canon iakaframe invalide (library/ + methods/ attendus) : ${p}`);
    }
    return p;
  }
  for (const c of [path.resolve(GUI, '..', 'iakaframe'), path.resolve(GUI, '..', 'iakaFrame')]) {
    if (isCanonRoot(c)) return c;
  }
  throw new Error(
    'depot iakaframe introuvable. Passez --canon <chemin> ou definissez IAKAFRAME_HOME.',
  );
}

// Corps VERBATIM d'un document a frontmatter : tout ce qui suit le `---` fermant, sans rien
// stripper (la ligne blanche de tete et le \n final font partie du fichier).
function verbatimBody(text) {
  const norm = String(text).replace(/^\uFEFF/, '');
  if (!norm.startsWith('---\n')) return norm;
  const end = norm.indexOf('\n---\n', 3);
  return end < 0 ? '' : norm.slice(end + 5);
}

// Corps de la fixture existante ; a defaut (fixture absente), le titre du canon comme amorce.
function bodyFor(fixtureFile, canonRaw) {
  if (fs.existsSync(fixtureFile)) return verbatimBody(fs.readFileSync(fixtureFile, 'utf8'));
  const first = verbatimBody(canonRaw).split('\n').find((l) => l.startsWith('# '));
  return (first || '# (corps a rediger)') + '\n';
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const ci = argv.indexOf('--canon');
  const canon = resolveCanon(ci >= 0 ? argv[ci + 1] : null);

  const methodRaw = fs.readFileSync(path.join(canon, 'methods', 'iakaframe.md'), 'utf8');
  const teamRaw = fs.readFileSync(path.join(canon, 'teams', 'iakaframe-8.md'), 'utf8');

  const method = parseMethodMd(methodRaw);
  const team = parseTeamMd(teamRaw);
  if (!method) throw new Error('methods/iakaframe.md illisible (parseMethodMd a rendu null)');
  if (!team) throw new Error('teams/iakaframe-8.md illisible (parseTeamMd a rendu null)');

  const targets = [
    {
      file: path.join(FIXTURES, 'method.iakaframe.md'),
      // Forme canonique MONO-LIGNE (aucun layout) : byte-identique au rendu CLI.
      render: (body) => serializeMethodMd(method, body),
    },
    {
      file: path.join(FIXTURES, 'method.iakaframe-wrapped.md'),
      // Variante WRAPPEE : restitue la decoupe en lignes du canon. C'est sa seule raison d'exister
      // (prouver que le parseur absorbe un frontmatter re-wrappe) — la copier la detruirait.
      render: (body) => serializeMethodMd(method, body, readListLayout(methodRaw)),
    },
    {
      file: path.join(FIXTURES, 'team.iakaframe-8.md'),
      render: (body) => serializeTeamMd(team, body),
    },
  ];

  let changed = 0;
  for (const t of targets) {
    const raw = t.render(bodyFor(t.file, t.file.includes('team.') ? teamRaw : methodRaw));
    const before = fs.existsSync(t.file) ? fs.readFileSync(t.file, 'utf8') : null;
    const rel = path.relative(GUI, t.file);
    if (before === raw) { process.stdout.write(`  = ${rel}\n`); continue; }
    changed++;
    if (check) { process.stdout.write(`  ! ${rel} (a regenerer)\n`); continue; }
    fs.writeFileSync(t.file, raw);
    process.stdout.write(`  > ${rel}\n`);
  }

  process.stdout.write(`canon : ${canon}\n`);
  if (check) {
    process.stdout.write(changed
      ? `gen-fixtures --check : ${changed} fixture(s) derivee(s) hors canon.\n`
      : 'gen-fixtures --check : les 3 derivees sont a jour.\n');
    if (changed) process.exitCode = 1;
    return;
  }
  process.stdout.write(`gen-fixtures : ${changed} fixture(s) reecrite(s) sur 3.\n`);
  process.stdout.write(
    'Rappel : le kit (kit.iakaframe-claude.md) ne passe PAS par ce script, et les 17 copies\n'
    + 'se re-vendorent par cp. Etat complet : iakaframe vendor-check\n',
  );
}

main();
