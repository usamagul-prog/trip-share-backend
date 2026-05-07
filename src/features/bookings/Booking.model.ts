import { Schema, model, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  trip: Types.ObjectId;
  rider: Types.ObjectId;
  pickup_point: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  payment_method: 'cash';
  is_demo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pickup_point: { type: String, required: true },
    seats: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    payment_method: { type: String, enum: ['cash'], default: 'cash' },
    is_demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BookingSchema.index({ trip: 1, rider: 1 }, { unique: true });

export const Booking = model<IBooking>('Booking', BookingSchema);
