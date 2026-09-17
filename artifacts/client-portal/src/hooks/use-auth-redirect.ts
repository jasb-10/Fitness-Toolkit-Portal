import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuthRedirect(isSignedIn: boolean | undefined, isLoaded: boolean, to: string = "/") {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation(to);
    }
  }, [isSignedIn, isLoaded, setLocation, to]);
}
