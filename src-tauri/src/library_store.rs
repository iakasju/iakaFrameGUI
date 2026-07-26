//! library_store — I/O de la **bibliothèque `iakaframe`** en fichiers `.md` (un par artefact),
//! sous **pathguard limité à `IAKAFRAME_HOME`**. Calque exact de `teams_store.rs` : Rust est un
//! **passe-plat de texte** — il ne (dé)sérialise PAS le frontmatter (le cœur front tient le
//! schéma, cf. `packages/core/src/frontmatter.ts`). Il lit/écrit des chaînes `.md` opaques sous
//! `<home>/<collection>/<id>.md`, avec :
//!   - `collection` validée ∈ { teams, methods, kits, workflows } (les 4 onglets de la forge,
//!     Q-6 + P6b) ; NB : la collection **éditable** `<home>/workflows/` est **distincte** du pool
//!     d'atomes read-only `<home>/library/workflows/` (`POOL_TYPES`, cf. P6b Q-9) — même nom, deux
//!     espaces séparés au MVP ;
//!   - `id` validé (segment simple, sans séparateur) puis chemin résolu via `pathguard::safe_path`.
//!
//! Aucune notion de runner/modèle, aucun secret, aucun réseau. Les fonctions `*_in(home, …)` sont
//! pures (racine injectée) → testables sur dossier temporaire ; les commandes Tauri résolvent la
//! racine réelle via `paths::resolve_iakaframe_home()`.

use std::path::{Path, PathBuf};

use crate::pathguard::safe_path;
use crate::paths::resolve_iakaframe_home;

/// Extension des fichiers d'artefact de la bibliothèque.
const LIBRARY_EXT: &str = "md";

/// Collections gérées par la forge (les 4 onglets, Q-6 + P6b `workflows`) + `bindings` (G2 :
/// appariement méthode↔team, à plat sous `<home>/bindings/`, chargeable pour « Open frame »).
/// Sous-ensemble du mapping CLI. `workflows` = la collection **éditable** `<home>/workflows/`
/// (P6b) — à ne pas confondre avec le pool d'atomes read-only `<home>/library/workflows/`
/// (`POOL_TYPES`, Q-9).
const COLLECTIONS: [&str; 6] = ["teams", "methods", "kits", "workflows", "bindings", "frames"];

/// Types d'ATOMES du pool `library/<type>/` (référencés par les assemblages, I1). En lecture
/// seule : la forge n'édite pas encore les atomes (E2 différé), mais doit les **scanner** pour
/// vérifier l'intégrité référentielle au Save (miroir `checkRefs` du CLI).
const POOL_TYPES: [&str; 8] = [
    "personas",
    "skills",
    "guardrails",
    "principles",
    "rituals",
    "roles",
    "workflows",
    "scaffolds",
];

/// Valide un type de pool (table d'autorité — refuse tout dossier hors périmètre).
fn validate_pool_type(pool_type: &str) -> Result<(), String> {
    if POOL_TYPES.contains(&pool_type) {
        Ok(())
    } else {
        Err(format!("type de pool invalide : {pool_type}"))
    }
}

/// Valide une collection (table d'autorité — refuse tout dossier hors périmètre).
fn validate_collection(collection: &str) -> Result<(), String> {
    if COLLECTIONS.contains(&collection) {
        Ok(())
    } else {
        Err(format!("collection invalide : {collection}"))
    }
}

/// Valide un id d'artefact : non vide, sans séparateur ni `.`/`..` (calque `validate_team_id`).
fn validate_id(id: &str) -> Result<(), String> {
    let t = id.trim();
    if t.is_empty() {
        return Err("id d'artefact vide".to_string());
    }
    if t == "." || t == ".." {
        return Err("id d'artefact invalide".to_string());
    }
    if t.contains('/') || t.contains('\\') {
        return Err("id d'artefact invalide (séparateur interdit)".to_string());
    }
    Ok(())
}

/// Chemin absolu et validé d'un artefact sous `home` (`<home>/<collection>/<id>.md`).
fn library_file(home: &Path, collection: &str, id: &str) -> Result<PathBuf, String> {
    validate_collection(collection)?;
    validate_id(id)?;
    let rel = Path::new(collection).join(format!("{}.{}", id.trim(), LIBRARY_EXT));
    safe_path(home, &rel).map_err(|e| e.to_string())
}

