declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        name?: string;
        role: 'driver' | 'rider' | 'admin';
        phone?: string;
        status?: 'active' | 'suspended';
        fcm_token?: string;
      };
      adminRole?: 'admin';
    }
  }
}

export {};
