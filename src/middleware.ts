import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// No-op middleware: lets all requests pass through.
export function middleware(_request: NextRequest) {
	return NextResponse.next();
}

// Optional: scope middleware if needed later
// export const config = { matcher: ['/((?!_next|.*\\.\n+(?:ico|png|svg|jpg|jpeg|gif|webp)).*)'] };

