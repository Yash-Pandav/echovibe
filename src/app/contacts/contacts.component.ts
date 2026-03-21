import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService } from '../services/chat.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss']
})
export class ContactsComponent implements OnInit {
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  searchQuery: string = '';
  currentUserId: string = '';

  private chatService = inject(ChatService);
  private auth = inject(Auth);
  private router = inject(Router);

  ngOnInit() {
    this.currentUserId = this.auth.currentUser?.uid || '';
    
    // Fetch all registered users from database
    this.chatService.getAllUsers().subscribe(users => {
      // Khud ko list se hatao
      this.allUsers = users.filter(u => u.uid !== this.currentUserId);
      this.filteredUsers = [...this.allUsers];
    });
  }

  onSearch() {
    const query = this.searchQuery.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user => 
      user.name?.toLowerCase().includes(query) || 
      user.email?.toLowerCase().includes(query)
    );
  }

  startNewChat(user: any) {
    // Database me connection add karo aur sidha chat room me bhej do
    this.chatService.addConnection(this.currentUserId, user.uid).then(() => {
      this.router.navigate(['/app/chat-room'], { 
        queryParams: { uid: user.uid, name: user.name } 
      });
    });
  }
}