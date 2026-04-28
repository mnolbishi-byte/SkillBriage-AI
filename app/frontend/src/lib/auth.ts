import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAPIBaseURL } from './config';

/** Check if an error is a transient network/DNS issue worth retrying */
function isTransientError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    // Network errors (DNS, timeout, connection refused)
    if (!error.response) return true;
    // Server errors (5xx)
    if (error.response.status >= 500) return true;
  }
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return (
    msg.includes('dns') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('ECONNREFUSED')
  );
}

/** Retry an async function with exponential backoff */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      timeout: 15000, // 15s timeout per request
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async getCurrentUser() {
    try {
      const response = await withRetry(
        () => this.client.get(`${this.getBaseURL()}/api/v1/auth/me`),
        2,
        1000
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return null;
      }
      throw new Error(
        (error instanceof AxiosError
          ? error.response?.data?.detail
          : undefined) || 'Failed to get user info'
      );
    }
  }

  async login() {
    try {
      const response = await withRetry(
        () => this.client.get(`${this.getBaseURL()}/api/v1/auth/login`),
        2,
        1000
      );
      window.location.href = response.data.redirect_url;
    } catch (error) {
      throw new Error(
        (error instanceof AxiosError
          ? error.response?.data?.detail
          : undefined) || 'Failed to initiate login'
      );
    }
  }

  async logout() {
    try {
      const response = await withRetry(
        () => this.client.get(`${this.getBaseURL()}/api/v1/auth/logout`),
        1,
        1000
      );
      window.location.href = response.data.redirect_url;
    } catch (error) {
      throw new Error(
        (error instanceof AxiosError
          ? error.response?.data?.detail
          : undefined) || 'Failed to logout'
      );
    }
  }
}

export const authApi = new RPApi();
