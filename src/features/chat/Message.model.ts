import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  booking: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  is_read: boolean;
  is_demo: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    is_demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Message = model<IMessage>('Message', MessageSchema);
