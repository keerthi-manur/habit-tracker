const DEFAULT_HABITS = ['Floss', 'Exercise', 'Meditate', 'Read', 'Drink Water'];

async function getHabits() {
  return new Promise(resolve => {
    chrome.storage.local.get(['habits', 'completions', 'thoughts', 'reminders'], (result) => {
      resolve({
        habits: result.habits || DEFAULT_HABITS,
        completions: result.completions || {},
        thoughts: result.thoughts || [],
        reminders: result.reminders || []
      });
    });
  });
}

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

async function markHabitComplete(habit, isComplete) {
  const { habits, completions } = await getHabits();
  const today = getTodayKey();
  
  if (!completions[today]) {
    completions[today] = [];
  }

  if (isComplete) {
    if (!completions[today].includes(habit)) {
      completions[today].push(habit);
    }
  } else {
    completions[today] = completions[today].filter(h => h !== habit);
  }

  chrome.storage.local.set({ completions }, renderUI);
}

function getStreak(habit, completions) {
  let streak = 0;
  let currentDate = new Date();

  for (let i = 0; i < 365; i++) {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    if (completions[dateKey] && completions[dateKey].includes(habit)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

async function addThought() {
  const input = document.getElementById('newThoughtInput');
  const thoughtText = input.value.trim();

  if (!thoughtText) return;

  const { habits, completions, thoughts } = await getHabits();
  
  const now = new Date();
  const thought = {
    id: Date.now(),
    text: thoughtText,
    timestamp: now.toLocaleString(),
    date: getTodayKey()
  };

  thoughts.unshift(thought);
  chrome.storage.local.set({ habits, completions, thoughts }, () => {
    input.value = '';
    renderUI();
  });
}

function renderThoughts(thoughts) {
  const thoughtsList = document.getElementById('thoughtsList');
  
  if (thoughts.length === 0) {
    thoughtsList.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center;">No thoughts yet. Start capturing!</p>';
    return;
  }

  thoughtsList.innerHTML = thoughts.slice(0, 10).map(thought => `
    <div class="thought-item">
      <span class="thought-delete" data-id="${thought.id}">✕</span>
      <div>${thought.text}</div>
      <div class="thought-time">${thought.timestamp}</div>
    </div>
  `).join('');

  document.querySelectorAll('.thought-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      const { habits, completions, thoughts, reminders } = await getHabits();
      const filtered = thoughts.filter(t => t.id !== id);
      chrome.storage.local.set({ habits, completions, thoughts: filtered, reminders }, renderUI);
    });
  });
}

async function addReminder() {
  const text = document.getElementById('reminderText').value.trim();
  const time = document.getElementById('reminderTime').value;

  if (!text || !time) {
    alert('Please enter both text and time');
    return;
  }

  const { habits, completions, thoughts, reminders } = await getHabits();
  
  const reminder = {
    id: Date.now(),
    text: text,
    time: time,
    createdAt: new Date().toLocaleString()
  };

  reminders.push(reminder);
  chrome.storage.local.set({ habits, completions, thoughts, reminders }, () => {
    document.getElementById('reminderText').value = '';
    document.getElementById('reminderTime').value = '';
    renderUI();
    scheduleReminder(reminder);
  });
}

function renderReminders(reminders) {
  const remindersList = document.getElementById('remindersList');
  
  if (reminders.length === 0) {
    remindersList.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center;">No reminders set. Create one above!</p>';
    return;
  }

  remindersList.innerHTML = reminders.map(reminder => `
    <div class="reminder-item">
      <span class="reminder-delete" data-id="${reminder.id}">✕</span>
      <div class="reminder-text">${reminder.text}</div>
      <div class="reminder-time">⏰ ${reminder.time}</div>
    </div>
  `).join('');

  document.querySelectorAll('.reminder-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      const { habits, completions, thoughts, reminders } = await getHabits();
      const filtered = reminders.filter(r => r.id !== id);
      chrome.storage.local.set({ habits, completions, thoughts, reminders: filtered }, renderUI);
    });
  });
}

