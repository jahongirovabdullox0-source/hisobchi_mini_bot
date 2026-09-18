import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Ma'lumot yuklash hook'i. Oldingi ma'lumot yangilanish paytida saqlanib turadi.
 * App'dagi `refresh()` chaqirilganda avtomatik qayta yuklanadi.
 */
export function useApi(loader, deps = []) {
  const { version } = useApp();
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, version, ...deps]);

  return { ...state, reload: run };
}
