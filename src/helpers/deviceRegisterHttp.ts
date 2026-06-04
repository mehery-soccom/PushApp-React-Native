const MAX_REGISTER_RETRIES = 4;
const REGISTER_RETRY_DELAY_MS = 1500;

export function isTransientRegisterHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function isDeviceAlreadyExistsResponse(text: string): boolean {
  return /device already exists/i.test(text);
}

/**
 * POST /device/register with retries on transient gateway/server errors (503, etc.).
 */
export async function postDeviceRegister(
  apiBaseUrl: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>
): Promise<{ response: Response; text: string }> {
  let lastResponse!: Response;
  let lastText = '';

  for (let attempt = 1; attempt <= MAX_REGISTER_RETRIES; attempt++) {
    const response = await fetch(`${apiBaseUrl}/device/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    lastResponse = response;
    lastText = text;

    if (response.ok || isDeviceAlreadyExistsResponse(text)) {
      return { response, text };
    }

    const canRetry =
      isTransientRegisterHttpStatus(response.status) &&
      attempt < MAX_REGISTER_RETRIES;

    if (!canRetry) {
      return { response, text };
    }

    const delayMs = REGISTER_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(
      `⚠️ /device/register HTTP ${response.status} — retry ${attempt}/${MAX_REGISTER_RETRIES} in ${delayMs}ms`
    );
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return { response: lastResponse, text: lastText };
}
