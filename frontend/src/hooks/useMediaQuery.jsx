import { useEffect, useState } from "react";

export function useMediaQuery(query) {
  const getMatch = () => window.matchMedia(query).matches;

  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false; // SSR-safe
    return getMatch();
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    // сразу синхронизируем
    onChange();

    // поддержка старых браузеров
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}
