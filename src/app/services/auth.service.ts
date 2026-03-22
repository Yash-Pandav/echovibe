import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  GoogleAuthProvider, 
  signInWithPopup, 
  updateProfile,
  setPersistence,           
  browserLocalPersistence   
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  constructor(
    private auth: Auth, 
    private firestore: Firestore, 
    private storage: Storage,
    @Inject(PLATFORM_ID) private platformId: Object // Added to check if it's a browser
  ) { 
    // IMPORTANT: Only run this inside a real browser, NOT during server-side build/prerender
    if (isPlatformBrowser(this.platformId)) {
      setPersistence(this.auth, browserLocalPersistence)
        .then(() => console.log('Permanent local persistence enabled!'))
        .catch((error) => console.error('Error setting persistence:', error));
    }
  }

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    this.setOnlineStatus(userCredential.user.uid, true);
    return userCredential;
  }

  async register(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    this.setOnlineStatus(userCredential.user.uid, true);
    return userCredential;
  }

  async logout() {
    const user = this.auth.currentUser;
    if (user) {
      await this.setOnlineStatus(user.uid, false);
    }
    return signOut(this.auth);
  }

  sendVerificationEmail(user: any) {
    return sendEmailVerification(user);
  }

  async googleSignIn() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.auth, provider);
    this.setOnlineStatus(userCredential.user.uid, true);
    return userCredential;
  }

  async saveUserData(uid: string, name: string, email: string, photoURL: string) {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      
      await setDoc(userDocRef, {
        name: name,
        email: email, 
        photoURL: photoURL
      }, { merge: true });

      if (this.auth.currentUser) {
        await updateProfile(this.auth.currentUser, { displayName: name });
      }

      console.log("Profile changes saved permanently to DB!");
    } catch (error) {
      console.error("Database Error: Could not save profile changes.", error);
      throw error;
    }
  }

  getUserProfile(uid: string) {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    return getDoc(userDocRef);
  }

  async updateProfilePicInDatabase(uid: string, base64Image: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      
      await setDoc(userDocRef, {
        photoURL: base64Image
      }, { merge: true });

      console.log("Profile picture saved PERMANENTLY in Database!");
    } catch (error) {
      console.error("Error updating profile picture in DB:", error);
      throw error;
    }
  }

  setOnlineStatus(uid: string, isOnline: boolean) {
    const userRef = doc(this.firestore, `users/${uid}`);
   
    updateDoc(userRef, { 
      isOnline: isOnline, 
      lastSeen: new Date().toISOString() 
    }).catch(e => console.error("Status update error", e));
  }
}