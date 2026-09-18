import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { backButton, haptic } from '../lib/telegram';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

let sheetSeq = 0;

export function AppProvider({ children }) {
  const [status, setStatus] = useState({ loading: true, error: null });
  const [user, setUser] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [rates, setRates] = useState([]);
  const [currencies, setCurrencies] = useState(['UZS']);
  const [bot, setBot] = useState({ enabled: false, webApp: false });
  const [tab, setTabState] = useState('home');
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const sheetCloseRef = useRef(null);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setStatus({ loading: true, error: null });
    try {
      const data = await api.bootstrap();
      setUser(data.user);
      setSectors(data.sectors || []);
      setRates(data.rates || []);
      setCurrencies(data.currencies || ['UZS']);
      setBot(data.bot || { enabled: false, webApp: false });
      setStatus({ loading: false, error: null });
    } catch (e) {
      setStatus({ loading: false, error: e.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Ma'lumotlar o'zgarganda barcha sahifalarni yangilash */
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const showToast = useCallback((text, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const updateUser = useCallback(async (patch) => {
    const res = await api.updateMe(patch);
    setUser((u) => ({ ...u, ...res.user }));
    return res.user;
  }, []);

  /* --------------------------- Navigatsiya --------------------------- */
  const setTab = useCallback((t) => {
    setStack([]);
    setTabState(t);
    window.scrollTo(0, 0);
    haptic.select();
  }, []);

  const push = useCallback((name, params = {}) => {
    setStack((s) => [...s, { name, params }]);
    window.scrollTo(0, 0);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1));
    window.scrollTo(0, 0);
  }, []);

  /* --------------------------- Bottom sheet --------------------------- */
  const openSheet = useCallback((name, props = {}) => {
    sheetSeq += 1;
    sheetCloseRef.current = null;
    setSheet({ name, props, key: sheetSeq });
  }, []);

  const closeSheet = useCallback((key) => {
    setSheet((s) => {
      if (!s) return s;
      if (key !== undefined && s.key !== key) return s;
      sheetCloseRef.current = null;
      return null;
    });
  }, []);

  const registerSheetClose = useCallback((fn) => {
    sheetCloseRef.current = fn;
  }, []);

  /* --------------------------- Telegram "Orqaga" --------------------------- */
  useEffect(() => {
    if (!sheet && stack.length === 0) return undefined;
    const handler = () => {
      if (sheetCloseRef.current) sheetCloseRef.current();
      else {
        setStack((s) => s.slice(0, -1));
        window.scrollTo(0, 0);
      }
    };
    backButton.show(handler);
    return () => backButton.hide(handler);
  }, [sheet, stack.length]);

  const sectorsById = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);
  const ratesMap = useMemo(() => {
    const m = { UZS: 1 };
    rates.forEach((r) => (m[r.code] = Number(r.rate)));
    return m;
  }, [rates]);

  const value = useMemo(
    () => ({
      status,
      reload: load,
      user,
      updateUser,
      sectors,
      sectorsById,
      rates,
      ratesMap,
      currencies,
      bot,
      tab,
      setTab,
      stack,
      push,
      pop,
      sheet,
      openSheet,
      closeSheet,
      registerSheetClose,
      version,
      refresh,
      toast,
      showToast,
    }),
    [status, load, user, updateUser, sectors, sectorsById, rates, ratesMap, currencies, bot, tab, setTab, stack, push, pop, sheet, openSheet, closeSheet, registerSheetClose, version, refresh, toast, showToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
