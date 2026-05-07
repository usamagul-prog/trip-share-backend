import { Types } from 'mongoose';
import { Booking } from '../bookings/Booking.model';
import { Review, IReview } from './Review.model';
import { User } from '../auth/User.model';

export class ReviewError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReviewError';
    this.code = code;
  }
}

export class ReviewParticipantError extends Error {
  constructor() {
    super('You were not part of this trip');
    this.name = 'ReviewParticipantError';
  }
}

export const reviewsService = {
  async createReview(
    reviewerId: string,
    bookingId: string,
    rating: number,
    comment?: string
  ): Promise<IReview> {
    const booking = await Booking.findById(bookingId).populate('trip');
    if (!booking) throw new ReviewError('Booking not found', 'BOOKING_NOT_FOUND');
    if (booking.status !== 'completed') {
      throw new ReviewError('Booking is not completed', 'BOOKING_NOT_COMPLETED');
    }

    const trip = booking.trip as unknown as { driver: { toString(): string } };
    const riderId = booking.rider.toString();
    const driverId = trip.driver.toString();

    let revieweeId: string;
    if (reviewerId === riderId) {
      revieweeId = driverId;
    } else if (reviewerId === driverId) {
      revieweeId = riderId;
    } else {
      throw new ReviewParticipantError();
    }

    const windowMs = 48 * 60 * 60 * 1000;
    const completedAt = (booking as unknown as { updatedAt: Date }).updatedAt;
    if (Date.now() - completedAt.getTime() > windowMs) {
      throw new ReviewError('Review window has closed', 'WINDOW_EXPIRED');
    }

    const review = await Review.create({
      booking: new Types.ObjectId(bookingId),
      reviewer: new Types.ObjectId(reviewerId),
      reviewee: new Types.ObjectId(revieweeId),
      rating,
      comment,
      is_demo: false,
    });

    const stats = await Review.aggregate([
      { $match: { reviewee: new Types.ObjectId(revieweeId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await User.findByIdAndUpdate(revieweeId, {
      avg_rating: Math.round((stats[0]?.avg ?? 0) * 10) / 10,
      review_count: stats[0]?.count ?? 0,
    });

    return review;
  },

  async getReviewsForUser(
    userId: string,
    type: 'received' | 'given'
  ): Promise<IReview[]> {
    const filter =
      type === 'received'
        ? { reviewee: new Types.ObjectId(userId) }
        : { reviewer: new Types.ObjectId(userId) };

    return Review.find(filter)
      .populate('reviewer', 'name avatar_url')
      .populate('reviewee', 'name avatar_url')
      .sort({ createdAt: -1 })
      .limit(20) as unknown as Promise<IReview[]>;
  },
};
