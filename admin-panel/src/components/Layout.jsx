import { navigate } from '../hooks';

const NAV = [
  { path: 'dashboard', label: 'Boshqaruv paneli', icon: '📊' },
  { path: 'transactions', label: 'Amallar', icon: '🧾' },
  { path: 'users', label: 'Foydalanuvchilar', icon: '👥' },
  { path: 'sectors', label: "Yo'nalishlar", icon: '🗂' },
  { path: 'rates', label: 'Valyuta kurslari', icon: '💱' },
  { path: 'broadcast', label: 'Xabar yuborish', icon: '📢' },
];

export default function Layout({ current, onLogout, children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">📒</span>
          <div>
            <div className="brand-name">Hisobchi</div>
            <div className="muted tiny">Admin Panel</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.path}
              className={`nav-link${current === item.path ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <button className="nav-link logout" onClick={onLogout}>
          <span className="nav-icon">🚪</span>
          Chiqish
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
