import { useEffect, useState } from "react";
import { useUzta } from "../app-context";
import { emptyMarkets } from "../lib/markets";
import { loadMarkets } from "../lib/market-api";
export function useMarkets() {
  const { userId } = useUzta();
  const [data, setData] = useState(emptyMarkets);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(emptyMarkets());
    setLoading(true);
    setError("");
    void loadMarkets()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision, userId]);
  return { data, error, loading, reload: () => setRevision((n) => n + 1) };
}
