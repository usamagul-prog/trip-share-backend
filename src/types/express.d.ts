declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        role: 'driver' | 'rider' | 'admin';
        phone: string;
      };
    }
  }
}

export {};
