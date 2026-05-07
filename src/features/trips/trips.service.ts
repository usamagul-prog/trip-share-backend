export const tripsService = {
  async createTrip(_data: unknown): Promise<unknown> { return null; },
  async searchTrips(_origin: string, _destination: string, _date: string): Promise<unknown[]> { return []; },
  async getTripById(_id: string): Promise<unknown> { return null; },
  async cancelTrip(_id: string, _driverId: string): Promise<unknown> { return null; },
};
