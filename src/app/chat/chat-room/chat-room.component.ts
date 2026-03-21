import { Component, inject, OnInit, NgZone, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { ChatService } from '../../services/chat.service';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, onSnapshot } from '@angular/fire/firestore';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PickerComponent],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss'],
  encapsulation: ViewEncapsulation.Emulated
})
export class ChatRoomComponent implements OnInit {
  receiverId = '';
  receiverName = '';
  currentUserId = '';
  chatId = '';
  newMessage = '';
  messages: any[] = [];
  
  isAccepted: boolean = true; 
  isBlocked: boolean = false;
  showEmojiPicker = false;
  
 
  isReceiverTyping: boolean = false;
  typingTimeout: any;
  receiverData: any = null; 

  fullScreenImage: string | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private firestore = inject(Firestore);

  ngOnInit() {
    this.currentUserId = this.auth.currentUser?.uid || '';
    this.route.queryParams.subscribe(params => {
      this.receiverId = params['uid'];
      this.receiverName = params['name'];

      if (this.currentUserId && this.receiverId) {
        this.chatId = this.chatService.getChatId(this.currentUserId, this.receiverId);
        this.loadMessages();
        this.checkChatStatus(); 
        this.listenToTyping(); 
        this.listenToReceiverStatus(); 
      }
    });
  }

  
  listenToReceiverStatus() {
    const userRef = doc(this.firestore, `users/${this.receiverId}`);
    onSnapshot(userRef, (docSnap) => {
      this.ngZone.run(() => {
        if (docSnap.exists()) {
          this.receiverData = docSnap.data();
          this.cdr.detectChanges();
        }
      });
    });
  }

  checkChatStatus() {
    const userRef = doc(this.firestore, `users/${this.currentUserId}`);
    onSnapshot(userRef, (docSnap) => {
      this.ngZone.run(() => {
        const data = docSnap.data();
        const accepted = data?.['acceptedChats'] || [];
        const blocked = data?.['blockedUsers'] || [];

        this.isAccepted = accepted.includes(this.receiverId);
        this.isBlocked = blocked.includes(this.receiverId);
        this.cdr.detectChanges();
      });
    });
  }

  loadMessages() {
    this.chatService.getMessages(this.chatId).subscribe(data => {
      this.ngZone.run(() => {
        this.messages = data;
        this.chatService.markMessagesAsRead(this.chatId, this.currentUserId);
        
        this.cdr.detectChanges();
        setTimeout(() => {
          const chatArea = document.querySelector('.messages-area');
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        }, 100);
      });
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    const textToSend = this.newMessage;
    this.newMessage = ''; 
    
    this.chatService.updateTypingStatus(this.chatId, this.currentUserId, false);
    
    this.chatService.sendMessage(this.chatId, this.currentUserId, textToSend, this.receiverId).catch(console.error);
  }

  deleteMessage(messageId: string) {
    const confirmDelete = confirm("Delete message for everyone?");
    if (confirmDelete) {
      this.chatService.deleteMessageForEveryone(this.chatId, messageId)
        .catch(err => console.error("Error deleting message:", err));
    }
  }

  onTyping() {
    if (!this.isAccepted || this.isBlocked) return;

    this.chatService.updateTypingStatus(this.chatId, this.currentUserId, true);

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.chatService.updateTypingStatus(this.chatId, this.currentUserId, false);
    }, 2000);
  }

  listenToTyping() {
    this.chatService.getTypingStatus(this.chatId).subscribe((statusData) => {
      this.ngZone.run(() => {
        this.isReceiverTyping = statusData && statusData[this.receiverId] === true;
        this.cdr.detectChanges();
      });
    });
  }

  acceptRequest() {
    this.chatService.acceptChatRequest(this.currentUserId, this.receiverId);
  }

  blockContact() {
    this.chatService.blockUser(this.currentUserId, this.receiverId).then(() => {
      this.router.navigate(['/chat-list']); 
    });
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1048576) { 
        alert("Please select an image smaller than 1MB.");
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = () => {
        const base64String = reader.result as string;
        this.chatService.sendMessage(this.chatId, this.currentUserId, '', this.receiverId, base64String)
          .catch(console.error);
      };
    }
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.newMessage += emoji;
  }

  openFullScreen(imageUrl: string) {
    if (imageUrl) this.fullScreenImage = imageUrl;
  }

  closeFullScreen() {
    this.fullScreenImage = null;
  }
}