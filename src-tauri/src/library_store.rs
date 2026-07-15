//! library_store — I/O de la **bibliothèque `iakaframe`** en fichiers `.md` (un par artefact),
//! sous **pathguard limité à `IAKAFRAME_HOME`**. Calque exact de `teams_store.rs` : Rust est un
//! **passe-plat de texte** — il ne (dé)sérialise PAS le frontmatter (le cœur front tient le
//! schéma, cf. `packages/core/src/frontmatter.ts`). Il lit/écrit des chaînes `.md` opaques sous
//! `<home>/<collection>/<id>.md`, avec :
//!   - `collection` validée ∈ { teams, methods, kits } (les 3 onglets de la forge, Q-6) ;
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

/// Collections gérées par la forge (les 3 onglets, Q-6). Sous-ensemble du mapping CLI.
const COLLECTIONS: [&str; 3] = ["teams", "methods", "kits"];

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

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

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
}
