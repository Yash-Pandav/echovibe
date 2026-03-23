import { Component, ElementRef, ViewChild, Input, Output, EventEmitter, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../services/call.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-call-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-screen.component.html',
  styleUrls: ['./call-screen.component.scss']
})
export class CallScreenComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  @Input() isVideoCall: boolean = true;
  @Input() callerName: string = 'Friend';
  
  // Status is managed 
  callStatus: string = 'Connecting...';
  
  @Output() callEnded = new EventEmitter<void>();

  private callService = inject(CallService);
  private ngZone = inject(NgZone); 

  private localStreamSub?: Subscription;
  private remoteStreamSub?: Subscription;

  isAudioMuted = false;
  isVideoOff = false;

  ngOnInit() {
    this.subscribeToStreams();
  }

  ngOnDestroy() {
    
    this.localStreamSub?.unsubscribe();
    this.remoteStreamSub?.unsubscribe();
  }

  
  private subscribeToStreams() {
    this.localStreamSub = this.callService.localStream$.subscribe(stream => {
      // Force 
      this.ngZone.run(() => {
        if (stream && this.localVideo && this.localVideo.nativeElement) {
          this.localVideo.nativeElement.srcObject = stream;
        }
      });
    });

    this.remoteStreamSub = this.callService.remoteStream$.subscribe(stream => {
      this.ngZone.run(() => {
        if (stream && stream.getTracks().length > 0 && this.remoteVideo && this.remoteVideo.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = stream;
          this.callStatus = 'Connected';
        } else {
          
          if (this.callStatus === 'Connected') {
             this.callStatus = 'Reconnecting...';
          }
        }
      });
    });
  }

  toggleAudio() {
    this.isAudioMuted = !this.isAudioMuted;
    const localStream = this.callService['localStreamSubject'].value;
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isAudioMuted;
      });
    }
  }

  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    const localStream = this.callService['localStreamSubject'].value;
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !this.isVideoOff;
      });
    }
  }

  endCall() {
    this.callService.hangup();
    this.callEnded.emit(); 
  }
}