/// Liste le contenu `.md` brut de chaque artefact de `<home>/<collection>` (dossier absent = `[]`).
/// Trié par nom de fichier (id). Fichiers illisibles ignorés ; le front parse le frontmatter.
pub fn list_in(home: &Path, collection: &str) -> Result<Vec<String>, String> {
    validate_collection(collection)?;
    let dir = home.join(collection);
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(Vec::new()),
    };
    let mut named: Vec<(String, String)> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some(LIBRARY_EXT) {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if let Ok(content) = std::fs::read_to_string(&path) {
            named.push((name, content));
        }
    }
    named.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(named.into_iter().map(|(_, c)| c).collect())
}

/// Lit le contenu `.md` d'un artefact (`None` si le fichier n'existe pas).
pub fn read_in(home: &Path, collection: &str, id: &str) -> Result<Option<String>, String> {
    let file = library_file(home, collection, id)?;
    match std::fs::read_to_string(&file) {
        Ok(content) => Ok(Some(content)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Écrit (ou remplace) l'artefact `<home>/<collection>/<id>.md`. Crée le dossier au besoin.
pub fn write_in(home: &Path, collection: &str, id: &str, text: &str) -> Result<(), String> {
    let file = library_file(home, collection, id)?;
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&file, text).map_err(|e| e.to_string())
}

/// Indique si l'artefact `<home>/<collection>/<id>.md` existe (garde Save As non destructif).
pub fn exists_in(home: &Path, collection: &str, id: &str) -> Result<bool, String> {
    let file = library_file(home, collection, id)?;
    Ok(file.exists())
}

/// Chemin absolu et validé d'un ATOME de pool `<home>/library/<pool_type>/<id>.md` (E2, Lot 5a).
/// Calque exact de `library_file`, réorienté sous `library/<pool>/`. Le pool `skills` (stocké en
/// DOSSIER `<id>/SKILL.md`) est **hors périmètre 5a** : l'écriture y est refusée (le routage vers le
/// sous-dossier est reporté au Lot 5c). Mêmes gardes d'autorité : `validate_pool_type` +
/// `validate_id` + `pathguard::safe_path` (anti-traversée).
fn pool_file(home: &Path, pool_type: &str, id: &str) -> Result<PathBuf, String> {
    validate_pool_type(pool_type)?;
    validate_id(id)?;
    if pool_type == "skills" {
        return Err(
            "écriture du pool `skills` non supportée en 5a (stockage dossier <id>/SKILL.md, voir Lot 5c)"
                .to_string(),
        );
    }
    let rel = Path::new("library")
        .join(pool_type)
        .join(format!("{}.{}", id.trim(), LIBRARY_EXT));
    safe_path(home, &rel).map_err(|e| e.to_string())
}

/// Écrit (ou remplace) l'atome de pool `<home>/library/<pool_type>/<id>.md` (E2, Lot 5a). Calque
/// **exact** de `write_in` : crée le dossier au besoin, mêmes gardes que `pool_file`. Rust reste un
/// passe-plat de texte — la (dé)sérialisation et la préservation non-destructive du frontmatter
/// vivent côté cœur (`packages/core/src/frontmatter.ts` : `patchFrontmatter`/`serializePersonaMd`).
pub fn pool_write_in(home: &Path, pool_type: &str, id: &str, text: &str) -> Result<(), String> {
    let file = pool_file(home, pool_type, id)?;
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&file, text).map_err(|e| e.to_string())
}

/// Indique si l'atome de pool `<home>/library/<pool_type>/<id>.md` existe (garde de création non
/// destructive : refus d'écraser hors intention). `skills` (dossier) → erreur (hors 5a).
pub fn pool_exists_in(home: &Path, pool_type: &str, id: &str) -> Result<bool, String> {
    let file = pool_file(home, pool_type, id)?;
    Ok(file.exists())
}

/// Scanne les **ids** d'atomes présents dans `<home>/library/<pool_type>/` (I1). Dossier absent
/// → `[]`. Fichiers `.md` → stem ; dossiers (kind skill : `<id>/SKILL.md`) → nom du dossier.
pub fn pool_list_in(home: &Path, pool_type: &str) -> Result<Vec<String>, String> {
    validate_pool_type(pool_type)?;
    let dir = home.join("library").join(pool_type);
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(Vec::new()),
    };
    let mut ids: Vec<String> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if name.starts_with('_') || name == "README.md" {
            continue;
        }
        if path.is_dir() {
            // Atome de type « skill » (dossier contenant SKILL.md) : l'id est le nom du dossier.
            if path.join("SKILL.md").exists() {
                ids.push(name);
            }
        } else if path.extension().and_then(|e| e.to_str()) == Some(LIBRARY_EXT) {
            ids.push(name.trim_end_matches(".md").to_string());
        }
    }
    ids.sort();
    Ok(ids)
}

