const REMEMBER_EXPIRY_KEY = 'remember_expiry';
const REMEMBER_FLAG_KEY = 'remember_me';
const TOKEN_KEY = 'token';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const tokenStorage = {
  getToken(): string | null {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;

    const localToken = localStorage.getItem(TOKEN_KEY);
    if (!localToken) return null;

    const expiry = localStorage.getItem(REMEMBER_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      this.removeToken();
      return null;
    }

    return localToken;
  },

  setToken(token: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_EXPIRY_KEY, String(Date.now() + THIRTY_DAYS_MS));
      localStorage.setItem(REMEMBER_FLAG_KEY, 'true');
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_EXPIRY_KEY);
    localStorage.removeItem(REMEMBER_FLAG_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};
