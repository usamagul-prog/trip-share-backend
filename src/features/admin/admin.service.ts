import { signAdminToken } from '../../utils/jwt';

export class AdminLoginError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'AdminLoginError';
  }
}

export class SuspendAdminError extends Error {
  constructor() {
    super('Cannot suspend admin accounts');
    this.name = 'SuspendAdminError';
  }
}

export const adminService = {
  loginAdmin(username: string, password: string): string {
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      throw new AdminLoginError();
    }
    return signAdminToken();
  },
};
