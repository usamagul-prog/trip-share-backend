import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  booking: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  rating: number;
  comment?: string;
  is_demo: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    is_demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ReviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

export const Review = model<IReview>('Review', ReviewSchema);
