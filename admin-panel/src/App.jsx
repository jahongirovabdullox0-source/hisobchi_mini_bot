import { useEffect, useState } from 'react';
import { getToken, onUnauthorized, setToken } from './api';
import { useHashRoute } from './hooks';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Sectors from './pages/Sectors';
import Rates from './pages/Rates';
import Broadcast from './pages/Broadcast';

const PAGES = {
  dashboard: Dashboard,
  transactions: Transactions,
  users: Users,
  sectors: Sectors,
  rates: Rates,
  broadcast: Broadcast,
};

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const route = useHashRoute();

  useEffect(() => {
    onUnauthorized(() => setAuthed(false));
  }, []);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const Page = PAGES[route.path] || Dashboard;
  const current = PAGES[route.path] ? route.path : 'dashboard';

  return (
    <Layout
      current={current}
      onLogout={() => {
        setToken('');
        setAuthed(false);
      }}
    >
      <Page key={`${current}?${new URLSearchParams(route.query).toString()}`} query={route.query} />
    </Layout>
  );
}
