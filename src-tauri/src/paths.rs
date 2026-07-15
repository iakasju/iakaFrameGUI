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
/// Variable d'environnement de surcharge directe du canal de handoff (tests / portable).
pub const HANDOFF_ROOT_ENV: &str = "IAKA_HANDOFF_ROOT";
/// Canal de handoff partagé forge↔cockpit, sous le chapeau (H1, Q-B).
const HANDOFF_DIR: &str = "iaka-handoff";
/// Variable d'environnement de la **racine bibliothèque** iakaframe — **partagée avec le CLI**
/// (point de vérité UNIQUE, cf. cli-bibliotheque-verbes.md §4.2). DISTINCTE de `IAKAFRAME_ROOT`
/// (chapeau) et de `IAKAFRAMEGUI_WORKSPACE` (workspace isolé de la forge).
pub const IAKAFRAME_HOME_ENV: &str = "IAKAFRAME_HOME";
/// Dossier de la bibliothèque sous le chapeau (découverte auto : `<chapeau>/iakaframe`).
const LIBRARY_HOME_DIR: &str = "iakaframe";
/// Fichier de réglages GUI (override persisté de la racine), sous le workspace.
const SETTINGS_FILE: &str = "settings.json";

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

/// Résout la **racine du canal de handoff** (H1, Q-B) : `IAKA_HANDOFF_ROOT` si défini/non
/// vide, sinon `<chapeau>/iaka-handoff`. Partagé forge (écrit) ↔ cockpit (lit) — NON isolé
/// par app (c'est un point de rendez-vous), contrairement au workspace.
pub fn resolve_handoff_root() -> PathBuf {
    resolve_handoff_root_with(std::env::var(HANDOFF_ROOT_ENV).ok(), resolve_hat_root())
}

/// Variante testable de `resolve_handoff_root` (env + chapeau injectés).
fn resolve_handoff_root_with(env_value: Option<String>, hat_root: PathBuf) -> PathBuf {
    if let Some(v) = env_value {
        let trimmed = v.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    hat_root.join(HANDOFF_DIR)
}

/// Fichier de réglages GUI (`<workspace>/settings.json`) — override persisté de la racine.
pub fn resolve_settings_file() -> PathBuf {
    resolve_workspace().join(SETTINGS_FILE)
}

/// Résout la **racine bibliothèque `IAKAFRAME_HOME`** (partagée CLI, §5). Priorité :
/// 1) override persisté GUI (`settings.json`) ; 2) env `IAKAFRAME_HOME` ; 3) découverte auto
/// `<chapeau>/iakaframe` **validée** par le double marqueur `library/` + `methods/` ; 4) `None`
/// (bibliothèque introuvable → l'UI invite à la définir).
pub fn resolve_iakaframe_home() -> Option<PathBuf> {
    let override_persisted = crate::settings::read_home_override(&resolve_settings_file());
    resolve_iakaframe_home_with(
        override_persisted,
        std::env::var(IAKAFRAME_HOME_ENV).ok(),
        resolve_hat_root(),
    )
}

/// Variante testable (override + env + chapeau injectés). La branche « découverte auto »
/// touche le disque (double marqueur) ; les branches override/env sont pures.
fn resolve_iakaframe_home_with(
    override_opt: Option<String>,
    env_opt: Option<String>,
    hat_root: PathBuf,
) -> Option<PathBuf> {
    if let Some(v) = override_opt {
        let t = v.trim();
        if !t.is_empty() {
            return Some(PathBuf::from(t));
        }
    }
    if let Some(v) = env_opt {
        let t = v.trim();
        if !t.is_empty() {
            return Some(PathBuf::from(t));
        }
    }
    let candidate = hat_root.join(LIBRARY_HOME_DIR);
    if is_library_home(&candidate) {
        return Some(candidate);
    }
    None
}

/// Un dossier est-il une racine bibliothèque valide ? Double marqueur `library/` + `methods/`
/// (calque de la détection CLI `isLibraryRootDir`, §4.2).
pub fn is_library_home(dir: &std::path::Path) -> bool {
    dir.join("library").is_dir() && dir.join("methods").is_dir()
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

    #[test]
    fn handoff_root_defaut_est_sous_le_chapeau() {
        let h = resolve_handoff_root_with(None, PathBuf::from("/home/user/work"));
        assert_eq!(h, PathBuf::from("/home/user/work/iaka-handoff"));
    }

    #[test]
    fn handoff_root_env_override_est_respecte() {
        let h = resolve_handoff_root_with(
            Some("/tmp/handoff".to_string()),
            PathBuf::from("/home/user/work"),
        );
        assert_eq!(h, PathBuf::from("/tmp/handoff"));
    }

    #[test]
    fn home_override_persiste_prime_sur_env_et_auto() {
        let h = resolve_iakaframe_home_with(
            Some("/lib/override".to_string()),
            Some("/lib/env".to_string()),
            PathBuf::from("/home/user/work"),
        );
        assert_eq!(h, Some(PathBuf::from("/lib/override")));
    }

    #[test]
    fn home_env_prime_sur_auto_si_pas_d_override() {
        let h = resolve_iakaframe_home_with(
            None,
            Some("/lib/env".to_string()),
            PathBuf::from("/home/user/work"),
        );
        assert_eq!(h, Some(PathBuf::from("/lib/env")));
    }

    #[test]
    fn home_override_vide_est_ignore() {
        let h = resolve_iakaframe_home_with(
            Some("   ".to_string()),
            Some("/lib/env".to_string()),
            PathBuf::from("/home/user/work"),
        );
        assert_eq!(h, Some(PathBuf::from("/lib/env")));
    }

    #[test]
    fn home_auto_par_double_marqueur_sinon_none() {
        // Chapeau sans bibliothèque → introuvable.
        let mut hat = std::env::temp_dir();
        hat.push(format!(
            "iakaframegui-home-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        assert_eq!(resolve_iakaframe_home_with(None, None, hat.clone()), None);
        // On matérialise `<hat>/iakaframe/{library,methods}` → découverte auto.
        let home = hat.join("iakaframe");
        std::fs::create_dir_all(home.join("library")).unwrap();
        std::fs::create_dir_all(home.join("methods")).unwrap();
        assert_eq!(
            resolve_iakaframe_home_with(None, None, hat.clone()),
            Some(home)
        );
        std::fs::remove_dir_all(&hat).ok();
    }
}
