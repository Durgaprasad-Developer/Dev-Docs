export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/repositories/:path*',
    '/documentation/:path*',
    '/chat/:path*',
    '/diff/:path*',
    '/settings/:path*',
  ],
};
