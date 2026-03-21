import { Routes } from '@angular/router';
import { Login } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ChatListComponent } from './chat/chat-list/chat-list.component';
import { ChatRoomComponent } from './chat/chat-room/chat-room.component';
import { ProfileComponent } from './profile/profile.component';
import { LayoutComponent } from './layout/layout.component';
import { ContactsComponent } from './contacts/contacts.component';
import { SettingsComponent } from './settings/settings.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: RegisterComponent },
  
  // Naya App Layout Shell
  { 
    path: 'app', 
    component: LayoutComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'chats', pathMatch: 'full' },
      { path: 'chats', component: ChatListComponent },
      { path: 'chat-room', component: ChatRoomComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'contacts', component: ContactsComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  }
];