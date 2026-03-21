import { Component, inject, afterNextRender, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  // Date format ke liye CommonModule zaroori hai
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss']
})
export class ChatListComponent {
  // Saari properties class ke andar honi chahiye
  allUsers: any[] = []; 
  recentChats: any[] = []; 
  filteredRecentChats: any[] = []; 
  searchResults: any[] = []; 
  
  // YEH THA PROBLEM WALA VARIABLE - Isko class ke andar rakha hai
  chatMetadata: { [key: string]: any } = {}; 
  
  viewMode: 'recent' | 'new' = 'recent'; 
  searchQuery: string = '';
  currentUserId: string = '';
  currentUserData: any = null;

  private chatService = inject(ChatService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(Auth);

  constructor() {
    afterNextRender(() => {
      this.currentUserId = this.auth.currentUser?.uid || '';
      
      this.chatService.getAllUsers().subscribe((data) => {
        this.ngZone.run(() => {
          this.currentUserData = data.find(u => u.uid === this.currentUserId);
          const connectedIds = this.currentUserData?.connectedUsers || [];

          this.allUsers = data.filter(user => user.uid !== this.currentUserId);
          this.recentChats = this.allUsers.filter(user => connectedIds.includes(user.uid));
          
          if (this.viewMode === 'recent' && !this.searchQuery) {
            this.filteredRecentChats = [...this.recentChats];
          }

          if (this.viewMode === 'new' && !this.searchQuery) {
            this.searchResults = this.allUsers;
          }

          // Metadata fetcher for recent chats
          this.recentChats.forEach(user => {
            const chatId = this.chatService.getChatId(this.currentUserId, user.uid);
            this.chatService.getChatMetadata(chatId).subscribe(meta => {
              this.ngZone.run(() => {
                this.chatMetadata[user.uid] = meta;
                this.cdr.detectChanges(); // Force UI update
              });
            });
          });

          this.cdr.detectChanges();
        });
      });
    });
  }

  openNewChatMode() {
    this.viewMode = 'new';
    this.searchQuery = '';
    this.searchResults = this.allUsers; 
  }

  closeNewChatMode() {
    this.viewMode = 'recent';
    this.searchQuery = '';
    this.filteredRecentChats = [...this.recentChats]; 
  }

  onSearch() {
    const query = this.searchQuery.toLowerCase();
    
    if (this.viewMode === 'recent') {
      this.filteredRecentChats = this.recentChats.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
    } 
    else if (this.viewMode === 'new') {
      this.searchResults = this.allUsers.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
    }
  }

  startChat(user: any) {
    this.ngZone.run(() => {
      this.chatService.addConnection(this.currentUserId, user.uid);
      
      this.viewMode = 'recent';
      this.searchQuery = '';
      this.filteredRecentChats = [...this.recentChats]; 
      
      this.router.navigate(['/app/chat-room'], { queryParams: { uid: user.uid, name: user.name } });
    });
  }
}