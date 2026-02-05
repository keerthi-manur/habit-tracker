// Background service worker for reminders

// Check every minute for due reminders
chrome.alarms.create('checkReminders', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkReminders') {
    checkDueReminders();
  }
});

function checkDueReminders() {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    reminders.forEach(reminder => {
      if (reminder.time === currentTime) {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">📌</text></svg>',
          title: 'Reminder',
          message: reminder.text,
          priority: 2
        });
      }
    });
  });
}