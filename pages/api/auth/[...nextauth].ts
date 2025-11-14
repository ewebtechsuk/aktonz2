import NextAuth, { type NextAuthOptions } from 'next-auth';
import EntraIdProvider from 'next-auth/providers/microsoft-entra-id';

export const authOptions: NextAuthOptions = {
  providers: [
    EntraIdProvider({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID!,
    }),
  ],
  session: { strategy: 'jwt' },
};

export default NextAuth(authOptions);
