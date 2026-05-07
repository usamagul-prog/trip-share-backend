export const notificationsService = {
  async getForUser(_userId: string): Promise<unknown[]> { return []; },
  async markRead(_id: string): Promise<unknown> { return null; },
};