function scheduleReminder(reminder) {
  const [hours, minutes] = reminder.time.split(':').map(Number);
  const now = new Date();
  const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  
  if (reminderDate < now) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  const delay = reminderDate - now;

  setTimeout(() => {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">📌</text></svg>',
      title: 'Reminder',
      message: reminder.text,
      priority: 2
    }).catch(err => console.log('Notification error:', err));
  }, delay);
}

async function renderUI() {
  const { habits, completions, thoughts, reminders } = await getHabits();
  const today = getTodayKey();
  const todayCompletions = completions[today] || [];

  // Update stats
  document.getElementById('todayCount').textContent = todayCompletions.length;
  document.getElementById('totalHabits').textContent = habits.length;

  let bestStreak = 0;
  habits.forEach(habit => {
    const streak = getStreak(habit, completions);
    if (streak > bestStreak) bestStreak = streak;
  });
  document.getElementById('streakCount').textContent = bestStreak;

  // Render habits list
  const habitsList = document.getElementById('habitsList');
  habitsList.innerHTML = habits.map(habit => {
    const isCompleted = todayCompletions.includes(habit);
    const streak = getStreak(habit, completions);
    return `
      <div class="habit-item ${isCompleted ? 'completed' : ''}">
        <input 
          type="checkbox" 
          class="habit-checkbox" 
          ${isCompleted ? 'checked' : ''}
          data-habit="${habit}"
        >
        <div class="habit-name">${habit}</div>
        ${streak > 0 ? `<div class="habit-streak">🔥 ${streak}</div>` : ''}
        <span class="habit-delete" data-habit="${habit}">✕</span>
      </div>
    `;
  }).join('');

  // Add event listeners to checkboxes
  document.querySelectorAll('.habit-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const habit = e.target.getAttribute('data-habit');
      markHabitComplete(habit, e.target.checked);
    });
  });

  // Add event listeners to delete buttons
  document.querySelectorAll('.habit-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const habit = e.target.getAttribute('data-habit');
      const { habits, completions, thoughts, reminders } = await getHabits();
      const filtered = habits.filter(h => h !== habit);
      chrome.storage.local.set({ habits: filtered, completions, thoughts, reminders }, renderUI);
    });
  });

  // Render thoughts
  renderThoughts(thoughts);

  // Render reminders
  renderReminders(reminders);

  // Render calendar
  renderCalendar(habits, completions);
}

function renderCalendar(habits, completions) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate start date (28 days ago, but start on Sunday of that week)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 27);
  
  // Find the Sunday of the week containing startDate
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  // Generate 35 days (5 weeks) to fill the calendar grid properly
  const days = [];
  for (let i = 0; i < 35; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push(date);
  }

  days.forEach(date => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const completed = completions[dateKey] ? completions[dateKey].length : 0;
    const total = habits.length;

    const day = document.createElement('div');
    day.className = 'calendar-day';

    if (completed === total && total > 0) {
      day.classList.add('active');
    } else if (completed > 0) {
      day.classList.add('partial');
    }

    day.textContent = date.getDate();
    day.title = `${dateKey}: ${completed}/${total} habits`;
    grid.appendChild(day);
  });
}

async function addHabit() {
  const input = document.getElementById('newHabitInput');
  const habitName = input.value.trim();

  if (!habitName) return;

  const { habits, completions } = await getHabits();
  
  if (!habits.includes(habitName)) {
    habits.push(habitName);
    chrome.storage.local.set({ habits, completions }, () => {
      input.value = '';
      renderUI();
    });
  }
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(tabName).classList.add('active');
  });
});

// Add habit button
document.getElementById('addHabitBtn').addEventListener('click', addHabit);
document.getElementById('newHabitInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addHabit();
});

// Add thought button
document.getElementById('addThoughtBtn').addEventListener('click', addThought);
document.getElementById('newThoughtInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addThought();
});

// Add reminder button
document.getElementById('setReminderBtn').addEventListener('click', addReminder);
document.getElementById('reminderText').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addReminder();
});

// Initial render
renderUI();