import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  
  userProfile: any = null;
  currentAuthUser: any = null;
  newName = '';
  isUploading = false;
  successMessage = '';
  errorMessage = '';

  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); 

  ngOnInit() {
    this.checkAuthentication();
  }

  checkAuthentication() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentAuthUser = user;
        this.loadProfile(user.uid);
      } else {
        
        this.router.navigate(['/login']);
      }
    });
  }

  loadProfile(uid: string) {
    this.errorMessage = ''; 
    
    this.authService.getUserProfile(uid)
      .then((docSnap) => {
        if (docSnap.exists()) {
          this.userProfile = docSnap.data();
          this.newName = this.userProfile['name'] || this.currentAuthUser.displayName || '';
          console.log("Profile data loaded from database.");
          this.cdr.detectChanges(); 
        } else {
          console.error("Database user doc does not exist, creating one...");
         
          this.authService.saveUserData(uid, this.currentAuthUser.displayName || '', this.currentAuthUser.email || '', this.currentAuthUser.photoURL || '');
        }
      })
      .catch(err => {
        console.error("Failed to load profile from database.", err);
        this.errorMessage = "Could not load your profile data.";
      });
  }

  onFileSelected(event: any) {
    
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1048576) { 
        alert("Please select an image smaller than 1MB.");
        return;
      }
      this.isUploading = true;
      this.successMessage = '';
      this.errorMessage = '';
      const uid = this.currentAuthUser?.uid; 

      if (uid) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = () => {
          const base64String = reader.result as string;
          this.authService.updateProfilePicInDatabase(uid, base64String)
            .then(() => {
              this.isUploading = false;
              this.successMessage = 'Profile picture updated successfully!';
              if (this.userProfile) { this.userProfile.photoURL = base64String; }
              this.cdr.detectChanges(); 
            })
            .catch(err => {
              console.error(err);
              this.isUploading = false;
              this.errorMessage = 'Failed to upload profile picture.';
            });
        };
      }
    }
  }

  saveProfile() {
    this.successMessage = '';
    this.errorMessage = '';
    
    if (this.currentAuthUser && this.newName.trim()) {
      this.authService.saveUserData(this.currentAuthUser.uid, this.newName, this.currentAuthUser.email || '', this.userProfile?.photoURL || '')
        .then(() => {
          this.successMessage = "Profile name updated successfully!";
          this.cdr.detectChanges();
        })
        .catch(error => {
          console.error("Update failed:", error);
          this.errorMessage = "Failed to update profile name.";
        });
    }
  }
}