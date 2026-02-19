declare module "#auth-utils" {
  interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    roles: string;
    isActive: boolean;
  }
}

export {};
