// app/api/rides/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, UserModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { 
  sendRideApprovedNotification, 
  sendRideRejectedNotification,
  sendRidePMApprovedNotification,
  sendPMApprovalToAdmin,
  sendPMRejectionToAdmin 
} from '@/lib/email';

// GET single ride
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    await connectDB();
    
    const ride = await RideModel.findById(params.id);
    
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    
    return NextResponse.json(ride);
  } catch (error) {
    console.error('GET /api/rides/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update ride (approve/reject by Admin OR PM)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('🔄 PATCH /api/rides/[id] - Start');
  
  try {
    const params = await context.params;
    const rideId = params.id;
    
    console.log('🆔 Ride ID:', rideId);
    
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    console.log('✅ Token verified:', { userId: decoded.userId, role: decoded.role });
    
    // Allow both admin and project_manager to approve/reject
    if (decoded.role !== 'admin' && decoded.role !== 'project_manager') {
      console.error('❌ Unauthorized role:', decoded.role);
      return NextResponse.json({ 
        error: 'Unauthorized. Only admins and project managers can approve/reject rides.' 
      }, { status: 403 });
    }
    
    await connectDB();
    console.log('✅ Database connected');
    
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { action, rejectionReason } = body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      console.error('❌ Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 });
    }
    
    const ride = await RideModel.findById(rideId);
    
    if (!ride) {
      console.error('❌ Ride not found:', rideId);
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    
    console.log('✅ Ride found:', {
      id: ride._id,
      status: ride.status,
      userId: ride.userId,
      distanceKm: ride.distanceKm
    });
    
    // Determine who is approving (Admin or PM)
    const isAdmin = decoded.role === 'admin';
    const isPM = decoded.role === 'project_manager';
    
    console.log(`👤 Approver: ${isAdmin ? 'ADMIN' : 'PROJECT MANAGER'}`);
    
    // Update ride status based on approver
    if (action === 'approve') {
      if (isPM) {
        // ⭐ NEW LOGIC: PM approval now directly approves the ride (no admin approval needed for >25km)
        ride.status = 'approved';  // Changed from 'awaiting_admin'
        if (!ride.approval) {
          ride.approval = {};
        }
        ride.approval.projectManager = {
          approved: true,
          approvedAt: new Date(),
          approvedBy: decoded.userId
        };
        console.log('✅ Ride approved by PM - status set to APPROVED (ready for driver assignment)');
      } else {
        // Admin approval - fully approved (for ≤25km rides)
        ride.status = 'approved';
        if (!ride.approval) {
          ride.approval = {};
        }
        ride.approval.admin = {
          approved: true,
          approvedAt: new Date(),
          approvedBy: decoded.userId
        };
        console.log('✅ Ride approved by Admin - fully approved');
      }
    } else {
      // Rejection
      ride.status = 'rejected';
      if (!ride.approval) {
        ride.approval = {};
      }
      
      if (isPM) {
        ride.approval.projectManager = {
          approved: false,
          approvedAt: new Date(),
          approvedBy: decoded.userId
        };
        console.log('❌ Ride rejected by PM');
      } else {
        ride.approval.admin = {
          approved: false,
          approvedAt: new Date(),
          approvedBy: decoded.userId
        };
        console.log('❌ Ride rejected by Admin');
      }
    }
    
    await ride.save();
    console.log('💾 Ride status updated in database');
    
    // ==================== SEND EMAIL NOTIFICATIONS ====================
    try {
      console.log('📧 Fetching user details for notification...');
      const user = await UserModel.findById(ride.userId);
      
      if (!user) {
        console.error('❌ User not found:', ride.userId);
      } else {
        console.log('✅ User found:', { name: user.name, email: user.email });
        
        if (!user.email) {
          console.error('❌ User has no email address');
        } else {
          const notificationData = {
            rideId: ride._id.toString(),
            userName: user.name || 'User',
            userEmail: user.email,
            pickupLocation: ride.startLocation.address || 
                           `${ride.startLocation.lat.toFixed(4)}, ${ride.startLocation.lng.toFixed(4)}`,
            dropoffLocation: ride.endLocation.address || 
                            `${ride.endLocation.lat.toFixed(4)}, ${ride.endLocation.lng.toFixed(4)}`,
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
            distanceKm: ride.distanceKm.toFixed(2),
            rejectionReason: rejectionReason || undefined,
            approvedBy: isPM ? 'Project Manager' : 'Admin'
          };
          
          if (action === 'approve') {
            if (isPM) {
              // PM approved - notify user AND admin (for driver assignment)
              console.log('📧 [1/2] Sending PM approval notification to user');
              const userResult = await sendRidePMApprovedNotification(notificationData);
              if (userResult.success) {
                console.log('✅ PM approval email sent to user successfully');
              } else {
                console.error('❌ Failed to send PM approval email to user:', userResult.error);
              }

              // Notify admin to assign driver (not to approve again)
              console.log('📧 [2/2] Sending PM approval notification to admin (driver assignment needed)');
              const adminResult = await sendPMApprovalToAdmin(notificationData);
              if (adminResult.success) {
                console.log('✅ Driver assignment notification sent to admin successfully');
              } else {
                console.error('❌ Failed to send driver assignment notification to admin:', adminResult.error);
              }
            } else {
              // Admin approved ≤25km ride - notify user only
              console.log('📧 Sending admin approval notification to user');
              const result = await sendRideApprovedNotification(notificationData);
              if (result.success) {
                console.log('✅ Admin approval email sent to user successfully');
              } else {
                console.error('❌ Failed to send admin approval email:', result.error);
              }
            }
          } else {
            // Rejection - notify user (always) AND admin (if PM rejected)
            console.log(`📧 [1/${isPM ? '2' : '1'}] Sending rejection notification to user`);
            const userResult = await sendRideRejectedNotification(notificationData);
            if (userResult.success) {
              console.log(`✅ Rejection email sent to user successfully`);
            } else {
              console.error('❌ Failed to send rejection email to user:', userResult.error);
            }

            // If PM rejected, notify admin (FYI)
            if (isPM) {
              console.log('📧 [2/2] Sending PM rejection notification to admin (FYI)');
              const adminResult = await sendPMRejectionToAdmin(notificationData);
              if (adminResult.success) {
                console.log('✅ PM rejection notification sent to admin successfully');
              } else {
                console.error('❌ Failed to send PM rejection notification to admin:', adminResult.error);
              }
            }
          }
        }
      }
    } catch (emailError) {
      console.error('⚠️ Email notification error (non-critical):', emailError);
      // Don't fail the request if email fails
    }
    // ================================================================
    
    console.log('🎉 PATCH /api/rides/[id] - Complete');
    return NextResponse.json({ 
      success: true, 
      ride,
      message: `Ride ${action === 'approve' ? 'approved' : 'rejected'} successfully by ${isPM ? 'Project Manager' : 'Admin'}`
    });
    
  } catch (error) {
    console.error('💥 PATCH /api/rides/[id] error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    
    return NextResponse.json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}

// DELETE ride (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    await connectDB();
    
    const ride = await RideModel.findByIdAndDelete(params.id);
    
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Ride deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE /api/rides/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


