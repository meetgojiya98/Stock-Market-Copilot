import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!API_BASE) return null;

        const username = credentials?.username ?? "";
        const password = credentials?.password ?? "";
        if (!username || !password) return null;

        let res: Response;
        try {
          res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              username,
              password,
            }),
          });
        } catch {
          return null;
        }

        if (!res.ok) return null;
        const data = await res.json();

        if (data.access_token) {
          return {
            id: username,
            name: username,
            email: username,
            accessToken: data.access_token as string,
          } as any;
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/logout",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && "accessToken" in user) {
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
