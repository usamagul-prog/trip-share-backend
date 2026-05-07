export const authService = {
  async verifyFirebaseToken(_idToken: string): Promise<string> {
    // TODO: use firebase-admin to verify token, return phone
    return '';
  },
  async findOrCreateUser(_phone: string, _name: string, _role: string): Promise<unknown> {
    // TODO: upsert User document
    return null;
  },
};
