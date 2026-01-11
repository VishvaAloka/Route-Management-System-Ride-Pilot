import { NextResponse } from 'next/server';
import { sendRideRequestNotification, sendRideConfirmationToUser } from '@/lib/email';

export async function GET() {
  const testData = {
    rideId: 'TEST-' + Date.now(),
    userName: 'Test User',
    userEmail: 'koliyxmalan121@gmail.com',
    pickupLocation: 'Colombo Fort Railway Station, Colombo',
    dropoffLocation: 'Galle Face Green, Colombo',
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
    distanceKm: '15.5',
    status: 'awaiting_admin',
  };

  console.log('Sending test emails...');

  const adminResult = await sendRideRequestNotification(testData);
  const userResult = await sendRideConfirmationToUser(testData);

  return NextResponse.json({
    success: true,
    adminEmail: adminResult,
    userEmail: userResult,
    testData,
  });
}