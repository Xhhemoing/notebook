import { AppState } from './types';

export async function pushToCloudflare(state: AppState, url: string, token: string) {
  const endpoint = `${url.replace(/\/$/, '')}/sync`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(state)
  });
  
  if (!response.ok) {
    throw new Error(`Push failed: ${response.statusText}`);
  }
  return response.json();
}

export async function pullFromCloudflare(url: string, token: string): Promise<AppState | null> {
  const endpoint = `${url.replace(/\/$/, '')}/sync`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Pull failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  // If the database is empty, it might return an empty object
  if (Object.keys(data).length === 0 || !data.memories) {
    return null;
  }
  
  return data as AppState;
}
