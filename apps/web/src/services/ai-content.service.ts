const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export async function generateSchedule(
  orgId: string,
  description: string
): Promise<{ content: string }> {
  const res = await fetch(`${API_BASE}/organizations/${orgId}/ai/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'schedule', text: description }),
  });
  const data = (await res.json()) as {
    success: boolean;
    data?: { content: string };
    error?: { message: string };
  };
  if (!data.success) throw new Error(data.error?.message ?? 'Schedule generation failed');
  return data.data!;
}

export async function generateTodos(
  orgId: string,
  description: string
): Promise<{ content: string }> {
  const res = await fetch(`${API_BASE}/organizations/${orgId}/ai/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'todos', text: description }),
  });
  const data = (await res.json()) as {
    success: boolean;
    data?: { content: string };
    error?: { message: string };
  };
  if (!data.success) throw new Error(data.error?.message ?? 'To-do generation failed');
  return data.data!;
}

export async function createAiDatabase(
  orgId: string,
  description: string
): Promise<{ databaseId: string; name: string; propertyCount: number }> {
  const res = await fetch(`${API_BASE}/organizations/${orgId}/ai/database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ description }),
  });
  const data = (await res.json()) as {
    success: boolean;
    data?: { databaseId: string; name: string; propertyCount: number };
    error?: { message: string };
  };
  if (!data.success) throw new Error(data.error?.message ?? 'Database creation failed');
  return data.data!;
}
