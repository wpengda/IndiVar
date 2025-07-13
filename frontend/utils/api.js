// API utility functions for IndiVar frontend

const API_BASE = '';

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  register: (userData) => apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  login: (credentials) => apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  logout: () => apiCall('/api/auth/logout', {
    method: 'POST'
  }),
  
  getCurrentUser: () => apiCall('/api/auth/me')
};

// Articles API calls
export const articlesAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.primaryCategory && filters.primaryCategory !== 'All') {
      params.append('primary_category', filters.primaryCategory);
    }
    if (filters.secondaryCategory && filters.secondaryCategory !== 'All') {
      params.append('secondary_category', filters.secondaryCategory);
    }
    
    const queryString = params.toString();
    return apiCall(`/api/articles${queryString ? `?${queryString}` : ''}`);
  },
  
  getById: (id) => apiCall(`/api/articles/${id}`),
  
  getPrimaryCategories: () => apiCall('/api/articles/primary-categories'),
  
  getSecondaryCategories: () => apiCall('/api/articles/secondary-categories'),
  
  markAsRead: (id) => apiCall(`/api/articles/${id}/read`, {
    method: 'POST'
  }),
  
  checkReadStatus: (id) => apiCall(`/api/articles/${id}/read`),
  
  getUserReadArticles: () => apiCall('/api/articles/user/read-articles')
}; 