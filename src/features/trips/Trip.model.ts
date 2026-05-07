import { Schema, model, Document, Types } from 'mongoose';

export interface ITrip extends Document {
  driver: Types.ObjectId;
  origin: string;
  destination: string;
  departure_time: Date;
  seats_total: number;
  seats_available: number;
  fare: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  waypoints?: string[];
  is_demo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    driver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    departure_time: { type: Date, required: true },
    seats_total: { type: Number, required: true },
    seats_available: { type: Number, required: true },
    fare: { type: Number, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    waypoints: [String],
    is_demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Trip = model<ITrip>('Trip', TripSchema);
