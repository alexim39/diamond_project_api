import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import mongoose from 'mongoose';
import { PartnersModel } from './src/apps/partner/models/partner.model.js';
import { BcryptPasswordHasher } from './src/modules/identity-access/infrastructure/Auth.crypto.js';
import { PlainPassword } from './src/modules/identity-access/domain/Partner.entity.js';

await mongoose.connect(`mongodb+srv://schooltraz:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@cluster0.buvy2cx.mongodb.net/diamond-project?retryWrites=true&w=majority`, { serverSelectionTimeoutMS: 15000 });
const email = 'test@async.ng';
const found = await PartnersModel.findOne({ email }).select('_id email username').lean();
if (!found) {
  console.log('NO_ACCOUNT:', email);
} else {
  PlainPassword.create('phone101');
  const hash = await new BcryptPasswordHasher().hash('phone101');
  await PartnersModel.updateOne(
    { _id: found._id },
    { $set: { password: hash }, $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } },
  );
  console.log('PASSWORD_SET for', found.email, '| username:', found.username, '| id:', String(found._id));
}
await mongoose.disconnect();
