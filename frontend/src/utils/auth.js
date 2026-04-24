export const getToken = () => {
    return localStorage.getItem('accessToken');
};

export const saveToken = (token) => {
    localStorage.setItem('accessToken', token.access);
};

export const removeToken = () => {
    localStorage.removeItem('accessToken');
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const authFetch = async (endpoint, options = {}) => {
    let token = getToken();

    const headers = new Headers(options.headers || {});
    
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
    }

    const config = {
        ...options,
        headers,
    };

    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    let response = await fetch(`${API_BASE_URL}${url}`, config);

    if (response.status === 401) {
        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                saveToken(data); 
                
                config.headers.set('Authorization', `Bearer ${data.access}`);
                response = await fetch(`${API_BASE_URL}${url}`, config);
            } else {
                removeToken();
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            removeToken();
        }
    }

    return response;
};