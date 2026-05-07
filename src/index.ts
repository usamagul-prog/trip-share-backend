import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { initFirebase } from './config/firebase';

const PORT = process.env.PORT || 5000;

initFirebase();
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error(err); process.exit(1); });
