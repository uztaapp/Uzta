import { useEffect, useState } from "react";
import type { Farm } from "../lib/local-model";
import { Photo } from "./presentation";
import { t, useLanguage } from "../lib/language";
export function StoreCover({
  farm,
  crop,
  label,
}: {
  farm: Farm;
  crop: number[];
  label: string;
}) {
  useLanguage();
  const src = farm.cover === null ? undefined : (farm.cover ?? farm.coverUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed || (farm.coverPath && !src))
    return (
      <div
        className="photo cover-error"
        role="img"
        aria-label={t("No se pudo cargar la portada.")}
      >
        {t("No se pudo cargar la portada.")}
      </div>
    );
  return src ? (
    <img
      className="photo uploaded-photo"
      src={src}
      alt={label}
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <Photo crop={crop} label={label} />
  );
}
