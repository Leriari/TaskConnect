import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';

export default function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const auth = getAuth(app);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      let message = 'An error occurred. Please try again.';
      if (err.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      setError(message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #f7fafc 0%, #e0e7ff 100%)' }}>
      <form onSubmit={handleLogin} style={{ minWidth: 340, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(60,72,100,0.10)', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <h2 style={{ fontWeight: 800, fontSize: 28, color: '#2E7D32', marginBottom: 12, letterSpacing: 1 }}>Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: '12px 16px', fontSize: 16, borderRadius: 8, border: '1px solid #d1d5db', width: '100%', outline: 'none', transition: 'border 0.2s', boxShadow: 'none' }}
          onFocus={e => e.currentTarget.style.border = '#2E7D32 2px solid'}
          onBlur={e => e.currentTarget.style.border = '1px solid #d1d5db'}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: '12px 16px', fontSize: 16, borderRadius: 8, border: '1px solid #d1d5db', width: '100%', outline: 'none', transition: 'border 0.2s', boxShadow: 'none' }}
          onFocus={e => e.currentTarget.style.border = '#2E7D32 2px solid'}
          onBlur={e => e.currentTarget.style.border = '1px solid #d1d5db'}
        />
        <button type="submit" style={{ padding: '12px 0', fontSize: 17, background: 'linear-gradient(90deg, #2E7D32 0%, #10B981 100%)', color: '#fff', border: 'none', borderRadius: 8, width: '100%', fontWeight: 700, letterSpacing: 1, boxShadow: '0 2px 8px rgba(16,185,129,0.08)', cursor: 'pointer', transition: 'background 0.2s' }}>Login</button>
        {error && <div style={{ color: '#ef4444', marginTop: 8, fontWeight: 500 }}>{error}</div>}
      </form>
    </div>
  );
} 