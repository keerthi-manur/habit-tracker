// Background service worker for Micro Habit Tracker
// Minimal background script - most logic is in popup.js

chrome.alarms.create('dailyCheck', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyCheck') {
    // Just a simple check - extension popup handles the UI
    chrome.storage.local.get(['lastResetDate'], (result) => {
      const today = getTodayKey();
      if (result.lastResetDate !== today) {
        chrome.storage.local.set({ lastResetDate: today });
      }
    });
  }
});

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}