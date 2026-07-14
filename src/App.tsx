/**
 * App — point d'entrée de la **forge à trois ateliers** (E2b). L'application n'est plus une
 * navigation Personas/Teams/Déploiement : elle monte la **coquille de la forge** (`ForgeShell`)
 * dont la barre supérieure porte les onglets de 1er étage `Team · Méthode · Kit`, le sélecteur de
 * charte et « Livrer au Cockpit → ». Les autorités du modèle vivent dans le shell (pas de
 * god-component ici) ; toute écriture passe par la façade unique, sous CSP stricte.
 */
import { ForgeShell } from "./forge/ForgeShell";

export default function App() {
  return <ForgeShell />;
}
