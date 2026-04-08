import { Component, inject, OnInit, NgZone, ChangeDetectorRef, ViewEncapsulation, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { ChatService } from '../../services/chat.service';
import { CallService } from '../../services/call.service'; 
import { CallScreenComponent } from '../call-screen/call-screen.component'; 
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, onSnapshot, updateDoc, deleteDoc } from '@angular/fire/firestore'; 
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PickerComponent, CallScreenComponent],
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

  isInCall = false;
  isIncomingCall = false;
  isVideoCall = false;
  callStatus = '';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private callService = inject(CallService); 
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private firestore = inject(Firestore);
  private platformId = inject(PLATFORM_ID); 

  ngOnInit() {
    this.currentUserId = this.auth.currentUser?.uid || '';
    this.route.queryParams.subscribe(params => {
      this.receiverId = params['uid'];
      this.receiverName = params['name'];

      if (this.currentUserId && this.receiverId) {
        this.chatId = this.chatService.getChatId(this.currentUserId, this.receiverId);
        
        if (isPlatformBrowser(this.platformId)) {
          this.loadMessages();
          this.checkChatStatus(); 
          this.listenToTyping(); 
          this.listenToReceiverStatus(); 
          this.listenForCalls(); 
        }
      }
    });
  }

  listenForCalls() {
    const callDoc = doc(this.firestore, `calls/${this.chatId}`);
    
    onSnapshot(callDoc, (snapshot) => {
      this.ngZone.run(() => {
        const data = snapshot.data();

        if (!snapshot.exists() && this.isInCall) {
          this.endCall(false); 
          return;
        }

        if (snapshot.exists() && data) {
          // 🔥 FIX: Ensures we only trigger incoming call when callerId is present
          if (data['offer'] && data['callerId'] && !this.isInCall && !this.isIncomingCall && data['callerId'] !== this.currentUserId) {
            this.isIncomingCall = true;
            this.isVideoCall = data['isVideo'];
          }
        }
        this.cdr.detectChanges();
      });
    });
  }

  async startCall(isVideo: boolean) {
    try {
      this.isVideoCall = isVideo;
      this.isInCall = true;
      this.callStatus = 'Calling...';
      
      await this.callService.setupMediaSources(isVideo);
      
      // 🔥 FIX: Passing everything in one line! No updateDoc needed anymore.
      await this.callService.createCall(this.chatId, this.currentUserId, isVideo);
      
    } catch (error) {
      console.error("Call start failed:", error);
      alert("Call connection failed. Please allow camera/mic access.");
      this.endCall(true);
    }
  }

  async acceptCall() {
    try {
      this.isIncomingCall = false;
      this.isInCall = true;
      this.callStatus = 'Connecting...';
      
      await this.callService.setupMediaSources(this.isVideoCall);
      await this.callService.answerCall(this.chatId);
    } catch (error) {
      console.error("Permission or Connection issue:", error);
      alert("Cannot accept call. Allow camera/mic permission.");
      this.endCall(true); 
    }
  }

  async endCall(deleteDocFromFirebase: boolean = true) {
    this.callService.hangup();
    this.isInCall = false;
    this.isIncomingCall = false;
    this.callStatus = '';
    this.cdr.detectChanges();

    if (deleteDocFromFirebase) {
      try {
        await deleteDoc(doc(this.firestore, `calls/${this.chatId}`));
      } catch (e) {
        console.log("Call doc already deleted", e);
      }
    }
  }

  rejectCall() {
    this.endCall(true);
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