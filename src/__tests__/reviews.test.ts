jest.mock('../features/bookings/Booking.model', () => ({
  Booking: { findById: jest.fn() },
}));
jest.mock('../features/reviews/Review.model', () => ({
  Review: {
    create: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('../features/auth/User.model', () => ({
  User: { findByIdAndUpdate: jest.fn() },
}));

import { Types } from 'mongoose';
import { Booking } from '../features/bookings/Booking.model';
import { Review } from '../features/reviews/Review.model';
import { User } from '../features/auth/User.model';
import {
  reviewsService,
  ReviewError,
  ReviewParticipantError,
} from '../features/reviews/reviews.service';

const riderId = new Types.ObjectId().toString();
const driverId = new Types.ObjectId().toString();
const tripId = new Types.ObjectId().toString();
const bookingId = new Types.ObjectId().toString();

const mockTrip = {
  _id: new Types.ObjectId(tripId),
  driver: { toString: () => driverId },
};

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(bookingId),
    rider: { toString: () => riderId },
    trip: mockTrip,
    status: 'completed',
    updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago, within 48h
    ...overrides,
  };
}

function bookingFindMock(booking: unknown) {
  return { populate: jest.fn().mockResolvedValue(booking) };
}

function findChainMock(result: unknown[]) {
  const limit = jest.fn().mockResolvedValue(result);
  const sort = jest.fn().mockReturnValue({ limit });
  const pop2 = jest.fn().mockReturnValue({ sort });
  const pop1 = jest.fn().mockReturnValue({ populate: pop2 });
  return { populate: pop1 };
}

const mockReview = {
  _id: new Types.ObjectId(),
  booking: new Types.ObjectId(bookingId),
  reviewer: new Types.ObjectId(riderId),
  reviewee: new Types.ObjectId(driverId),
  rating: 5,
  comment: 'Great driver!',
};

beforeEach(() => jest.clearAllMocks());

describe('reviewsService.createReview', () => {
  it('throws ReviewError BOOKING_NOT_FOUND when booking does not exist', async () => {
    (Booking.findById as jest.Mock).mockReturnValue(bookingFindMock(null));
    const err = await reviewsService
      .createReview(riderId, bookingId, 5)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ReviewError);
    expect((err as ReviewError).code).toBe('BOOKING_NOT_FOUND');
  });

  it('throws ReviewError BOOKING_NOT_COMPLETED when booking not completed', async () => {
    (Booking.findById as jest.Mock).mockReturnValue(
      bookingFindMock(makeBooking({ status: 'confirmed' }))
    );
    const err = await reviewsService
      .createReview(riderId, bookingId, 5)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ReviewError);
    expect((err as ReviewError).code).toBe('BOOKING_NOT_COMPLETED');
  });

  it('throws ReviewParticipantError when user is not part of the trip', async () => {
    (Booking.findById as jest.Mock).mockReturnValue(
      bookingFindMock(makeBooking())
    );
    const outsiderId = new Types.ObjectId().toString();
    const err = await reviewsService
      .createReview(outsiderId, bookingId, 5)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ReviewParticipantError);
  });

  it('throws ReviewError WINDOW_EXPIRED when >48h since completion', async () => {
    const old = new Date(Date.now() - 49 * 60 * 60 * 1000); // 49h ago
    (Booking.findById as jest.Mock).mockReturnValue(
      bookingFindMock(makeBooking({ updatedAt: old }))
    );
    const err = await reviewsService
      .createReview(riderId, bookingId, 5)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ReviewError);
    expect((err as ReviewError).code).toBe('WINDOW_EXPIRED');
  });

  it('creates review and updates reviewee avg_rating on success', async () => {
    (Booking.findById as jest.Mock).mockReturnValue(
      bookingFindMock(makeBooking())
    );
    (Review.create as jest.Mock).mockResolvedValue(mockReview);
    (Review.aggregate as jest.Mock).mockResolvedValue([{ avg: 4.5, count: 3 }]);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    const result = await reviewsService.createReview(riderId, bookingId, 5, 'Great!');
    expect(Review.create).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, comment: 'Great!' })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      driverId,
      expect.objectContaining({ avg_rating: 4.5, review_count: 3 })
    );
    expect(result).toEqual(mockReview);
  });

  it('driver reviewing rider sets reviewee to rider', async () => {
    (Booking.findById as jest.Mock).mockReturnValue(
      bookingFindMock(makeBooking())
    );
    (Review.create as jest.Mock).mockResolvedValue(mockReview);
    (Review.aggregate as jest.Mock).mockResolvedValue([{ avg: 3, count: 1 }]);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    await reviewsService.createReview(driverId, bookingId, 4);
    const createCall = (Review.create as jest.Mock).mock.calls[0][0];
    expect(createCall.reviewer.toString()).toBe(driverId);
    expect(createCall.reviewee.toString()).toBe(riderId);
  });
});

describe('reviewsService.getReviewsForUser', () => {
  it('queries by reviewee when type is received', async () => {
    (Review.find as jest.Mock).mockReturnValue(findChainMock([mockReview]));
    const result = await reviewsService.getReviewsForUser(driverId, 'received');
    const query = (Review.find as jest.Mock).mock.calls[0][0];
    expect(query.reviewee.toString()).toBe(driverId);
    expect(result).toEqual([mockReview]);
  });

  it('queries by reviewer when type is given', async () => {
    (Review.find as jest.Mock).mockReturnValue(findChainMock([mockReview]));
    await reviewsService.getReviewsForUser(riderId, 'given');
    const query = (Review.find as jest.Mock).mock.calls[0][0];
    expect(query.reviewer.toString()).toBe(riderId);
  });
});
