import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, serverTimestamp, onSnapshot, setDoc, doc, arrayUnion, arrayRemove, updateDoc, getDocs, where, increment, limit } from '@angular/fire/firestore';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  
  public newMessageSubject = new Subject<any>();

  constructor(private firestore: Firestore) { }

  getAllUsers(): Observable<any[]> {
    return new Observable((observer) => {
      const usersRef = collection(this.firestore, 'users');
      const unsubscribe = onSnapshot(usersRef, 
        (snapshot) => {
          const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
          observer.next(users);
        }, 
        (error) => observer.error(error)
      );
      return () => unsubscribe();
    });
  }

  getChatId(uid1: string, uid2: string): string {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  }

  async sendMessage(chatId: string, senderId: string, text: string, receiverId: string, imageUrl: string = '') {
    const messagesRef = collection(this.firestore, `chats/${chatId}/messages`);
    
    await addDoc(messagesRef, {
      senderId: senderId,
      text: text,
      imageUrl: imageUrl,
      status: 'sent',
      createdAt: serverTimestamp()
    });

    const chatMetaRef = doc(this.firestore, `chats/${chatId}`);
    const lastMsgPreview = imageUrl ? '📷 Photo' : text;

    await setDoc(chatMetaRef, {
      lastMessage: lastMsgPreview,
      lastMessageTime: serverTimestamp(),
      lastSenderId: senderId,
      [`unread_${receiverId}`]: increment(1)
    }, { merge: true });
  }

  getMessages(chatId: string): Observable<any[]> {
    return new Observable((observer) => {
      const messagesRef = collection(this.firestore, `chats/${chatId}/messages`);
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          observer.next(messages);
        }, 
        (error) => observer.error(error)
      );
      return () => unsubscribe();
    });
  }

  async markMessagesAsRead(chatId: string, currentUserId: string) {
    const messagesRef = collection(this.firestore, `chats/${chatId}/messages`);
    const q = query(messagesRef, where('senderId', '!=', currentUserId), where('status', '==', 'sent'));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (document) => {
      const docRef = doc(this.firestore, `chats/${chatId}/messages/${document.id}`);
      await updateDoc(docRef, { status: 'read' });
    });

    const chatMetaRef = doc(this.firestore, `chats/${chatId}`);
    await setDoc(chatMetaRef, {
      [`unread_${currentUserId}`]: 0 
    }, { merge: true });
  }

  getChatMetadata(chatId: string): Observable<any> {
    return new Observable((observer) => {
      const chatMetaRef = doc(this.firestore, `chats/${chatId}`);
      const unsubscribe = onSnapshot(chatMetaRef, (docSnap) => {
        if (docSnap.exists()) observer.next(docSnap.data());
      });
      return () => unsubscribe();
    });
  }

  
  listenForGlobalNotifications(currentUserId: string, acceptedChatIds: string[]) {
    
    acceptedChatIds.forEach(chatId => {
       const chatMetaRef = doc(this.firestore, `chats/${chatId}`);
       onSnapshot(chatMetaRef, (docSnap) => {
         if (docSnap.exists()) {
           const data = docSnap.data();
           
           if (data['lastSenderId'] !== currentUserId && data[`unread_${currentUserId}`] > 0) {
            
             this.newMessageSubject.next({
               chatId: chatId,
               text: data['lastMessage'],
               senderId: data['lastSenderId']
             });
           }
         }
       });
    });
  }

  async updateTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    const metaRef = doc(this.firestore, `chats/${chatId}/meta/typing`);
    await setDoc(metaRef, { [userId]: isTyping }, { merge: true });
  }

  getTypingStatus(chatId: string): Observable<any> {
    return new Observable((observer) => {
      const metaRef = doc(this.firestore, `chats/${chatId}/meta/typing`);
      const unsubscribe = onSnapshot(metaRef, (docSnap) => {
        if (docSnap.exists()) observer.next(docSnap.data());
      });
      return () => unsubscribe();
    });
  }

  async addConnection(currentUserId: string, targetUserId: string) {
    const currentUserRef = doc(this.firestore, `users/${currentUserId}`);
    const targetUserRef = doc(this.firestore, `users/${targetUserId}`);
    
    await setDoc(currentUserRef, { 
      connectedUsers: arrayUnion(targetUserId),
      acceptedChats: arrayUnion(targetUserId) 
    }, { merge: true });
    
    await setDoc(targetUserRef, { 
      connectedUsers: arrayUnion(currentUserId) 
    }, { merge: true });
  }

  async acceptChatRequest(currentUserId: string, targetUserId: string) {
    const currentUserRef = doc(this.firestore, `users/${currentUserId}`);
    await setDoc(currentUserRef, {
      acceptedChats: arrayUnion(targetUserId)
    }, { merge: true });
  }

  async blockUser(currentUserId: string, targetUserId: string) {
    const currentUserRef = doc(this.firestore, `users/${currentUserId}`);
    await setDoc(currentUserRef, {
      connectedUsers: arrayRemove(targetUserId),
      acceptedChats: arrayRemove(targetUserId),
      blockedUsers: arrayUnion(targetUserId)
    }, { merge: true });
  }

  async deleteMessageForEveryone(chatId: string, messageId: string) {
    const msgRef = doc(this.firestore, `chats/${chatId}/messages/${messageId}`);
    await updateDoc(msgRef, {
      text: '🚫 This message was deleted',
      isDeleted: true,
      status: 'deleted' 
    });
  }

  setOnlineStatus(uid: string, isOnline: boolean) {
    const userRef = doc(this.firestore, `users/${uid}`);
    updateDoc(userRef, { 
      isOnline: isOnline, 
      lastSeen: new Date().toISOString() 
    }).catch(e => console.error("Status update error", e));
  }
}