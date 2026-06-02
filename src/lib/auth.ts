import { AuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_secret',
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
    CredentialsProvider({
      name: 'Demo Access',
      credentials: {},
      async authorize() {
        // Return a mock user for instant bypass testing
        return {
          id: 'demo-user-123',
          name: 'Durga Prasad',
          email: 'durga.prasad@example.com',
          image: 'https://avatars.githubusercontent.com/u/1486366?v=4',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the GitHub access token or demo token to the JWT
      if (account?.access_token) {
        token.accessToken = account.access_token;
      } else if (account?.provider === 'credentials') {
        // Use system token for bypass mode
        token.accessToken = process.env.GITHUB_ACCESS_TOKEN;
      }
      return token;
    },
    async session({ session, token }) {
      // Make access token available on the session
      (session as typeof session & { accessToken?: string }).accessToken =
        token.accessToken as string | undefined;
      if (session.user) {
        (session.user as typeof session.user & { id?: string }).id =
          token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
