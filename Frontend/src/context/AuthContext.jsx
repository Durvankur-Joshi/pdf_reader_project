import { createContext, useState, useContext, useEffect } from 'react';
import API from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            // Set default authorization header
            API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await API.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            // Using form data for OAuth2 compatible endpoint
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await API.post('/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const { access_token, user } = response.data;
            
            localStorage.setItem('token', access_token);
            API.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            setToken(access_token);
            setUser(user);
            
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Login failed'
            };
        }
    };

    const signup = async (email, password) => {
        try {
            const response = await API.post('/auth/signup', {
                email,
                password
            });

            const { access_token, user } = response.data;
            
            localStorage.setItem('token', access_token);
            API.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            setToken(access_token);
            setUser(user);
            
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Signup failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete API.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};