import type { AuthUser } from "@/features/auth/domain/auth-user";

const AUTH_STORAGE_KEY = "msme-auth-user";

export function loadAuthFromStorage(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser> & { email?: string };

    if (!parsed.name) {
      return null;
    }

    return {
      name: parsed.name,
      mobileNumber: parsed.mobileNumber ?? parsed.email ?? "",
      profilePic: parsed.profilePic ?? parsed.profilePic,
    };
  } catch {
    return null;
  }
}

export function saveAuthToStorage(user: AuthUser | null) {
  if (user) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
