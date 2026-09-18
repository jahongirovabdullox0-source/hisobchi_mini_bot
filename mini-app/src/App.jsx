import { useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import { useApp } from './context/AppContext';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Stats from './pages/Stats';
import Debts from './pages/Debts';
import Profile from './pages/Profile';
import History from './pages/History';
import SectorDetail from './pages/SectorDetail';
import TransactionForm from './sheets/TransactionForm';
import TransactionView from './sheets/TransactionView';
import DebtForm from './sheets/DebtForm';
import DebtView from './sheets/DebtView';
import BudgetForm from './sheets/BudgetForm';
import ExportSheet from './sheets/ExportSheet';
import PeriodSheet from './sheets/PeriodSheet';

const TABS = { home: Home, stats: Stats, debts: Debts, profile: Profile };
const PAGES = { history: History, sector: SectorDetail };
const SHEETS = {
  'tx-form': TransactionForm,
  'tx-view': TransactionView,
  'debt-form': DebtForm,
  'debt-view': DebtView,
  'budget-form': BudgetForm,
  export: ExportSheet,
  period: PeriodSheet,
};

function localOnboarded() {
  try {
    return localStorage.getItem('hisobchi:onboarded') === '1';
  } catch {
    return false;
  }
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo">📒</div>
      <div className="splash-name">Hisobchi</div>
      <div className="spinner" />
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="splash">
      <div className="splash-logo">⚠️</div>
      <div className="splash-name">Ulanib bo'lmadi</div>
      <p className="muted center pad-x">{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>
        Qayta urinish
      </button>
    </div>
  );
}

function SheetHost() {
  const { sheet } = useApp();
  if (!sheet) return null;
  const Comp = SHEETS[sheet.name];
  return Comp ? <Comp key={sheet.key} {...sheet.props} /> : null;
}

export default function App() {
  const { status, reload, user, tab, stack } = useApp();
  const [skipOnboarding, setSkipOnboarding] = useState(false);
  const onboarded = user ? user.onboarded : true;

  // "Tanishuvni qayta ko'rish" bosilganda onboarding yana ko'rsatiladi
  useEffect(() => {
    if (!onboarded) setSkipOnboarding(false);
  }, [onboarded]);

  if (!user) {
    if (status.error) return <ErrorScreen message={status.error} onRetry={reload} />;
    return <Splash />;
  }

  const needOnboarding = !user.onboarded && !skipOnboarding && !localOnboarded();
  if (needOnboarding) return <Onboarding onDone={() => setSkipOnboarding(true)} />;

  const top = stack[stack.length - 1];
  const Page = top ? PAGES[top.name] : TABS[tab] || Home;

  return (
    <div className={`app${top ? ' inner' : ''}`}>
      <main key={top ? `${top.name}-${stack.length}` : tab} className="fade-in">
        <Page params={top ? top.params : undefined} />
      </main>
      {!top && <BottomNav />}
      <SheetHost />
      <Toast />
    </div>
  );
}
