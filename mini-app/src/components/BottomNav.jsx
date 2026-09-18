import { useApp } from '../context/AppContext';
import { haptic } from '../lib/telegram';
import Icon from './Icon';

const ITEMS = [
  { id: 'home', label: 'Asosiy', icon: 'home' },
  { id: 'stats', label: 'Hisobot', icon: 'chart' },
  { id: 'add' },
  { id: 'debts', label: 'Qarzlar', icon: 'users' },
  { id: 'profile', label: 'Profil', icon: 'user' },
];

export default function BottomNav() {
  const { tab, setTab, openSheet } = useApp();

  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) =>
        item.id === 'add' ? (
          <button
            key="add"
            className="nav-fab"
            aria-label="Amal qo'shish"
            onClick={() => {
              haptic.medium();
              openSheet('tx-form', { type: 'EXPENSE' });
            }}
          >
            <Icon name="plus" size={26} stroke={2.4} />
          </button>
        ) : (
          <button
            key={item.id}
            className={`nav-item${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={22} stroke={tab === item.id ? 2.3 : 1.9} />
            <span>{item.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