/// Le pool `<home>/library/` existe-t-il ? (Q-4 : pool absent → I1 non vérifiable, warning.)
pub fn pool_present_in(home: &Path) -> bool {
    home.join("library").is_dir()
}

/// Lit le **CONTENU `.md`** de chaque atome du pool `<home>/library/<pool_type>/` (G1 « Open
/// frame » — pendant en contenu de `pool_list_in` qui ne rend que les ids). Dossier absent → `[]`.
/// Trié par id (nom de fichier / dossier). Fichiers `.md` → contenu brut ; atomes « skill »
/// (dossier `<id>/SKILL.md`) → contenu de `SKILL.md`. Ignore `_*` et `README.md` (miroir exact de
/// `pool_list_in`). Fichiers illisibles ignorés ; le front parse le frontmatter (`@iakaframe/core`).
pub fn pool_read_all_in(home: &Path, pool_type: &str) -> Result<Vec<String>, String> {
    validate_pool_type(pool_type)?;
    let dir = home.join("library").join(pool_type);
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(Vec::new()),
    };
    let mut named: Vec<(String, String)> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if name.starts_with('_') || name == "README.md" {
            continue;
        }
        if path.is_dir() {
            // Atome « skill » : l'id est le nom du dossier, le contenu est celui de `SKILL.md`.
            let skill = path.join("SKILL.md");
            if skill.exists() {
                if let Ok(content) = std::fs::read_to_string(&skill) {
                    named.push((name, content));
                }
            }
        } else if path.extension().and_then(|e| e.to_str()) == Some(LIBRARY_EXT) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                named.push((name.trim_end_matches(".md").to_string(), content));
            }
        }
    }
    named.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(named.into_iter().map(|(_, c)| c).collect())
}

/// Lit le contenu `.md` d'UN atome de pool par id (`<home>/library/<type>/<id>.md`, ou
/// `<home>/library/<type>/<id>/SKILL.md` pour un skill). `None` si absent. Pendant unitaire de
/// `pool_read_all_in` (G1). Garde d'autorité : type de pool + id validés (pas de traversée).
pub fn pool_read_in(home: &Path, pool_type: &str, id: &str) -> Result<Option<String>, String> {
    validate_pool_type(pool_type)?;
    validate_id(id)?;
    let id = id.trim();
    let md_rel = Path::new("library")
        .join(pool_type)
        .join(format!("{id}.{LIBRARY_EXT}"));
    let md_path = safe_path(home, &md_rel).map_err(|e| e.to_string())?;
    if md_path.is_file() {
        return match std::fs::read_to_string(&md_path) {
            Ok(content) => Ok(Some(content)),
            Err(e) => Err(e.to_string()),
        };
    }
    let skill_rel = Path::new("library").join(pool_type).join(id).join("SKILL.md");
    let skill_path = safe_path(home, &skill_rel).map_err(|e| e.to_string())?;
    if skill_path.is_file() {
        return match std::fs::read_to_string(&skill_path) {
            Ok(content) => Ok(Some(content)),
            Err(e) => Err(e.to_string()),
        };
    }
    Ok(None)
}

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

