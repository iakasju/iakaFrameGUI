//! paths — résolution du chapeau + du **workspace de la forge**, cross-OS.
//!
//! Calque `IakaCockpit/src-tauri/src/paths.rs` : la racine du chapeau est CALCULÉE par OS
//! à l'exécution (jamais de constante Windows en dur), surchargeable via `IAKAFRAME_ROOT`.
//! On ajoute la résolution du **workspace de la forge** (Q-1 tranché) :
//! `<chapeau>/iakaframegui-workspace/`, avec les teams sous `<workspace>/teams/`. Le
//! workspace est lui-même surchargeable via `IAKAFRAMEGUI_WORKSPACE` (utile aux tests et à
//! une installation portable).

use std::path::PathBuf;

/// Variable d'environnement de surcharge du chapeau (partagée avec l'écosystème iaka).
pub const HAT_ROOT_ENV: &str = "IAKAFRAME_ROOT";
/// Variable d'environnement de surcharge directe du workspace de la forge.
pub const WORKSPACE_ENV: &str = "IAKAFRAMEGUI_WORKSPACE";

/// Sous-dossier par défaut du chapeau, relatif au home.
const HAT_SUBDIR: &str = "work";
/// Nom du workspace de la forge sous le chapeau (isolation `iakaframegui-*`, AR-7).
const WORKSPACE_DIR: &str = "iakaframegui-workspace";
/// Sous-dossier des fichiers de team.
const TEAMS_DIR: &str = "teams";

/// Résout la racine du chapeau pour l'OS courant.
pub fn resolve_hat_root() -> PathBuf {
    resolve_hat_root_with(std::env::var(HAT_ROOT_ENV).ok(), dirs::home_dir())
}

/// Variante testable de `resolve_hat_root` (env + home injectés).
fn resolve_hat_root_with(env_value: Option<String>, home: Option<PathBuf>) -> PathBuf {
    if let Some(v) = env_value {
        let trimmed = v.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    match home {
        Some(h) => h.join(HAT_SUBDIR),
        // Dernier recours : chemin relatif, jamais un disque Windows en dur.
        None => PathBuf::from(HAT_SUBDIR),
    }
}

/// Résout le **workspace de la forge**. Ordre : `IAKAFRAMEGUI_WORKSPACE` si défini/non vide,
/// sinon `<chapeau>/iakaframegui-workspace`.
pub fn resolve_workspace() -> PathBuf {
    resolve_workspace_with(std::env::var(WORKSPACE_ENV).ok(), resolve_hat_root())
}

/// Variante testable de `resolve_workspace` (env + chapeau injectés).
fn resolve_workspace_with(env_value: Option<String>, hat_root: PathBuf) -> PathBuf {
    if let Some(v) = env_value {
        let trimmed = v.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    hat_root.join(WORKSPACE_DIR)
}

/// Dossier des fichiers de team (`<workspace>/teams`).
pub fn resolve_teams_dir() -> PathBuf {
    resolve_workspace().join(TEAMS_DIR)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn env_override_du_chapeau_est_respecte() {
        let p = resolve_hat_root_with(
            Some("/custom/root".to_string()),
            Some(PathBuf::from("/home/user")),
        );
        assert_eq!(p, PathBuf::from("/custom/root"));
    }

    #[test]
    fn chapeau_defaut_sous_le_home_sans_disque_windows() {
        let p = resolve_hat_root_with(None, Some(PathBuf::from("/home/user")));
        assert_eq!(p, PathBuf::from("/home/user").join("work"));
        assert!(!p.to_string_lossy().contains("C:\\"));
    }

    #[test]
    fn sans_home_retombe_sur_relatif() {
        let p = resolve_hat_root_with(None, None);
        assert_eq!(p, PathBuf::from("work"));
        assert!(!p.to_string_lossy().contains("C:\\"));
    }

    #[test]
    fn workspace_defaut_est_sous_le_chapeau() {
        let ws = resolve_workspace_with(None, PathBuf::from("/home/user/work"));
        assert_eq!(ws, PathBuf::from("/home/user/work/iakaframegui-workspace"));
    }

    #[test]
    fn workspace_env_override_est_respecte() {
        let ws = resolve_workspace_with(
            Some("/tmp/ws".to_string()),
            PathBuf::from("/home/user/work"),
        );
        assert_eq!(ws, PathBuf::from("/tmp/ws"));
    }

    #[test]
    fn teams_dir_est_sous_le_workspace() {
        // Smoke test de la fonction publique réelle (dépend de l'env), sans paniquer.
        let d = resolve_teams_dir();
        assert!(d.ends_with("teams"));
    }
}
