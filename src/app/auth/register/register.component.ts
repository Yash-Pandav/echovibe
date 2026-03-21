import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  successMessage = ''; 

  onRegister() {
    // Validate form inputs
    if (!this.name || !this.email || !this.password) {
      this.errorMessage = 'Please fill all the fields!';
      this.successMessage = '';
      return;
    }

    console.log("Step 1: Registration process started..."); 

    // Create new user with Firebase Auth
    this.authService.register(this.email, this.password)
      .then((userCredential) => {
        console.log("Step 2: Account created! Sending verification email...");
        
        const user = userCredential.user;

        // Save user data to Firestore Database
        this.authService.register(this.email, this.password)
        .then((userCredential) => {
          const user = userCredential.user;
          // NAYA: 4th parameter ('') add kiya
          this.authService.saveUserData(user.uid, this.name, user.email || '', '')
            .then(() => {
              this.router.navigate(['/app/chats']);
            });
        })

        // Send email verification link
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
        
        // Display user-friendly message if email already exists
        if (error.code === 'auth/email-already-in-use') {
          this.errorMessage = 'This email is already registered! Please try another email or go to login.';
        } else {
          this.errorMessage = 'Registration Failed: ' + error.message;
        }
        this.successMessage = '';
      });
  }
}