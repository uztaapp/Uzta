const SITE = "https://uzta-nu.vercel.app";
export function producerPublicUrl(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw Error("Esta tienda de demostración no tiene un enlace público real.");
  const url = new URL("/productor", SITE);
  url.searchParams.set("tienda", id);
  return url.href;
}
