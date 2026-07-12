export interface AuthUser {
  id: string;
  email: string;
  company_id: number;
  role_id: number;
  role: { id: number; name: string };
  employee_id: string | null;
  employee?: {
    id: string;
    full_name: string;
    profile_picture_url?: string;
  } | null;
  company?: {
    company_code: string;
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
  permissions?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  status: string;
  token: string;
  data: {
    user: AuthUser;
  };
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
