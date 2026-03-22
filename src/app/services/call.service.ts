import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class CallService {
  peerConnection!: RTCPeerConnection;
  localStream!: MediaStream;
  remoteStream!: MediaStream;

  // Free Google STUN servers (IP address find)
  servers = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ],
    iceCandidatePoolSize: 10,
  };

  constructor(private firestore: Firestore) {}

  // 1. Camera aur Mic
  async setupMediaSources(isVideo: boolean) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
    this.remoteStream = new MediaStream();

    this.peerConnection = new RTCPeerConnection(this.servers);

    
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };
  }

  // 2. Call recive 
  async createCall(callId: string) {
    const callDoc = doc(collection(this.firestore, 'calls'), callId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    
    const offerDescription = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });

    // answer ka wait 
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!this.peerConnection.currentRemoteDescription && data?.['answer']) {
        const answerDescription = new RTCSessionDescription(data['answer']);
        this.peerConnection.setRemoteDescription(answerDescription);
      }
    });

    
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.peerConnection.addIceCandidate(candidate);
        }
      });
    });
  }

  // 3. Call Uthana (Answer Call)
  async answerCall(callId: string) {
    const callDoc = doc(this.firestore, `calls/${callId}`);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();
    const offerDescription = callData?.['offer'];
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answerDescription);

    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type,
    };

    await updateDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.peerConnection.addIceCandidate(candidate);
        }
      });
    });
  }

  // 4. Call Cut 
  hangup() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
    }
  }
}