import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [businessName, setBusinessName] = useState(localStorage.getItem('businessName'));
  const [email, setEmail] = useState(localStorage.getItem('email'));

  const persistSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('businessName', data.businessName);
    localStorage.setItem('email', data.email);
    setToken(data.token);
    setBusinessName(data.businessName);
    setEmail(data.email);
  };

  const login = async (emailInput, password) => {
    const res = await api.post('/auth/login', { email: emailInput, password });
    persistSession(res.data);
  };

  const signup = async ({ businessName: name, email: emailInput, password, mobile }) => {
    const res = await api.post('/auth/signup', {
      businessName: name,
      email: emailInput,
      password,
      mobile
    });
    persistSession(res.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('businessName');
    localStorage.removeItem('email');
    setToken(null);
    setBusinessName(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, businessName, email, login, signup, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
