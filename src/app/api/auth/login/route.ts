import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const VALID_USERNAME = process.env.VALID_USERNAME;
const VALID_PASSWORD = process.env.VALID_PASSWORD;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('Login attempt:', { username, password });
    console.log('Valid credentials:', { VALID_USERNAME, VALID_PASSWORD });

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      console.log('Credentials match, creating token');
      
      // Create JWT token
      const token = sign({ username }, JWT_SECRET, { expiresIn: '24h' });

      console.log('Token created');
      return NextResponse.json({ success: true, token });
    }

    console.log('Invalid credentials');
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 