import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { User } from '../features/auth/User.model';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const token = header.slice(7);
  let userId: string;
  try {
    const payload = verifyToken(token);
    userId = payload._id;
  } catch {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  let user: { _id: unknown; name: string; role: 'driver' | 'rider' | 'admin'; status: 'active' | 'suspended'; fcm_token?: string } | null;
  try {
    user = await User.findById(userId)
      .select('_id name role status fcm_token')
      .lean<{ _id: unknown; name: string; role: 'driver' | 'rider' | 'admin'; status: 'active' | 'suspended'; fcm_token?: string }>();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (!user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account suspended' });
    return;
  }
  req.user = {
    _id: String(user._id),
    name: user.name,
    role: user.role,
    status: user.status,
    fcm_token: user.fcm_token,
  };
  next();
}
