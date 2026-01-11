// app/api/rides/route.ts - COMPLETE UPDATED FILE
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, UserModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { calculateHaversineDistance } from '@/lib/distance';
import { 
  sendRideConfirmationToUser,
  sendRideToPMNotification,
  sendRideRequestNotification  // ✅ ADD THIS
} from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    
    await connectDB();
    
    let query = {};
    
    if (decoded.role === 'user') {
      query = { userId: decoded.userId };
    } else if (decoded.role === 'driver') {
      query = { driverId: decoded.userId };
    } else if (decoded.role === 'project_manager') {
      query = { status: 'awaiting_pm' };
    }
    
    const rides = await RideModel.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json(rides);
  } catch (error) {
    console.error('GET /api/rides error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/rides - Start');
  
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    console.log('✅ Token verified:', { userId: decoded.userId, role: decoded.role });
    
    if (decoded.role !== 'user') {
      console.error('❌ Unauthorized role:', decoded.role);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    await connectDB();
    console.log('✅ Database connected');
    
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      startLocation, 
      endLocation, 
      distanceKm: providedDistance,
      tripType = 'one-way'
    } = body;
    
    if (!startLocation || !endLocation) {
      console.error('❌ Missing locations');
      return NextResponse.json({ error: 'Start and end locations are required' }, { status: 400 });
    }

    if (!startLocation.lat || !startLocation.lng || !endLocation.lat || !endLocation.lng) {
      console.error('❌ Missing coordinates');
      return NextResponse.json({ error: 'Coordinates are required for both locations' }, { status: 400 });
    }

    if (tripType !== 'one-way' && tripType !== 'return-trip') {
      console.error('❌ Invalid trip type:', tripType);
      return NextResponse.json({ error: 'Trip type must be either "one-way" or "return-trip"' }, { status: 400 });
    }
    
    let baseDistance = providedDistance;
    
    if (!baseDistance || typeof baseDistance !== 'number') {
      console.log('🧮 Calculating distance as fallback...');
      baseDistance = calculateHaversineDistance(
        startLocation.lat,
        startLocation.lng,
        endLocation.lat,
        endLocation.lng
      );
    }

    let distanceKm = baseDistance;
    if (tripType === 'return-trip') {
      distanceKm = baseDistance * 2;
      console.log('🔄 Return trip - Distance doubled:', {
        baseDistance,
        finalDistance: distanceKm
      });
    }
    
    console.log('📏 Final distance to save:', distanceKm);
    
    // ✅ NEW LOGIC: Route based on distance
    const isShortDistance = distanceKm < 25;
    const rideStatus = isShortDistance ? 'awaiting_admin' : 'awaiting_pm';
    
    console.log('🚗 Routing ride:', {
      distance: distanceKm,
      threshold: 25,
      isShortDistance,
      status: rideStatus
    });
    
    const rideData = {
      userId: decoded.userId,
      tripType: tripType,
      distanceKm,
      startLocation: {
        lat: startLocation.lat,
        lng: startLocation.lng,
        address: startLocation.address || `${startLocation.lat.toFixed(4)}, ${startLocation.lng.toFixed(4)}`
      },
      endLocation: {
        lat: endLocation.lat,
        lng: endLocation.lng,
        address: endLocation.address || `${endLocation.lat.toFixed(4)}, ${endLocation.lng.toFixed(4)}`
      },
      status: rideStatus, // ✅ CHANGED: Routes based on distance
      approval: {}
    };

    console.log('💾 Creating ride with status:', rideData.status);
    
    const ride = new RideModel(rideData);
    await ride.save();
    
    console.log('✅ Ride saved successfully:', ride._id);
    
    // ==================== NOTIFICATION SYSTEM ====================
    setImmediate(async () => {
      try {
        console.log('📧 Starting email notification process...');
        
        const user = await UserModel.findById(decoded.userId);
        
        if (!user) {
          console.error('❌ User not found:', decoded.userId);
          return;
        }

        console.log('✅ User found:', { name: user.name, email: user.email });

        if (!user.email) {
          console.error('❌ User has no email address');
          return;
        }

        const notificationData = {
          rideId: ride._id.toString(),
          userName: user.name || 'User',
          userEmail: user.email,
          pickupLocation: rideData.startLocation.address,
          dropoffLocation: rideData.endLocation.address,
          requestedDate: new Date(ride.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          requestedTime: new Date(ride.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          distanceKm: distanceKm.toFixed(2),
          tripType: tripType === 'return-trip' ? 'Return Trip' : 'One-Way',
          status: ride.status,
        };

        // Always send confirmation to user
        console.log('📤 [1/2] Sending confirmation email to user...');
        const userResult = await sendRideConfirmationToUser(notificationData);
        if (userResult.success) {
          console.log('✅ User confirmation email sent');
        } else {
          console.error('❌ Failed to send user confirmation');
        }

        // ✅ NEW: Send to PM only if ≥25km
        if (isShortDistance) {
          console.log('📤 [2/2] Short ride (<25km) - Sending to ADMIN for approval');
          console.log('     Admin Email:', process.env.ADMIN_EMAIL);
          
          const adminResult = await sendRideRequestNotification(notificationData);
          
          if (adminResult.success) {
            console.log('✅ Admin notification email sent successfully');
          } else {
            console.error('❌ Failed to send Admin notification:', adminResult.error);
          }
        } else {
          console.log('📤 [2/2] Long ride (≥25km) - Sending to PM for approval');
          console.log('     PM Email:', process.env.PM_EMAIL);
          console.log('     Ride Distance:', distanceKm, 'km');
          
          const pmResult = await sendRideToPMNotification(notificationData);
          
          if (pmResult.success) {
            console.log('✅ PM notification email sent successfully');
          } else {
            console.error('❌ Failed to send PM notification:', pmResult.error);
          }
        }

        console.log('📧 Email notification process complete');

      } catch (emailError) {
        console.error('⚠️ Email notification error:', emailError);
        console.error('Error stack:', (emailError as Error).stack);
      }
    });
    // ============================================================
    
    console.log('🎉 POST /api/rides - Complete');
    return NextResponse.json(ride);
    
  } catch (error) {
    console.error('💥 POST /api/rides error:', error);
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}