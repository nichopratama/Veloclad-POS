import { createAuthClient } from 'better-auth/react';

// Client Better Auth untuk komponen React (login/logout/useSession).
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

