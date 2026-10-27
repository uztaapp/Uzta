import { t, useLanguage } from "../lib/language";
import { useRef, useState, useEffect } from "react";
import { optimizeImage } from "../lib/image-optimize";
import { photoDataUrl } from "../lib/product-photo";
import { Photo } from "./presentation";
import type { Product } from "../lib/local-model";
export function ProductPhotoEditor({
  product,
  onChange,
  onPending,
}: {
  product: Product;
  onChange: (src: string | null) => void;
  onPending: (pending: boolean) => void;
}) {
  useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current++;
      onPending(false);
    };
  }, [onPending]);
  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const current = ++sequence.current;
    setPending(true);
    onPending(true);
    setError("");
    try {
      const result = await optimizeImage(file);
      const src = await photoDataUrl(result.full);
      if (alive.current && current === sequence.current) onChange(src);
    } catch (e) {
      if (alive.current && current === sequence.current)
        setError(
          e instanceof Error ? e.message : "No se pudo preparar la foto.",
        );
    } finally {
      if (alive.current && current === sequence.current) {
        setPending(false);
        onPending(false);
      }
    }
  }
  return (
    <section className="photo-editor" aria-label={t("Fotografía del producto")}>
      <Photo
        src={product.photo === undefined ? product.photoUrl : product.photo}
        crop={product.photo === null ? [0, 0, 0, 0] : product.crop}
        label={product.name || "Producto"}
      />
      <label>
        {t("Fotografía del producto")}
        <input
          aria-label="Elegir fotografía"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(e) => void choose(e.currentTarget)}
        />
      </label>
      {pending ? <p role="status">{t("Preparando fotografía…")}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {product.photo !== null ? (
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={() => {
            setError("");
            onChange(null);
          }}
        >
          {t("Retirar fotografía")}
        </button>
      ) : null}
      <p className="subtle">
        {t(
          "JPG, PNG o WebP. Se reduce el tamaño y se eliminan los metadatos de ubicación. La foto se guarda al pulsar Guardar producto.",
        )}
      </p>
    </section>
  );
}
