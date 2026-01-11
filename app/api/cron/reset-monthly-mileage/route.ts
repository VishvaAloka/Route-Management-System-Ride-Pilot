// app/api/cron/reset-monthly-mileage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ensureNewMonthInitialized } from '@/lib/mileage';

/**
 * Cron job to initialize new month
 * Run this at 00:01 on the 1st of every month
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reset-monthly-mileage",
 *     "schedule": "1 0 1 * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Check for cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const result = await ensureNewMonthInitialized();

    console.log('✅ Monthly mileage reset check completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Monthly mileage check completed',
      data: result
    });
  } catch (error) {
    console.error('❌ Monthly mileage reset error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}