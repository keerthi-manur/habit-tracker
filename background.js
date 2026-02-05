// Background service worker for Micro Habit Tracker
// Handles daily reset and notifications

chrome.alarms.create('dailyReset', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    checkDailyReset();
  }
});

function checkDailyReset() {
  chrome.storage.local.get(['lastResetDate'], (result) => {
    const today = getTodayKey();
    const lastReset = result.lastResetDate;

    if (lastReset !== today) {
      // It's a new day, reset can happen (but we don't actually clear habits)
      chrome.storage.local.set({ lastResetDate: today });
      
      // Optional: Send notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">📊</text></svg>',
        title: 'Time to build habits!',
        message: 'Check off your habits for today.',
        priority: 1
      });
    }
  });
}

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}