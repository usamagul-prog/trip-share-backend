import { signToken, verifyToken } from '../utils/jwt';

describe('JWT utils', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len'; });
  afterAll(() => { delete process.env.JWT_SECRET; });

  it('signs a token and verifies it', () => {
    const token = signToken({ _id: 'abc', role: 'rider', email: 'test@demo.com' });
    const decoded = verifyToken(token) as { _id: string; role: string };
    expect(decoded._id).toBe('abc');
    expect(decoded.role).toBe('rider');
  });

  it('throws on tampered token', () => {
    expect(() => verifyToken('bad.token.value')).toThrow();
  });

  it('throws when JWT_SECRET is missing', () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => signToken({ _id: '1' })).toThrow('JWT_SECRET');
    process.env.JWT_SECRET = saved!;
  });
});
