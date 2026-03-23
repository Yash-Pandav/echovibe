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

  // Free Google STUN servers (Added extra standard servers for better reliability)
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

  // 1. Camera aur Mic on 
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

    //  remort stream
      this.peerConnection.ontrack = (event) => {
        const remoteStream = this.remoteStreamSubject.value;
        if (remoteStream) {
          event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
          });
          this.remoteStreamSubject.next(remoteStream); 
        }
      };
      
      // Track ended listeners to handle glitches
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log(`Local track ${track.kind} ended unexpected`);
          
        };
      });

    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error; 
    }
  }

  // Helper method for create/answer call to share setup media check
  private ensurePeerConnection() {
    if (!this.peerConnection) {
      throw new Error("setupMediaSources must be called before create/answer call.");
    }
    return this.peerConnection;
  }

  // 2. Create Offer (call recive)
  async createCall(callId: string) {
    const pc = this.ensurePeerConnection();
    const callDoc = doc(collection(this.firestore, 'calls'), callId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    // create offer and send to the firebase
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });

    // wait for the answer
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

  // 3. Answer Call
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

  // 4. Call Cut 
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