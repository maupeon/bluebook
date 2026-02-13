export async function parseJsonSafe<T = unknown>(response: Response): Promise<{
  data: T | null;
  raw: string;
}> {
  const raw = await response.text();

  if (!raw) {
    return { data: null, raw: "" };
  }

  try {
    return { data: JSON.parse(raw) as T, raw };
  } catch {
    return { data: null, raw };
  }
}

export function summarizeHttpError(
  status: number,
  rawBody: string,
  fallbackMessage: string
): string {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return `${fallbackMessage} (HTTP ${status})`;
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return `${fallbackMessage} (HTTP ${status})`;
  }

  return `${fallbackMessage} (HTTP ${status}): ${trimmed.slice(0, 140)}`;
}
