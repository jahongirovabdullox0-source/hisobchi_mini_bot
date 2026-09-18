import { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(password);
      setToken(token);
      onSuccess();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">📒</div>
        <h1>Hisobchi Admin</h1>
        <p className="muted">Boshqaruv paneliga kirish uchun parolni kiriting</p>
        <input
          className="input"
          type="password"
          placeholder="Parol"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy || !password}>
          {busy ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
        <p className="muted tiny">Parol .env faylidagi ADMIN_PASSWORD qiymati</p>
      </form>
    </div>
  );
}
