import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { client } from "@/lib/api";

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

/** Retry a function with exponential backoff */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      // Check if it's a transient network/DNS error worth retrying
      const message =
        err instanceof Error ? err.message : String(err ?? "");
      const isTransient =
        message.includes("dns") ||
        message.includes("timeout") ||
        message.includes("network") ||
        message.includes("ECONNREFUSED") ||
        message.includes("fetch") ||
        (typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status: number }).status >= 500);

      if (!isTransient || attempt === maxRetries) {
        throw lastError;
      }
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await withRetry(() => client.auth.me(), 3, 1000);
        if (res?.data) {
          setUser(res.data as User);
        }
      } catch {
        // After all retries failed, treat as unauthenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async () => {
    try {
      await withRetry(() => client.auth.toLogin(), 2, 1000);
    } catch {
      // If login redirect fails after retries, reload to try again
      window.location.reload();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.auth.logout();
    } catch {
      // Logout failure is non-critical
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}