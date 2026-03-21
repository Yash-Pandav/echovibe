import { Component, inject, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { doc, onSnapshot, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule], 
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  isChatRoomOpen: boolean = false;
  currentUserId: string = '';
  private notificationSub: any;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isChatRoomOpen = event.urlAfterRedirects.includes('/chat-room');
    });
  }

  ngOnInit() {
    this.isChatRoomOpen = this.router.url.includes('/chat-room');
    
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUserId = user.uid;
        this.setupGlobalNotifications();
      }
    });
  }

  setupGlobalNotifications() {
    const userRef = doc(this.firestore, `users/${this.currentUserId}`);
    onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
         const data = docSnap.data();
         const acceptedChats = data['acceptedChats'] || [];
         
         const chatIds = acceptedChats.map((targetId: string) => this.chatService.getChatId(this.currentUserId, targetId));
         this.chatService.listenForGlobalNotifications(this.currentUserId, chatIds);
      }
    });

    this.notificationSub = this.chatService.newMessageSubject.subscribe((msgData) => {
       if(!this.router.url.includes(msgData.chatId)) {
          this.triggerNotification(msgData.text);
       }
    });
  }

  
  playBeepSound() {
    try {
      const audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3); 
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio play failed, user might not have interacted with the document yet.", e);
    }
  }

  triggerNotification(messageText: string) {
    const savedSettings = localStorage.getItem('echovibe_settings');
    let settings = { notifications: true, sound: true };
    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }

    
    if (settings.sound) {
      this.playBeepSound();
    }

    if (settings.notifications && Notification.permission === 'granted') {
       new Notification('New Message on Echovibe', {
         body: messageText,
         icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' 
       });
    }
  }

  ngOnDestroy() {
    if (this.notificationSub) {
      this.notificationSub.unsubscribe();
    }
  }

  onLogout() {
    this.authService.logout().then(() => {
      this.ngZone.run(() => {
        console.log("Logged out from layout!");
        this.router.navigate(['/login']); 
      });
    }).catch((error) => {
      console.error("Logout error: ", error);
    });
  }
}