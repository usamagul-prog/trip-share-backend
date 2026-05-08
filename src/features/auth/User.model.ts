import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  role: 'driver' | 'rider' | 'admin';
  avatar_url?: string;
  is_verified: boolean;
  fcm_token?: string;
  email?: string;
  is_demo: boolean;
  avg_rating: number;
  review_count: number;
  status: 'active' | 'suspended';
  suspension_reason?: string;
  suspended_at?: Date;
  refresh_token?: string;
  dob?: Date;
  terms_accepted_at?: Date;
  blocked_users: Types.ObjectId[];
  cnic_url?: string;
  license_url?: string;
  doc_status?: 'pending' | 'approved' | 'rejected';
  doc_rejection_reason?: string;
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
    email: { type: String, sparse: true },
    is_demo: { type: Boolean, default: false },
    avg_rating: { type: Number, default: 0 },
    review_count: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    suspension_reason: String,
    suspended_at: Date,
    refresh_token: String,
    dob: Date,
    terms_accepted_at: Date,
    blocked_users: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    cnic_url: String,
    license_url: String,
    doc_status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    doc_rejection_reason: String,
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
