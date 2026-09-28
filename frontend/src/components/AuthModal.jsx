import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthModal({ isOpen, onClose }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const cleanEmail = email.trim().toLowerCase();
        const payload = { email: cleanEmail, password };

        try {
            if (isSignUp) {
                const res = await register(payload);
                if (res.success) {
                    setIsSignUp(false);
                    setError('Account created! Please sign in with your credentials.');
                } else {
                    setError(res.error);
                }
            } else {
                const res = await login(payload);
                if (res.success) {
                    onClose();
                } else {
                    setError(res.error);
                }
            }
        } catch (err) {
            console.error('Auth Request Failed:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-card" style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                padding: '24px', width: '360px', color: '#fff'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>

                {error && (
                    <div style={{
                        background: error.includes('Account created') ? '#064e3b' : '#450a0a',
                        border: `1px solid ${error.includes('Account created') ? '#059669' : '#991b1b'}`,
                        color: error.includes('Account created') ? '#a7f3d0' : '#fca5a5',
                        padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                        <input
                            type="email"
                            required
                            className="form-input"
                            style={{ width: '100%' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>PASSWORD</label>
                        <input
                            type="password"
                            required
                            className="form-input"
                            style={{ width: '100%' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
                        {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthModal;