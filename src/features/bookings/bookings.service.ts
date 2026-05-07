export const bookingsService = {
  async createBooking(_data: unknown): Promise<unknown> { return null; },
  async getBookingsForRider(_riderId: string): Promise<unknown[]> { return []; },
  async getBookingsForTrip(_tripId: string): Promise<unknown[]> { return []; },
  async updateStatus(_id: string, _status: string): Promise<unknown> { return null; },
};
