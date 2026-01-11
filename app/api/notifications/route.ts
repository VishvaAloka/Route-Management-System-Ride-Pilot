import { NextRequest, NextResponse } from 'next/server';
import { sendRideRequestNotification, sendRideConfirmationToUser } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'ride_request') {
      // Send notification to admin
      const adminResult = await sendRideRequestNotification(data);
      
      // Send confirmation to user
      const userResult = await sendRideConfirmationToUser(data);

      return NextResponse.json({
        success: true,
        adminNotification: adminResult,
        userConfirmation: userResult,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid notification type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}