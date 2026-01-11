import { NextResponse } from 'next/server';
import { sendRideToPMNotification } from '@/lib/email';

export async function GET() {
  console.log('🧪 Testing PM Email Configuration...');
  console.log('PM_EMAIL from env:', process.env.PM_EMAIL);
  console.log('EMAIL_USER from env:', process.env.EMAIL_USER);
  console.log('EMAIL_HOST from env:', process.env.EMAIL_HOST);
  console.log('Has EMAIL_PASSWORD:', !!process.env.EMAIL_PASSWORD);

  const testData = {
    rideId: 'PM-TEST-' + Date.now(),
    userName: 'Test User',
    userEmail: 'koliyxmalan121@gmail.com',
    pickupLocation: 'Colombo Fort Railway Station, Colombo',
    dropoffLocation: 'Galle Beach, Galle (120km away)',
    requestedDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    requestedTime: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    distanceKm: '35.8',
    status: 'awaiting_pm',
  };

  console.log('📤 Attempting to send PM email to:', process.env.PM_EMAIL);
  
  try {
    const result = await sendRideToPMNotification(testData);
    
    console.log('📧 Email send result:', result);
    
    return NextResponse.json({
      success: true,
      emailResult: result,
      config: {
        pmEmail: process.env.PM_EMAIL,
        emailFrom: process.env.EMAIL_FROM,
        emailHost: process.env.EMAIL_HOST,
        hasPassword: !!process.env.EMAIL_PASSWORD,
      },
      testData,
    });
  } catch (error) {
    console.error('❌ Error sending PM email:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
      config: {
        pmEmail: process.env.PM_EMAIL,
        emailFrom: process.env.EMAIL_FROM,
      }
    }, { status: 500 });
  }
}