//! kit_deploy — **écriture disque d'un kit** (`KitFileTree`) dans un dossier cible.
//!
//! Séparation P3 (§ 4 instruction) : la **génération** du kit est PURE (côté `@iakaframe/
//! core`, `generateClaudeCodeKit`) ; l'**I/O** (poser l'arborescence sur disque) vit ici,
//! dans la forge Rust, derrière une **façade unique** et un **pathguard** (anti-traversal).
//!
//! Garanties :
//!  - **Non destructif par défaut** : si un fichier cible existe déjà et que `force` est
//!    faux, on **n'écrit RIEN** (pré-vérification atomique) et on renvoie la liste des
//!    conflits. `force = true` autorise l'écrasement.
//!  - **Pathguard** : chaque chemin **relatif** du kit est résolu via `pathguard::safe_path`
//!    (refus de toute remontée `..`, de tout chemin absolu / préfixe disque injecté) — jamais
//!    hors du dossier cible.
//!  - **Passe-plat de contenu** : Rust n'interprète pas le kit (le cœur tient le schéma) ; il
//!    écrit des chaînes opaques. Aucune notion de runner/model, aucun secret, aucun réseau.
//!
//! `deploy_in` est **pure vis-à-vis de l'entrée** (dossier + arbre injectés) → testable en
//! `cargo test` sur un dossier temporaire ; la commande Tauri ne fait que convertir les args.

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};

use crate::pathguard::safe_path;

/// Résout et valide un chemin relatif de kit sous `dest` (pathguard). `Err` si évasion.
fn resolve_target(dest: &Path, rel: &str) -> Result<PathBuf, String> {
    let r = rel.trim();
    if r.is_empty() {
        return Err("chemin de kit vide".to_string());
    }
    safe_path(dest, Path::new(r)).map_err(|e| format!("{r} : {e}"))
}

/// Écrit l'arborescence `files` (chemin relatif → contenu) sous `dest`.
///
/// - Valide TOUS les chemins d'abord (pathguard) — au moindre évadé, échec sans rien écrire.
/// - Si `force` est faux, refuse d'écraser un fichier existant (échec sans rien écrire,
///   liste des conflits).
/// - Sinon, crée les dossiers parents au besoin et écrit chaque fichier.
///
/// Renvoie la liste (triée) des chemins relatifs effectivement écrits.
pub fn deploy_in(
    dest: &Path,
    files: &BTreeMap<String, String>,
    force: bool,
) -> Result<Vec<String>, String> {
    if !dest.is_absolute() {
        return Err("le dossier cible doit être un chemin absolu".to_string());
    }

    // 1. Validation pathguard de tous les chemins (avant toute écriture).
    let mut planned: Vec<(String, PathBuf, &String)> = Vec::new();
    for (rel, content) in files {
        let target = resolve_target(dest, rel)?;
        planned.push((rel.clone(), target, content));
    }

    // 2. Non-destructif : recense les conflits si `force` est faux.
    if !force {
        let conflicts: Vec<String> = planned
            .iter()
            .filter(|(_, target, _)| target.exists())
            .map(|(rel, _, _)| rel.clone())
            .collect();
        if !conflicts.is_empty() {
            return Err(format!(
                "déploiement refusé (non destructif) : {} fichier(s) existant(s) : {}. \
                 Relancez avec force pour écraser.",
                conflicts.len(),
                conflicts.join(", ")
            ));
        }
    }

    // 3. Écriture (dossiers parents créés au besoin).
    let mut written: Vec<String> = Vec::new();
    for (rel, target, content) in &planned {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("{rel} : {e}"))?;
        }
        std::fs::write(target, content).map_err(|e| format!("{rel} : {e}"))?;
        written.push(rel.clone());
    }
    written.sort();
    Ok(written)
}

// --- Commande Tauri (façade unique côté front) ---

/// Déploie un kit (arbre { chemin relatif → contenu }) dans `dest_dir`.
/// `force = true` autorise l'écrasement. Renvoie la liste des chemins écrits.
#[tauri::command]
pub fn kit_deploy(
    dest_dir: String,
    files: HashMap<String, String>,
    force: bool,
) -> Result<Vec<String>, String> {
    let dest = PathBuf::from(dest_dir.trim());
    let tree: BTreeMap<String, String> = files.into_iter().collect();
    deploy_in(&dest, &tree, force)
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
        p.push(format!("iakaframegui-deploy-{tag}-{nanos}"));
        p
    }

    fn tree(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn ecrit_l_arborescence_attendue() {
        let dir = tmp_dir("write");
        let files = tree(&[
            (".claude/agents/aragorn.md", "---\nname: Aragorn\n---\n"),
            (".claude/settings.json", "{\"hooks\":{}}"),
            ("CLAUDE.md", "# team\n"),
        ]);
        let written = deploy_in(&dir, &files, false).unwrap();
        assert_eq!(written.len(), 3);
        assert!(dir.join(".claude/agents/aragorn.md").is_file());
        assert!(dir.join(".claude/settings.json").is_file());
        assert!(dir.join("CLAUDE.md").is_file());
        assert_eq!(
            std::fs::read_to_string(dir.join("CLAUDE.md")).unwrap(),
            "# team\n"
        );
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn non_destructif_refuse_d_ecraser_sans_force() {
        let dir = tmp_dir("nodestroy");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("CLAUDE.md"), "ORIGINAL").unwrap();

        let files = tree(&[("CLAUDE.md", "NOUVEAU"), ("nouveau.md", "x")]);
        let err = deploy_in(&dir, &files, false).unwrap_err();
        assert!(err.contains("non destructif"));
        assert!(err.contains("CLAUDE.md"));
        // Rien n'a été écrit : l'original est intact, le nouveau fichier absent.
        assert_eq!(
            std::fs::read_to_string(dir.join("CLAUDE.md")).unwrap(),
            "ORIGINAL"
        );
        assert!(!dir.join("nouveau.md").exists());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn force_autorise_l_ecrasement() {
        let dir = tmp_dir("force");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("CLAUDE.md"), "ORIGINAL").unwrap();

        let files = tree(&[("CLAUDE.md", "NOUVEAU")]);
        let written = deploy_in(&dir, &files, true).unwrap();
        assert_eq!(written, vec!["CLAUDE.md".to_string()]);
        assert_eq!(
            std::fs::read_to_string(dir.join("CLAUDE.md")).unwrap(),
            "NOUVEAU"
        );
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn pathguard_refuse_le_traversal() {
        let dir = tmp_dir("trav");
        let files = tree(&[("../evil.md", "pwn")]);
        assert!(deploy_in(&dir, &files, true).is_err());
        // Le fichier hors cible n'existe pas.
        assert!(!dir.parent().unwrap().join("evil.md").exists());

        let files2 = tree(&[("a/../../x.md", "pwn")]);
        assert!(deploy_in(&dir, &files2, true).is_err());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuse_un_chemin_absolu_injecte() {
        let dir = tmp_dir("abs");
        let files = tree(&[("/etc/passwd", "pwn")]);
        assert!(deploy_in(&dir, &files, true).is_err());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuse_un_dest_non_absolu() {
        let files = tree(&[("CLAUDE.md", "x")]);
        assert!(deploy_in(Path::new("relatif/dir"), &files, true).is_err());
    }

    #[test]
    fn refuse_un_chemin_de_kit_vide() {
        let dir = tmp_dir("empty");
        let files = tree(&[("", "x")]);
        assert!(deploy_in(&dir, &files, true).is_err());
    }
}
