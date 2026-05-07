import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  role: 'driver' | 'rider' | 'admin';
  avatar_url?: string;
  is_verified: boolean;
  fcm_token?: string;
  is_demo: boolean;
  avg_rating: number;
  review_count: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['driver', 'rider', 'admin'], required: true },
    avatar_url: String,
    is_verified: { type: Boolean, default: false },
    fcm_token: String,
    is_demo: { type: Boolean, default: false },
    avg_rating: { type: Number, default: 0 },
    review_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
