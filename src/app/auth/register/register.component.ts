import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  name = '';
  email = '';
  password = '';
  errorMessage = '';
  successMessage = ''; 

  private authService = inject(AuthService);
  private router = inject(Router);
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);

  
  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.auth.authStateReady();
      
      if (this.auth.currentUser) {
        this.router.navigate(['/app/chats']);
      }
    }
  }

  onRegister() {
    if (!this.name || !this.email || !this.password) {
      this.errorMessage = 'Please fill all the fields!';
      this.successMessage = '';
      return;
    }

    console.log("Step 1: Registration process started..."); 

    this.authService.register(this.email, this.password)
      .then((userCredential) => {
        console.log("Step 2: Account created! Saving data and sending verification email...");
        
        const user = userCredential.user;

        
        this.authService.saveUserData(user.uid, this.name, user.email || '', '')
          .then(() => {
            this.router.navigate(['/app/chats']);
          });

        this.authService.sendVerificationEmail(user)
          .then(() => {
            console.log("Step 4: Verification email sent successfully!");
            this.errorMessage = '';
            this.successMessage = 'Account created! Please check your email inbox to verify your account.';
          })
          .catch((mailError) => {
            console.error("Mail Error: Failed to send verification email ->", mailError);
            this.errorMessage = 'Account created, but failed to send verification email.';
          });
      })
      .catch((error) => {
        console.error("Register Error: Failed to create account ->", error);
        
        if (error.code === 'auth/email-already-in-use') {
          this.errorMessage = 'This email is already registered! Please try another email or go to login.';
        } else {
          this.errorMessage = 'Registration Failed: ' + error.message;
        }
        this.successMessage = '';
      });
  }
}