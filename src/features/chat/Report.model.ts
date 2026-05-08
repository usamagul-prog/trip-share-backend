import { Schema, model, Document, Types } from 'mongoose';

export interface IReport extends Document {
  reporter: Types.ObjectId;
  message: Types.ObjectId;
  booking: Types.ObjectId;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  },
  { timestamps: true },
);

ReportSchema.index({ message: 1, reporter: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });

export const Report = model<IReport>('Report', ReportSchema);
