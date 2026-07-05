//! pathguard — garde-fou anti-traversal (calque `IakaCockpit/src-tauri/src/pathguard.rs`).
//!
//! Tout accès fichier sous le workspace (`teams_store`) DOIT passer par ce module. On
//! normalise *purement* (sans I/O) les composants du chemin candidat, en refusant toute
//! remontée (`..`) hors base et tout chemin absolu / préfixe disque injecté. Déterministe
//! et testable sur les 3 OS.

use std::path::{Component, Path, PathBuf};

/// Erreurs de validation de chemin.
#[derive(Debug, PartialEq, Eq)]
pub enum PathGuardError {
    /// Le candidat s'évade de la base (remontée `..` ou absolu injecté).
    Escapes,
    /// Composant inattendu (préfixe Windows injecté, racine, etc.).
    InvalidComponent,
}

impl std::fmt::Display for PathGuardError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PathGuardError::Escapes => write!(f, "le chemin s'évade de la base autorisée"),
            PathGuardError::InvalidComponent => write!(f, "composant de chemin invalide"),
        }
    }
}

impl std::error::Error for PathGuardError {}

/// Normalise les composants d'un chemin RELATIF sans accès disque.
fn normalize_relative(candidate: &Path) -> Result<PathBuf, PathGuardError> {
    let mut stack: Vec<std::ffi::OsString> = Vec::new();
    for comp in candidate.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => {
                if stack.pop().is_none() {
                    return Err(PathGuardError::Escapes);
                }
            }
            Component::Normal(seg) => stack.push(seg.to_os_string()),
            Component::RootDir | Component::Prefix(_) => {
                return Err(PathGuardError::InvalidComponent);
            }
        }
    }
    let mut out = PathBuf::new();
    for seg in stack {
        out.push(seg);
    }
    Ok(out)
}

/// Résout `candidate` (relatif) sous `base` en garantissant qu'il ne s'en évade pas.
pub fn safe_path(base: &Path, candidate: &Path) -> Result<PathBuf, PathGuardError> {
    let normalized = normalize_relative(candidate)?;
    Ok(base.join(normalized))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> PathBuf {
        PathBuf::from("/home/user/work/iakaframegui-workspace/teams")
    }

    #[test]
    fn accepte_un_fichier_de_team_simple() {
        let p = safe_path(&base(), Path::new("iakaframe.json")).unwrap();
        assert_eq!(p, base().join("iakaframe.json"));
    }

    #[test]
    fn accepte_un_point_courant() {
        let p = safe_path(&base(), Path::new("./t.json")).unwrap();
        assert_eq!(p, base().join("t.json"));
    }

    #[test]
    fn rejette_traversal_unix() {
        assert_eq!(
            safe_path(&base(), Path::new("../../etc/passwd")),
            Err(PathGuardError::Escapes)
        );
    }

    #[test]
    fn rejette_remontee_simple() {
        assert_eq!(
            safe_path(&base(), Path::new("..")),
            Err(PathGuardError::Escapes)
        );
    }

    #[test]
    fn rejette_chemin_absolu_injecte() {
        assert_eq!(
            safe_path(&base(), Path::new("/etc/passwd")),
            Err(PathGuardError::InvalidComponent)
        );
    }

    #[test]
    fn rejette_evasion_meme_avec_segments_avant() {
        assert_eq!(
            safe_path(&base(), Path::new("a/../../x")),
            Err(PathGuardError::Escapes)
        );
    }

    #[cfg(windows)]
    #[test]
    fn rejette_prefixe_disque_windows() {
        assert_eq!(
            safe_path(&base(), Path::new("C:\\Windows")),
            Err(PathGuardError::InvalidComponent)
        );
    }
}
