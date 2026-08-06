//! iakaFrameGUI — backend Tauri 2 (mince) de la forge.
//!
//! P1 : socle minimal calqué sur l'esprit L0 du Cockpit — `paths` (chapeau + workspace
//! cross-OS), `pathguard` (anti-traversal), `teams_store` (persistance des teams PURES en
//! fichiers JSON sous `<workspace>/teams/`). Le front tient le schéma via `@iakaframe/core` ;
//! Rust est un passe-plat.
//!
//! Invariant AR-1/AR-6 : Rust reste passe-plat, AUCUN appel **runner d'exécution**, AUCUN secret.
//! DÉROGATIONS ASSUMÉES ET BORNÉES (documentées à leur point d'usage) :
//!   1. `plugin-shell` — pilote des outils frères déterministes `iakaframe review`/`remove`
//!      (allow-list stricte `capabilities/default.json`) — jamais un moteur LLM.
//!   2. `llm` — **UN** appel HTTP d'authoring (copilote-inference-live.md, D1) : provider `ollama`
//!      SEUL, hôte allow-listé (loopback + `authoringEndpoint` réglé), timeout dur. C'est de
//!      l'authoring BUILD-TIME (composer la charte d'un élément), **jamais** un runner d'EXÉCUTION
//!      du Binding. La frontière authoring ≠ exécution reste entière (cf. `llm.rs`).
//!
//! CONTRÔLE DE VERSION DE L'APPLI (auto-update.md) — **ni une dérogation, ni un cas des deux
//! ci-dessus**. Le plugin `updater` émet un egress HTTP sortant vers l'endpoint **réglé en
//! configuration** (`tauri.conf.json` > `plugins.updater.endpoints`, liste ordonnée) pour lire un
//! manifeste de version, puis télécharge une charge utile **vérifiée par signature minisign** avant
//! toute installation. Ce n'est **NI un appel runner** (aucun LLM, aucune décision déléguée à un
//! modèle), **NI un sous-processus** (aucun binaire tiers exécuté, l'allow-list `shell:allow-execute`
//! reste inchangée) : c'est l'appli qui se demande si elle est à jour. Il n'entame donc pas
//! l'invariant AR-1/AR-6 et n'a pas à figurer parmi ses dérogations — il est documenté ici au même
//! niveau de soin parce qu'un auditeur qui voit un egress doit en trouver la raison. Bornes : un
//! endpoint de configuration (pas d'URL calculée), une clé publique en dur dans la config (une
//! charge non signée par la clé privée correspondante est **refusée**), et une installation qui
//! n'est **jamais** déclenchée sans clic explicite (D3). Le transport LAN est en clair
//! (`dangerousInsecureTransportProtocol`) : assumé et borné — la confiance vient de la **signature**,
//! pas du transport ; à retirer le jour où le flux passe en HTTPS.

pub mod handoff;
pub mod kit_deploy;
pub mod library_store;
pub mod llm;
pub mod pathguard;
pub mod project_conf;
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
        // Plugins `updater` + `process` (auto-update.md, étape 2) — montage PASSE-PLAT : aucune
        // logique métier côté Rust, la machine à états vit dans le front (`useAppUpdate`). Le
        // contrôle de version n'est ni un appel runner ni un sous-processus (cf. en-tête du module).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            library_store::pool_write,
            library_store::pool_exists,
            library_store::pool_list,
            library_store::pool_read_all,
            library_store::pool_read,
            library_store::pool_present,
            settings::iakaframe_home,
            settings::set_iakaframe_home,
            settings::authoring_model,
            settings::set_authoring_model,
            settings::authoring_endpoint,
            settings::set_authoring_endpoint,
            settings::authoring_api_key,
            settings::set_authoring_api_key,
            settings::project_dir,
            settings::set_project_dir,
            project_conf::active_frame_id,
            project_conf::set_active_frame_id,
            llm::llm_complete,
            llm::llm_complete_stream,
            llm::llm_models,
            kit_deploy::kit_deploy,
            handoff::handoff_deliver,
            handoff::now_millis,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement d'iakaFrameGUI");
}
