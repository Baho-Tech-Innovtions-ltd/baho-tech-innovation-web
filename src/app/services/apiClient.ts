const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

type RequestOptions = RequestInit & {
  authToken?: string | null;
  query?: Record<string, string | number | undefined | null>;
  timeout?: number;
  retryable?: boolean;
};

function normalizeErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => normalizeErrorMessage(item, ""))
      .filter(Boolean)
      .join("; ");

    if (joined) return joined;
  }

  if (value && typeof value === "object") {
    const maybeMessage = value instanceof Error ? value.message : null;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }

    const directError = (value as { error?: unknown }).error;
    if (directError !== undefined) {
      const normalized = normalizeErrorMessage(directError, "");
      if (normalized) return normalized;
    }

    const directMessage = (value as { message?: unknown }).message;
    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage.trim();
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // Ignore serialization failures and fall back to the provided fallback.
    }
  }

  return fallback;
}

/**
 * Custom error class for API errors with status codes
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  timestamp?: string;
  isNetworkError: boolean;
  isTimeout: boolean;

  constructor(
    message: string,
    status: number,
    code?: string,
    timestamp?: string,
    isNetworkError = false,
    isTimeout = false
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.timestamp = timestamp;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
  }
}

/**
 * Build a complete URL with query parameters
 */
function buildUrl(
  path: string,
  query?: RequestOptions["query"]
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(
    `${API_BASE_URL}${normalizedPath}`,
    window.location.origin
  );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Make an API request with timeout, retry, and automatic error handling
 * 
 * @param path - API endpoint path (e.g., "/auth/login")
 * @param options - Request options including method, body, auth token, etc.
 * @returns Promise with typed response data
 * @throws ApiError - If the request fails after retries
 * 
 * Features:
 * - Automatic timeout after 30 seconds
 * - Automatic retry on network failures (max 2 retries)
 * - Structured error responses with codes
 * - Type-safe responses
 */
async function fetchWithTimeout(
  url: string,
  fetchOptions: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        "Request timeout - server took too long to respond",
        0,
        "TIMEOUT_ERROR",
        undefined,
        false,
        true
      );
    }
    throw error;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  retryCount = 0
): Promise<T> {
  const { 
    authToken, 
    query, 
    headers, 
    body, 
    timeout = REQUEST_TIMEOUT,
    retryable = true,
    ...requestOptions 
  } = options;
  
  const url = buildUrl(path, query);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...requestOptions,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...headers,
        },
        body,
      },
      timeout
    );

    // Parse response body (might be JSON or text)
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      // If JSON parsing fails, try text
      const text = await response.text();
      payload = text ? { error: text } : null;
    }

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = normalizeErrorMessage(
        payload?.error ?? payload?.message ?? payload,
        `Request failed with status ${response.status}`
      );
      const errorCode = payload?.code || "API_ERROR";
      const timestamp = payload?.timestamp;

      // Log error details for debugging
      if (response.status >= 500) {
        console.error(`[API Error 500+] ${path}:`, {
          status: response.status,
          message: errorMessage,
          code: errorCode,
        });
      }

      throw new ApiError(
        errorMessage,
        response.status,
        errorCode,
        timestamp
      );
    }

    return payload as T;
  } catch (error) {
    // If it's already an ApiError, check if we should retry
    if (error instanceof ApiError) {
      // Retry on network errors and timeouts
      if (
        retryable &&
        retryCount < MAX_RETRIES &&
        (error.isNetworkError || error.isTimeout)
      ) {
        console.warn(
          `[Retry ${retryCount + 1}/${MAX_RETRIES}] ${path} - ${error.message}`
        );
        
        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (retryCount + 1))
        );
        
        return apiRequest<T>(path, options, retryCount + 1);
      }
      throw error;
    }

    // Network or parsing error
    const isNetworkError = error instanceof TypeError;
    const message = isNetworkError
      ? "Failed to connect to server. Please check your connection and that the API is running."
      : error instanceof Error
      ? error.message
      : "Unknown error occurred. Please try again.";

    // Retry on network errors
    if (
      retryable &&
      retryCount < MAX_RETRIES &&
      isNetworkError
    ) {
      console.warn(
        `[Retry ${retryCount + 1}/${MAX_RETRIES}] ${path} - Network error`
      );
      
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * (retryCount + 1))
      );
      
      return apiRequest<T>(path, options, retryCount + 1);
    }

    throw new ApiError(
      message,
      0, // 0 indicates network/client error, not HTTP status
      "NETWORK_ERROR",
      undefined,
      isNetworkError
    );
  }
}

/**
 * Check API health status
 * Useful for monitoring and connectivity checks
 */
export async function checkApiHealth(): Promise<{ ok: boolean }> {
  try {
    return await apiRequest("/health", { method: "GET" });
  } catch (error) {
    return { ok: false };
  }
}

/**
 * Get the current API base URL being used
 * Useful for debugging
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

