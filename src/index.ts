import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { initFirebase } from './config/firebase';
import { initCloudinary } from './config/cloudinary';

const PORT = process.env.PORT || 5000;

try {
  initFirebase();
  initCloudinary();
} catch (err) {
  console.error(err);
  process.exit(1);
}

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error(err); process.exit(1); });
