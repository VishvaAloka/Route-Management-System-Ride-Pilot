// app/api/rides/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, UserModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { 
  sendPMApprovalToUser, 
  sendPMApprovalToAdmin,
  sendRidePMApprovedNotification,
  sendRideApprovedNotification  // ✅ ADD THIS
} from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    await connectDB();
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Ride ID is required' }, { status: 400 });
    }
    
    const ride = await RideModel.findById(id);
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    
    console.log('🔍 Approving ride:', id, 'User role:', decoded.role, 'Ride status:', ride.status, 'Distance:', ride.distanceKm);
    
    // ==================== PROJECT MANAGER APPROVAL (for ≥25km rides) ====================
    if (decoded.role === 'project_manager' && ride.status === 'awaiting_pm') {
      ride.approval = ride.approval || {};
      ride.approval.projectManager = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: decoded.userId
      };
      
      // ✅ KEY CHANGE: PM-approved rides go directly to 'approved' status (ready for assignment)
      ride.status = 'approved';
      
      await ride.save();
      
      console.log('✅ PM approved ride (≥25km) - Status: approved (ready for driver assignment)');
      
      // Send notifications asynchronously
      setImmediate(async () => {
        try {
          const user = await UserModel.findById(ride.userId);
          
          if (user && user.email) {
            const notificationData = {
              rideId: ride._id.toString(),
              userName: user.name,
              userEmail: user.email,
              pickupLocation: ride.startLocation.address,
              dropoffLocation: ride.endLocation.address,
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
              distanceKm: ride.distanceKm.toFixed(1),
              tripType: ride.tripType === 'return-trip' ? 'Return Trip' : 'One-Way',
            };
            
            // Notify user: PM approved your ride
            await sendPMApprovalToUser(notificationData);
            console.log('✅ PM approval notification sent to user');
            
            // Notify admin: PM approved, please assign driver
            await sendPMApprovalToAdmin(notificationData);
            console.log('✅ PM approval notification sent to admin - assign driver');
          }
          
        } catch (emailError) {
          console.error('⚠️ Email notification error:', emailError);
        }
      });
      
      return NextResponse.json(ride);
    } 
    
    // ==================== ADMIN APPROVAL (for <25km rides) ====================
    else if (decoded.role === 'admin' && ride.status === 'awaiting_admin') {
      ride.approval = ride.approval || {};
      ride.approval.admin = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: decoded.userId
      };
      ride.status = 'approved';
      
      await ride.save();
      
      console.log('✅ Admin approved short ride (<25km) - Ready for driver assignment');
      
      // Optional: Send notification to user
      setImmediate(async () => {
        try {
          const user = await UserModel.findById(ride.userId);
          
          if (user && user.email) {
            const notificationData = {
              rideId: ride._id.toString(),
              userName: user.name,
              userEmail: user.email,
              pickupLocation: ride.startLocation.address,
              dropoffLocation: ride.endLocation.address,
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
              distanceKm: ride.distanceKm.toFixed(1),
              tripType: ride.tripType === 'return-trip' ? 'Return Trip' : 'One-Way',
            };
            
            await sendRideApprovedNotification(notificationData);
            console.log('✅ Admin approval notification sent to user');
          }
        } catch (emailError) {
          console.error('⚠️ Email notification error:', emailError);
        }
      });
      
      return NextResponse.json(ride);
    } 
    
    else {
      return NextResponse.json({ 
        error: `Cannot approve this ride. Role: ${decoded.role}, Status: ${ride.status}` 
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Approve ride error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}