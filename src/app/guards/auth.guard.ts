import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  
  return new Promise((resolve) => {
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); 
      
      if (user) {

        resolve(true); 
      } else {

        console.warn("Access Denied: Please login first!");
        router.navigate(['/login']);
        resolve(false); 
      }
    });
  });
};