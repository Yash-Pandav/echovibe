import { Component, ElementRef, ViewChild, Input, Output, EventEmitter, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../services/call.service';

@Component({
  selector: 'app-call-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-screen.component.html',
  styleUrls: ['./call-screen.component.scss']
})
export class CallScreenComponent implements AfterViewInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  @Input() isVideoCall: boolean = true;
  @Input() callerName: string = 'Friend';
  @Input() callStatus: string = 'Connecting...';
  
  @Output() callEnded = new EventEmitter<void>();

  private callService = inject(CallService);

  isAudioMuted = false;
  isVideoOff = false;

  ngAfterViewInit() {
   
    
    // 1. Show our own camera (Local Stream)
    if (this.callService.localStream) {
      this.localVideo.nativeElement.srcObject = this.callService.localStream;
    }

    // 2. Listen for the friend's camera (Remote Stream)
    
    const checkStreamInterval = setInterval(() => {
      if (this.callService.remoteStream && this.callService.remoteStream.getTracks().length > 0) {
        this.remoteVideo.nativeElement.srcObject = this.callService.remoteStream;
        this.callStatus = 'Connected';
        clearInterval(checkStreamInterval);
      }
    }, 500);
  }

  toggleAudio() {
    this.isAudioMuted = !this.isAudioMuted;
    if (this.callService.localStream) {
      this.callService.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isAudioMuted;
      });
    }
  }

  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    if (this.callService.localStream) {
      this.callService.localStream.getVideoTracks().forEach(track => {
        track.enabled = !this.isVideoOff;
      });
    }
  }

  endCall() {
    this.callService.hangup();
    this.callEnded.emit(); 
  }
}