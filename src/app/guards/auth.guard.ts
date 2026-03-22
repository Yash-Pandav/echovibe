import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID); 

  
  if (!isPlatformBrowser(platformId)) {
    return true; 
  }
  
  try {
    await auth.authStateReady();

    if (auth.currentUser) {
      return true; 
    } else {
      console.warn("Access Denied: Please login first!");
      router.navigate(['/login']);
      return false; 
    }
  } catch (error) {
    console.error("Auth Guard Error:", error);
    router.navigate(['/login']);
    return false;
  }
};