import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, GoogleAuthProvider, signInWithPopup, updateProfile } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  constructor(private auth: Auth, private firestore: Firestore, private storage: Storage) { }

  async login(email: string, password: string) {
    // 1. Pehle auth se login complete karo
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    // 2. Login hote hi status Online (true) kar do
    this.setOnlineStatus(userCredential.user.uid, true);
    return userCredential;
  }

  async register(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    // Register hone ke baad bhi directly Online kar do
    this.setOnlineStatus(userCredential.user.uid, true);
    return userCredential;
  }

  async logout() {
    // 1. Logout hone se pehle current user ka uid nikal lo
    const user = this.auth.currentUser;
    if (user) {
      // 2. Database me status Offline (false) kar do
      await this.setOnlineStatus(user.uid, false);
    }
    // 3. Phir original Firebase logout chalao
    return signOut(this.auth);
  }

  sendVerificationEmail(user: any) {
    return sendEmailVerification(user);
  }

  async googleSignIn() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.auth, provider);
    // Google sign in ke baad bhi status Online kar do
    this.setOnlineStatus(userCredential.user.uid, true);
    return userCredential;
  }

  async saveUserData(uid: string, name: string, email: string, photoURL: string) {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      
      // Database me sab kuch save karenge
      await setDoc(userDocRef, {
        name: name,
        email: email, 
        photoURL: photoURL
      }, { merge: true });

      // Firebase Auth me SIRF Name update karenge (Photo nahi)
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
    return getDoc(userDocRef); // Returns a Promise<DocumentSnapshot>
  }

  async updateProfilePicInDatabase(uid: string, base64Image: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      
      // Sirf Database me save karenge
      await setDoc(userDocRef, {
        photoURL: base64Image
      }, { merge: true });

      console.log("Profile picture saved PERMANENTLY in Database!");
    } catch (error) {
      console.error("Error updating profile picture in DB:", error);
      throw error;
    }
  }

  // Online/Offline status set karne ke liye
  setOnlineStatus(uid: string, isOnline: boolean) {
    const userRef = doc(this.firestore, `users/${uid}`);
    // Status aur Last Seen ka time save kar lo
    updateDoc(userRef, { 
      isOnline: isOnline, 
      lastSeen: new Date().toISOString() 
    }).catch(e => console.error("Status update error", e));
  }
}