/// Scanne les ids d'atomes du pool `library/<type>/` (I1). Racine introuvable → `[]`.
#[tauri::command]
pub fn pool_list(pool_type: String) -> Result<Vec<String>, String> {
    match resolve_iakaframe_home() {
        Some(home) => pool_list_in(&home, &pool_type),
        None => Ok(Vec::new()),
    }
}

/// Lit le CONTENU `.md` de tous les atomes du pool `library/<type>/` (G1). Racine introuvable → `[]`.
#[tauri::command]
pub fn pool_read_all(pool_type: String) -> Result<Vec<String>, String> {
    match resolve_iakaframe_home() {
        Some(home) => pool_read_all_in(&home, &pool_type),
        None => Ok(Vec::new()),
    }
}

/// Lit le contenu `.md` d'UN atome de pool par id (`null` si absent ou racine introuvable).
#[tauri::command]
pub fn pool_read(pool_type: String, id: String) -> Result<Option<String>, String> {
    match resolve_iakaframe_home() {
        Some(home) => pool_read_in(&home, &pool_type, &id),
        None => Ok(None),
    }
}

/// Indique si le pool `library/` existe sous la racine (`false` si racine introuvable).
#[tauri::command]
pub fn pool_present() -> bool {
    resolve_iakaframe_home()
        .map(|home| pool_present_in(&home))
        .unwrap_or(false)
}

/// Liste les artefacts `.md` d'une collection (contenus bruts). Racine introuvable → `[]`.
#[tauri::command]
pub fn library_list(collection: String) -> Result<Vec<String>, String> {
    match resolve_iakaframe_home() {
        Some(home) => list_in(&home, &collection),
        None => Ok(Vec::new()),
    }
}

/// Lit un artefact (`null` si absent ou racine introuvable).
#[tauri::command]
pub fn library_read(collection: String, id: String) -> Result<Option<String>, String> {
    match resolve_iakaframe_home() {
        Some(home) => read_in(&home, &collection, &id),
        None => Ok(None),
    }
}

/// Écrit/remplace un artefact. Racine introuvable → erreur (Save impossible sans bibliothèque).
#[tauri::command]
pub fn library_write(collection: String, id: String, text: String) -> Result<(), String> {
    match resolve_iakaframe_home() {
        Some(home) => write_in(&home, &collection, &id, &text),
        None => Err("racine bibliothèque introuvable — définir IAKAFRAME_HOME (Réglages)".to_string()),
    }
}

/// Indique si un artefact existe (`false` si racine introuvable).
#[tauri::command]
pub fn library_exists(collection: String, id: String) -> Result<bool, String> {
    match resolve_iakaframe_home() {
        Some(home) => exists_in(&home, &collection, &id),
        None => Ok(false),
    }
}

/// Écrit/remplace un atome de pool `library/<type>/<id>.md` (E2, Lot 5a). Racine introuvable →
/// erreur (Save impossible sans bibliothèque). Calque de `library_write`, sous `library/<pool>/`.
#[tauri::command]
pub fn pool_write(pool_type: String, id: String, text: String) -> Result<(), String> {
    match resolve_iakaframe_home() {
        Some(home) => pool_write_in(&home, &pool_type, &id, &text),
        None => {
            Err("racine bibliothèque introuvable — définir IAKAFRAME_HOME (Réglages)".to_string())
        }
    }
}

