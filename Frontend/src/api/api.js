import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000',
})

API.interceptors.response.use(
    response => response,
    error => {
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout');
            return Promise.reject(new Error('Request timed out. Please try again.'));
        }
        if (!error.response) {
            console.error('Network error - backend not reachable');
            return Promise.reject(new Error('Cannot connect to server. Make sure backend is running.'));
        }
        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            delete API.defaults.headers.common['Authorization'];
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API;