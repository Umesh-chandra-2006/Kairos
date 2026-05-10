import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  onboarded: boolean;
  role?: string;
  profileRole?: string;
  profileLevel?: string;
}

export function useCurrentUser() {
  const { data: user, isLoading, isError, refetch } = useQuery<CurrentUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) return null;
      
      const data = await res.json();
      return data.user || null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  return { 
    user, 
    isSignedIn: !!user, 
    isLoaded: !isLoading, 
    isError,
    refetch 
  };
}
