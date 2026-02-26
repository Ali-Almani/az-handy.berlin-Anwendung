import dotenv from 'dotenv';
import { initDatabase, User } from '../models/index.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');

    await initDatabase();

    console.log('✅ Database connected!\n');

    const adminData = {
      name: 'Ali Almani',
      email: 'admin@az-handy.berlin',
      password: 'Admin123!',
      role: 'admin'
    };

    console.log('🔍 Checking if admin user exists...');

    const existingAdmin = await User.findOne({ where: { email: adminData.email } });

    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 ADMIN LOGIN CREDENTIALS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:    ', adminData.email);
      console.log('🔑 Password: ', adminData.password);
      console.log('👤 Role:     ', existingAdmin.role);
      console.log('🆔 User ID:  ', existingAdmin.id);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }

    console.log('📝 Creating admin user...');

    const admin = await User.create(adminData);

    console.log('✅ Admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 ADMIN LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', adminData.email);
    console.log('🔑 Password: ', adminData.password);
    console.log('👤 Role:     ', admin.role);
    console.log('🆔 User ID:  ', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 You can now login with these credentials');
    console.log('⚠️  Please change the password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error('   Message:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure PostgreSQL is running!');
      console.error('   Check your DATABASE_URL or PG_* variables in .env');
    }
    process.exit(1);
  }
};

createAdminUser();
