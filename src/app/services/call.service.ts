import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CallService {
  private peerConnection!: RTCPeerConnection;
  
  private localStreamSubject = new BehaviorSubject<MediaStream | null>(null);
  localStream$ = this.localStreamSubject.asObservable();
  
  private remoteStreamSubject = new BehaviorSubject<MediaStream | null>(null);
  remoteStream$ = this.remoteStreamSubject.asObservable();

  servers = {
    iceServers: [
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10,
  };

  constructor(private firestore: Firestore) {}

  async setupMediaSources(isVideo: boolean) {
    const constraints = {
      video: isVideo ? {
        width: { ideal: 720, max: 1280 },
        height: { ideal: 540, max: 720 },
        frameRate: { ideal: 20, max: 30 }
      } : false,
      audio: true
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStreamSubject.value?.getTracks().forEach(track => track.stop());
      
      this.localStreamSubject.next(stream);
      this.remoteStreamSubject.next(new MediaStream()); 

      this.peerConnection = new RTCPeerConnection(this.servers);

      stream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, stream);
      });

      this.peerConnection.ontrack = (event) => {
        const remoteStream = this.remoteStreamSubject.value;
        if (remoteStream) {
          event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
          });
          this.remoteStreamSubject.next(remoteStream); 
        }
      };
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error; 
    }
  }

  private ensurePeerConnection() {
    if (!this.peerConnection) {
      throw new Error("setupMediaSources must be called before create/answer call.");
    }
    return this.peerConnection;
  }

  // 🔥 FIX: Added callerId and isVideo parameters here
  async createCall(callId: string, callerId: string, isVideo: boolean) {
    const pc = this.ensurePeerConnection();
    const callDoc = doc(collection(this.firestore, 'calls'), callId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    // 🔥 FIX: Saving everything together in ONE shot! No more race conditions.
    await setDoc(callDoc, { 
      offer: offer,
      callerId: callerId,
      isVideo: isVideo
    });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.['answer']) {
        const answerDescription = new RTCSessionDescription(data['answer']);
        pc.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  }

  async answerCall(callId: string) {
    const pc = this.ensurePeerConnection();
    const callDoc = doc(this.firestore, `calls/${callId}`);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();
    const offerDescription = callData?.['offer'];
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type,
    };

    await updateDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  }

  hangup() {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.close();
      this.peerConnection = null as any; 
    }
    
    if (this.localStreamSubject.value) {
      this.localStreamSubject.value.getTracks().forEach(track => track.stop());
      this.localStreamSubject.next(null);
    }
    
    if (this.remoteStreamSubject.value) {
      this.remoteStreamSubject.value.getTracks().forEach(track => track.stop());
      this.remoteStreamSubject.next(null);
    }
  }
}