import { useCallback, useEffect, useRef, useState } from 'react';

/** Ma'lumot yuklash (+ ixtiyoriy avtomatik yangilanish) */
export function useLoad(loader, deps = [], { interval = 0 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null, updatedAt: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const run = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === seq.current) setState({ data, loading: false, error: null, updatedAt: new Date() });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  useEffect(() => {
    if (!interval) return undefined;
    const t = setInterval(() => {
      if (!document.hidden) run(true);
    }, interval);
    return () => clearInterval(t);
  }, [interval, run]);

  return { ...state, reload: run };
}

/** #/sahifa?kalit=qiymat ko'rinishidagi marshrut */
export function useHashRoute() {
  const parse = () => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    return { path: path || 'dashboard', query: Object.fromEntries(new URLSearchParams(query)) };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path, query) {
  const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '')).toString() : '';
  window.location.hash = `#/${path}${qs ? `?${qs}` : ''}`;
}
