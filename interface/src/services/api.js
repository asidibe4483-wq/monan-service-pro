import { API_URL } from '../config';

/**
 * Service centralisé pour l'ensemble des appels API depuis l'interface
 */
export async function apiRequest(endpoint, method = 'GET', body = null, customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Erreur serveur (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API Error] ${method} ${endpoint}:`, error.message);
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Impossible de se connecter au serveur. Veuillez patienter quelques secondes le temps que le serveur réponde.');
    }
    throw error;
  }
}