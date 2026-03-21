import { Component, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone); // Added NgZone to handle routing properly

  onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password!';
      return;
    }

    this.authService.login(this.email, this.password)
      .then(() => {
        console.log('Login Successful!');
        this.ngZone.run(() => {
          this.router.navigate(['/app/chats']);
        });
      })
      .catch((error) => {
        this.errorMessage = 'Login failed. Check email/password.';
        console.error(error);
      });
  }

  onGoogleLogin() {
    this.authService.googleSignIn()
      .then((result) => {
        console.log('Google Login Successful!');
        
        const user = result.user;
        
        // Save Google user data to Firestore
        this.authService.saveUserData(
          user.uid, 
          user.displayName || 'Google User', 
          user.email || '', 
          user.photoURL || ''
        ).then(() => {
          console.log('Google user data saved to Firestore!');
          
          // Force Angular to navigate inside its zone
          this.ngZone.run(() => {
            this.router.navigate(['/app/chats']);
          });
          
        }).catch((dbError) => {
          console.error('Database Error: Could not save user data ->', dbError);
        });
      })
      .catch((error) => {
        this.errorMessage = 'Google Sign-In failed: ' + error.message;
        console.error("Google Auth Error:", error);
      });
  }
}