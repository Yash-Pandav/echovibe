import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  darkMode: boolean = false;
  notifications: boolean = true;
  sound: boolean = true;
  readReceipts: boolean = true;
  lastSeen: boolean = true;
  
  saveStatus: string = '';

  ngOnInit() {
    const savedSettings = localStorage.getItem('echovibe_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      this.darkMode = parsed.darkMode ?? false;
      this.notifications = parsed.notifications ?? true;
      this.sound = parsed.sound ?? true;
      this.readReceipts = parsed.readReceipts ?? true;
      this.lastSeen = parsed.lastSeen ?? true;
    }

    if (this.darkMode) {
      document.body.classList.add('dark-theme');
    }
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.autoSave();
    if (this.darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  // NAYA: Jab notification toggle ho, tab permission mango
  toggleNotifications() {
    if (this.notifications) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission !== 'granted') {
            this.notifications = false; // Agar deny kiya toh wapas OFF kar do
            alert("Please allow notifications in your browser settings to receive alerts.");
          }
          this.autoSave();
        });
      } else {
        this.autoSave();
      }
    } else {
      this.autoSave();
    }
  }

  autoSave() {
    const settingsToSave = {
      darkMode: this.darkMode,
      notifications: this.notifications,
      sound: this.sound,
      readReceipts: this.readReceipts,
      lastSeen: this.lastSeen
    };
    localStorage.setItem('echovibe_settings', JSON.stringify(settingsToSave));
    
    this.saveStatus = 'Settings saved!';
    setTimeout(() => this.saveStatus = '', 2000); 
  }
}