/// Indique si un atome de pool existe (`false` si racine introuvable) — garde de création.
#[tauri::command]
pub fn pool_exists(pool_type: String, id: String) -> Result<bool, String> {
    match resolve_iakaframe_home() {
        Some(home) => pool_exists_in(&home, &pool_type, &id),
        None => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp_dir(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        p.push(format!("iakaframegui-lib-{tag}-{nanos}"));
        p
    }

    #[test]
    fn write_then_read_roundtrip_md() {
        let home = tmp_dir("rt");
        let md = "---\nid: iakaframe-8\n---\n# corps\n";
        write_in(&home, "teams", "iakaframe-8", md).unwrap();
        assert_eq!(
            read_in(&home, "teams", "iakaframe-8").unwrap(),
            Some(md.to_string())
        );
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn read_absent_renvoie_none() {
        let home = tmp_dir("absent");
        std::fs::create_dir_all(home.join("methods")).unwrap();
        assert_eq!(read_in(&home, "methods", "inconnu").unwrap(), None);
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn list_ignore_non_md_et_trie_par_id() {
        let home = tmp_dir("list");
        write_in(&home, "kits", "b", "---\nid: b\n---\n").unwrap();
        write_in(&home, "kits", "a", "---\nid: a\n---\n").unwrap();
        std::fs::write(home.join("kits").join("notes.txt"), "ignore").unwrap();
        let got = list_in(&home, "kits").unwrap();
        assert_eq!(got.len(), 2);
        assert!(got[0].contains("id: a"));
        assert!(got[1].contains("id: b"));
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn list_collection_absente_renvoie_vide() {
        let home = tmp_dir("void");
        assert!(list_in(&home, "teams").unwrap().is_empty());
    }

    #[test]
    fn exists_reflete_la_presence() {
        let home = tmp_dir("exists");
        assert!(!exists_in(&home, "teams", "x").unwrap());
        write_in(&home, "teams", "x", "---\nid: x\n---\n").unwrap();
        assert!(exists_in(&home, "teams", "x").unwrap());
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn workflows_collection_roundtrip_md() {
        // P6b : `workflows` est une collection de 1re classe (allow-list COLLECTIONS).
        let home = tmp_dir("wf");
        let md = "---\nid: mon-workflow\nname: Mon workflow\nmethodId: iakaframe\n---\n# corps\n";
        write_in(&home, "workflows", "mon-workflow", md).unwrap();
        assert_eq!(
            read_in(&home, "workflows", "mon-workflow").unwrap(),
            Some(md.to_string())
        );
        assert!(exists_in(&home, "workflows", "mon-workflow").unwrap());
        let got = list_in(&home, "workflows").unwrap();
        assert_eq!(got.len(), 1);
        assert!(got[0].contains("id: mon-workflow"));
        assert_eq!(
            library_file(&home, "workflows", "mon-workflow").unwrap(),
            home.join("workflows").join("mon-workflow.md")
        );
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn collection_invalide_est_refusee() {
        let home = tmp_dir("badcol");
        assert!(list_in(&home, "personas").is_err());
        assert!(write_in(&home, "secrets", "x", "y").is_err());
        assert!(read_in(&home, "..", "x").is_err());
    }

    #[test]
    fn traversal_dans_l_id_est_refuse() {
        let home = tmp_dir("trav");
        assert!(write_in(&home, "teams", "../evil", "{}").is_err());
        assert!(read_in(&home, "teams", "../../etc/passwd").is_err());
        assert!(library_file(&home, "teams", "a/b").is_err());
        assert!(library_file(&home, "teams", "").is_err());
        assert!(library_file(&home, "teams", "..").is_err());
    }

    #[test]
    fn library_file_reste_sous_la_collection() {
        let home = PathBuf::from("/home/user/work/iakaframe");
        let f = library_file(&home, "methods", "iakaframe").unwrap();
        assert_eq!(f, home.join("methods").join("iakaframe.md"));
    }

    #[test]
    fn pool_present_reflete_library() {
        let home = tmp_dir("poolp");
        assert!(!pool_present_in(&home));
        std::fs::create_dir_all(home.join("library")).unwrap();
        assert!(pool_present_in(&home));
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_list_scanne_les_ids_md_tries() {
        let home = tmp_dir("poollist");
        let dir = home.join("library").join("personas");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("odin.md"), "---\nid: odin\n---\n").unwrap();
        std::fs::write(dir.join("aragorn.md"), "---\nid: aragorn\n---\n").unwrap();
        std::fs::write(dir.join("_TEMPLATE.md"), "ignore").unwrap();
        std::fs::write(dir.join("README.md"), "ignore").unwrap();
        std::fs::write(dir.join("notes.txt"), "ignore").unwrap();
        let ids = pool_list_in(&home, "personas").unwrap();
        assert_eq!(ids, vec!["aragorn".to_string(), "odin".to_string()]);
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_list_dossier_absent_renvoie_vide() {
        let home = tmp_dir("poolvoid");
        assert!(pool_list_in(&home, "guardrails").unwrap().is_empty());
    }

    #[test]
    fn pool_list_type_invalide_est_refuse() {
        let home = tmp_dir("poolbad");
        assert!(pool_list_in(&home, "secrets").is_err());
        assert!(pool_list_in(&home, "..").is_err());
    }

    #[test]
    fn pool_list_gere_les_skills_en_dossier() {
        let home = tmp_dir("poolskill");
        let skills = home.join("library").join("skills");
        std::fs::create_dir_all(skills.join("iakaframe-cadrage")).unwrap();
        std::fs::write(
            skills.join("iakaframe-cadrage").join("SKILL.md"),
            "---\nid: iakaframe-cadrage\n---\n",
        )
        .unwrap();
        std::fs::create_dir_all(skills.join("sans-skillmd")).unwrap();
        let ids = pool_list_in(&home, "skills").unwrap();
        assert_eq!(ids, vec!["iakaframe-cadrage".to_string()]);
        std::fs::remove_dir_all(&home).ok();
    }

    // --- G1 : lecture du CONTENU des atomes de pool (`pool_read_all_in` / `pool_read_in`) ---

    #[test]
    fn pool_read_all_renvoie_les_contenus_tries_et_filtre() {
        // N contenus non vides, triés par id, `_TEMPLATE`/`README.md`/non-`.md` exclus (critère E).
        let home = tmp_dir("poolreadall");
        let dir = home.join("library").join("personas");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("odin.md"), "---\nid: odin\n---\n# Odin\n").unwrap();
        std::fs::write(dir.join("aragorn.md"), "---\nid: aragorn\n---\n# Aragorn\n").unwrap();
        std::fs::write(dir.join("_TEMPLATE.md"), "ignore").unwrap();
        std::fs::write(dir.join("README.md"), "ignore").unwrap();
        std::fs::write(dir.join("notes.txt"), "ignore").unwrap();
        let got = pool_read_all_in(&home, "personas").unwrap();
        assert_eq!(got.len(), 2);
        assert!(got[0].contains("id: aragorn")); // tri par id : aragorn avant odin
        assert!(got[1].contains("id: odin"));
        assert!(got.iter().all(|c| !c.is_empty()));
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_read_all_lit_les_skills_via_skill_md() {
        // Un atome « skill » est un DOSSIER : le contenu lu est celui de `<id>/SKILL.md` (critère E).
        let home = tmp_dir("poolreadskill");
        let skills = home.join("library").join("skills");
        std::fs::create_dir_all(skills.join("iakaframe-cadrage")).unwrap();
        std::fs::write(
            skills.join("iakaframe-cadrage").join("SKILL.md"),
            "---\nid: iakaframe-cadrage\n---\n# corps skill\n",
        )
        .unwrap();
        std::fs::create_dir_all(skills.join("sans-skillmd")).unwrap(); // dossier sans SKILL.md → ignoré
        let got = pool_read_all_in(&home, "skills").unwrap();
        assert_eq!(got.len(), 1);
        assert!(got[0].contains("id: iakaframe-cadrage"));
        assert!(got[0].contains("corps skill"));
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_read_all_dossier_absent_renvoie_vide() {
        let home = tmp_dir("poolreadvoid");
        assert!(pool_read_all_in(&home, "guardrails").unwrap().is_empty());
    }

    #[test]
    fn pool_read_all_type_invalide_est_refuse() {
        let home = tmp_dir("poolreadbad");
        assert!(pool_read_all_in(&home, "secrets").is_err());
        assert!(pool_read_all_in(&home, "..").is_err());
    }

    #[test]
    fn pool_read_un_atome_md_ou_skill_ou_absent() {
        let home = tmp_dir("poolreadone");
        let personas = home.join("library").join("personas");
        std::fs::create_dir_all(&personas).unwrap();
        std::fs::write(personas.join("odin.md"), "---\nid: odin\n---\n").unwrap();
        let skills = home.join("library").join("skills");
        std::fs::create_dir_all(skills.join("iakaframe-cadrage")).unwrap();
        std::fs::write(
            skills.join("iakaframe-cadrage").join("SKILL.md"),
            "---\nid: iakaframe-cadrage\n---\n",
        )
        .unwrap();
        assert!(pool_read_in(&home, "personas", "odin")
            .unwrap()
            .unwrap()
            .contains("id: odin"));
        assert!(pool_read_in(&home, "skills", "iakaframe-cadrage")
            .unwrap()
            .unwrap()
            .contains("id: iakaframe-cadrage"));
        assert_eq!(pool_read_in(&home, "personas", "inconnu").unwrap(), None);
        assert!(pool_read_in(&home, "personas", "../evil").is_err());
        assert!(pool_read_in(&home, "secrets", "x").is_err());
        std::fs::remove_dir_all(&home).ok();
    }

    // --- G2 : `bindings` est une collection chargeable (`library_list("bindings")`) ---

    // --- Lot 5a : écriture d'atomes de pool (`pool_write_in` / `pool_exists_in`) ---

    #[test]
    fn pool_write_then_read_roundtrip_md() {
        // Écriture sous `library/<pool>/<id>.md` puis relecture byte-identique (miroir `pool_read_in`).
        let home = tmp_dir("poolwrite");
        let md = "---\nid: sam\nname: Sam\nroleKey: dev\n---\n# corps\n";
        pool_write_in(&home, "personas", "sam", md).unwrap();
        assert_eq!(
            pool_read_in(&home, "personas", "sam").unwrap(),
            Some(md.to_string())
        );
        assert_eq!(
            pool_file(&home, "personas", "sam").unwrap(),
            home.join("library").join("personas").join("sam.md")
        );
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_exists_reflete_la_presence() {
        let home = tmp_dir("poolexists");
        assert!(!pool_exists_in(&home, "principles", "p1").unwrap());
        pool_write_in(&home, "principles", "p1", "---\nid: p1\n---\n").unwrap();
        assert!(pool_exists_in(&home, "principles", "p1").unwrap());
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_write_type_invalide_est_refuse() {
        let home = tmp_dir("poolwritebad");
        assert!(pool_write_in(&home, "secrets", "x", "y").is_err());
        assert!(pool_write_in(&home, "..", "x", "y").is_err());
    }

    #[test]
    fn pool_write_traversal_dans_l_id_est_refuse() {
        let home = tmp_dir("poolwritetrav");
        assert!(pool_write_in(&home, "personas", "../evil", "{}").is_err());
        assert!(pool_write_in(&home, "personas", "a/b", "{}").is_err());
        assert!(pool_write_in(&home, "personas", "..", "{}").is_err());
        assert!(pool_write_in(&home, "personas", "", "{}").is_err());
    }

    #[test]
    fn pool_write_skills_dossier_est_refuse_en_5a() {
        // `skills` = DOSSIER `<id>/SKILL.md` : écriture hors périmètre 5a (reportée au Lot 5c).
        let home = tmp_dir("poolwriteskill");
        assert!(pool_write_in(&home, "skills", "iakaframe-cadrage", "x").is_err());
        assert!(pool_exists_in(&home, "skills", "iakaframe-cadrage").is_err());
        std::fs::remove_dir_all(&home).ok();
    }

    #[test]
    fn pool_file_reste_sous_library_du_pool() {
        let home = PathBuf::from("/home/user/work/iakaframe");
        let f = pool_file(&home, "personas", "odin").unwrap();
        assert_eq!(
            f,
            home.join("library").join("personas").join("odin.md")
        );
    }

    #[test]
    fn bindings_est_une_collection_chargeable() {
        // Layout SF2 reproduit : un `bindings/<id>.md` à plat → `list_in("bindings")` = 1 (critère C/E).
        let home = tmp_dir("bindings");
        let md = "---\nid: iakaframe-claude-default\nmethodId: iakaframe\nteamId: iakaframe-8\nnode: claude\n---\n# binding\n";
        write_in(&home, "bindings", "iakaframe-claude-default", md).unwrap();
        let got = list_in(&home, "bindings").unwrap();
        assert_eq!(got.len(), 1);
        assert!(got[0].contains("id: iakaframe-claude-default"));
        // Garde d'autorité inchangée : un type/collection hors périmètre reste refusé.
        assert!(list_in(&home, "secrets").is_err());
        std::fs::remove_dir_all(&home).ok();
    }
}
