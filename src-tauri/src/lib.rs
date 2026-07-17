//! iakaFrameGUI — backend Tauri 2 (mince) de la forge.
//!
//! P1 : socle minimal calqué sur l'esprit L0 du Cockpit — `paths` (chapeau + workspace
//! cross-OS), `pathguard` (anti-traversal), `teams_store` (persistance des teams PURES en
//! fichiers JSON sous `<workspace>/teams/`). AUCUNE commande réseau, AUCUN secret, AUCUN
//! appel runner (AR-1/AR-6). Le front tient le schéma via `@iakaframe/core` ; Rust est un
//! passe-plat.

pub mod handoff;
pub mod kit_deploy;
pub mod library_store;
pub mod pathguard;
pub mod paths;
pub mod settings;
pub mod teams_store;

/// Commande de santé minimale — prouve le pont front↔back sans logique métier.
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Plugin `dialog` (P4) : sélecteur de dossier natif pour choisir la destination
        // de déploiement. Seule capacité backend ajoutée par P4 ; `kit_deploy` inchangé.
        .plugin(tauri_plugin_dialog::init())
        // Plugin `shell` (U1, surface-apprentissage.md, Q-1) — DÉROGATION ASSUMÉE ET BORNÉE à
        // l'invariant AR-1/AR-6 : pilote la CLI sœur déterministe `iakaframe review --json`
        // (source unique du garde de consentement + plafonds). L'allow-list STRICTE de
        // `capabilities/default.json` borne l'exécution à un binaire (`iakaframe`/`node`), la
        // sous-commande `review`, un argv figé (seul `<id>` est un validateur). Ce n'est PAS un
        // appel runner (LLM) ; aucune logique de revue n'est réimplémentée en Rust. Cf. § 4.2bis.
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            teams_store::team_list,
            teams_store::team_read,
            teams_store::team_write,
            teams_store::team_delete,
            teams_store::workspace_path,
            library_store::library_list,
            library_store::library_read,
            library_store::library_write,
            library_store::library_exists,
            library_store::pool_list,
            library_store::pool_read_all,
            library_store::pool_present,
            settings::iakaframe_home,
            settings::set_iakaframe_home,
            kit_deploy::kit_deploy,
            handoff::handoff_deliver,
            handoff::now_millis,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement d'iakaFrameGUI");
}
