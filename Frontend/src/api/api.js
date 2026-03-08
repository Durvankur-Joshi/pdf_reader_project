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
        return Promise.reject(error);
    }
);

export default API;