import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(localStorage.getItem('user') || null);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', user);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }, [token, user]);

    // LOGIN FUNCTION: Expects { email, password }
    const login = async (credentials) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok && data.token) {
                setToken(data.token);
                setUser(data.email || credentials.email);
                return { success: true };
            } else {
                return { success: false, error: data.error || data.message || 'Invalid credentials' };
            }
        } catch (err) {
            return { success: false, error: 'Server connection failed' };
        }
    };

    // REGISTER FUNCTION: Expects { email, password }
    const register = async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error || data.message || 'Registration failed' };
            }
        } catch (err) {
            return { success: false, error: 'Server connection failed' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);