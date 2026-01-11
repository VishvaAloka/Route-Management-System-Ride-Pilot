// scripts/seed.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://TRIMIDS:12345@cluster0.d6p1bgq.mongodb.net/route-management?retryWrites=true&w=majority&appName=Cluster0';

async function connectDB() {
  try {
    if (mongoose.connections[0].readyState) {
      return mongoose.connections[0];
    }
    const conn = await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully\n');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'driver', 'project_manager', 'admin'], 
    required: true 
  },
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const DeviceSchema = new mongoose.Schema({
  terminalId: { type: String, required: true, unique: true },
  vehicle: { type: String, required: true },
  vehicleType: { type: String, required: true },
  status: { type: String, required: true },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  speed: { type: Number, required: true },
  lastMessage: { type: String, required: true },
  expire: { type: String, required: true },
  isAvailable: { type: Boolean, default: true }
});

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const DeviceModel = mongoose.models.Device || mongoose.model('Device', DeviceSchema);

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');
    await connectDB();
    
    console.log('👥 Seeding users...');
    
    const usersToSeed = [
      { email: 'admin@gmail.com', password: 'admin12345', name: 'Admin User', role: 'admin' },
      { email: 'pm@gmail.com', password: 'pm12345', name: 'Supun Tharaka', role: 'project_manager' },
      
      // 5 DRIVERS
      { email: 'vijitha@gmail.com', password: 'driver12345', name: 'Vijitha Kumara', role: 'driver' },
      { email: 'kolitha@gmail.com', password: 'driver12345', name: 'Kolitha', role: 'driver' },
      { email: 'vimukthi@gmail.com', password: 'driver12345', name: 'Vimukthi Shehan', role: 'driver' },
      { email: 'driver4@gmail.com', password: 'driver12345', name: 'Driver 4', role: 'driver' },
      { email: 'driver5@gmail.com', password: 'driver12345', name: 'Driver 5', role: 'driver' },
      
      { email: 'user@gmail.com', password: 'user12345', name: 'John Doe', role: 'user' }
    ];

    for (const userData of usersToSeed) {
      await UserModel.deleteOne({ email: userData.email });
      
      const passwordHash = await hashPassword(userData.password);
      
      const user = new UserModel({
        name: userData.name,
        email: userData.email,
        passwordHash: passwordHash,
        role: userData.role,
        isAvailable: true
      });
      
      await user.save();
      console.log(`  ✅ ${userData.role.toUpperCase().padEnd(15)} - ${userData.name.padEnd(20)} (${userData.email})`);
    }

    console.log('\n🚗 Seeding vehicles...');
    
    const vehiclesToSeed = [
      { terminalId: 'NB-1985', vehicle: 'NB-1985', vehicleType: 'Van' },
      { terminalId: 'PA-4473', vehicle: 'PA-4473', vehicleType: 'Van' },
      { terminalId: 'NC-3888', vehicle: 'NC-3888', vehicleType: 'Car' },
      { terminalId: 'KH-5330', vehicle: 'KH-5330', vehicleType: 'SUV' },
      { terminalId: 'KY-3392', vehicle: 'KY-3392', vehicleType: 'Van' }
    ];

    for (const vehicleData of vehiclesToSeed) {
      await DeviceModel.deleteOne({ terminalId: vehicleData.terminalId });
      
      const vehicle = new DeviceModel({
        terminalId: vehicleData.terminalId,
        vehicle: vehicleData.vehicle,
        vehicleType: vehicleData.vehicleType,
        status: 'online',
        latitude: '6.9271',
        longitude: '79.8612',
        speed: 0,
        lastMessage: new Date().toISOString(),
        expire: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isAvailable: true
      });
      
      await vehicle.save();
      console.log(`  ✅ ${vehicleData.vehicleType.padEnd(10)} - ${vehicleData.vehicle.padEnd(15)} (Terminal: ${vehicleData.terminalId})`);
    }

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Total users: ${usersToSeed.length}`);
    console.log(`   - Drivers: 5`);
    console.log(`   - Vehicles: ${vehiclesToSeed.length}`);
    console.log('\n🔐 Login credentials:');
    console.log('   Admin:    admin@gmail.com / admin12345');
    console.log('   PM:       pm@gmail.com / pm12345');
    console.log('   Driver 1: vijitha@gmail.com / driver12345');
    console.log('   Driver 2: kolitha@gmail.com / driver12345');
    console.log('   Driver 3: vimukthi@gmail.com / driver12345');
    console.log('   Driver 4: driver4@gmail.com / driver12345');
    console.log('   Driver 5: driver5@gmail.com / driver12345');
    console.log('   User:     user@gmail.com / user12345\n');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();