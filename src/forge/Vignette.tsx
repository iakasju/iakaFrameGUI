/**
 * Vignette — pastille visuelle d'un persona / d'une team / d'une méthode + **dropzone d'upload**.
 *
 * MVP (E2b) : la vignette affiche des **initiales** sur un dégradé dérivé du `roleIndex` (casting
 * visuel déterministe), et la dropzone accepte un fichier image en **aperçu mémoire** (dataURL).
 * **[différé]** : la **persistance** réelle de la vignette uploadée (upload persistant = E2/§9
 * différé) — ici on ne fait qu'un aperçu volatile. Aucun I/O disque, aucune requête réseau.
 * Les helpers purs (dégradés / initiales) vivent dans `vignette.ts` (fast-refresh propre).
 */
import { useCallback, useRef, useState } from "react";
import { vignetteGradient } from "./casting";

export function Vignette({
  label,
  roleIndex = 0,
  size = "sm",
  gradient,
}: {
  /** Texte affiché (initiales). */
  label: string;
  roleIndex?: number;
  size?: "sm" | "lg";
  /** Dégradé explicite (sinon dérivé du roleIndex). */
  gradient?: [string, string];
}) {
  const [va, vb] = gradient ?? vignetteGradient(roleIndex);
  return (
    <span
      className={`vig ${size}`}
      style={{ ["--va" as string]: va, ["--vb" as string]: vb }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

/**
 * UploadChip — dropzone/click d'upload de vignette. Aperçu **mémoire seulement** (dataURL) ;
 * **persistance différée** (MVP). N'émet aucune écriture disque.
 */
export function UploadChip({ label }: { label: string }) {
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const readFile = useCallback((file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }, []);

  return (
    <button
      type="button"
      className={`up-chip${over ? " over" : ""}${preview ? " has" : ""}`}
      title="Importer / déposer une vignette (aperçu en mémoire — persistance différée)"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        readFile(e.dataTransfer.files?.[0]);
      }}
    >
      {preview ? "✓ vignette (aperçu) — persistance différée" : label}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => readFile(e.target.files?.[0])}
      />
    </button>
  );
}
