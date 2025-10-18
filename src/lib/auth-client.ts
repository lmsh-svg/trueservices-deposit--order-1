"use client"
import { createAuthClient } from "better-auth/react"
import { useEffect, useState } from "react"

export const authClient = createAuthClient({
   baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
  fetchOptions: {
      headers: {
        Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : ""}`,
      },
      onSuccess: (ctx) => {
          const authToken = ctx.response.headers.get("set-auth-token")
          if(authToken){
            localStorage.setItem("bearer_token", authToken);
          }
      }
  }
});

type SessionData = {
   data: any;
   isPending: boolean;
   error: any;
   refetch: () => void;
}

export function useSession(): SessionData {
   const [session, setSession] = useState<any>(null);
   const [isPending, setIsPending] = useState(true);
   const [error, setError] = useState<any>(null);

   const fetchSession = async () => {
      try {
         const token = typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : null;
         
         if (!token) {
            setSession(null);
            setError(null);
            setIsPending(false);
            return;
         }

         // Use custom session endpoint instead of Better Auth
         const res = await fetch('/api/auth/session', {
            method: 'GET',
            headers: {
               'Authorization': `Bearer ${token}`,
            },
         });

         if (!res.ok) {
            setSession(null);
            setError({ message: 'Session expired or invalid' });
            setIsPending(false);
            return;
         }

         const data = await res.json();
         
         if (data.success && data.user) {
            setSession({ user: data.user, session: data.session });
            setError(null);
         } else {
            setSession(null);
            setError({ message: 'Invalid session' });
         }
      } catch (err) {
         setSession(null);
         setError(err);
      } finally {
         setIsPending(false);
      }
   };

   const refetch = () => {
      setIsPending(true);
      setError(null);
      fetchSession();
   };

   useEffect(() => {
      fetchSession();
   }, []);

   return { data: session, isPending, error, refetch };
}