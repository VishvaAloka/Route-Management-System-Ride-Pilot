import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    await connectDB();
    
    const user = await UserModel.findById(decoded.userId);
    
    return NextResponse.json({
      decoded,
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      } : null,
      env: {
        EMAIL_HOST: process.env.EMAIL_HOST,
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_FROM: process.env.EMAIL_FROM,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        hasPassword: !!process.env.EMAIL_PASSWORD
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}