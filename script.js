document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const APP_STATE_KEY = 'tinyWorkoutState';
    let state = {
        exercisesOwed: 10,
        log: [],
        lastCheckedDate: null,
    };

    const loadState = () => {
        const savedState = localStorage.getItem(APP_STATE_KEY);
        if (savedState) {
            state = JSON.parse(savedState);
        }
    };

    const saveState = () => {
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    };

    // --- DOM ELEMENTS ---
    const stopwatchDisplay = document.getElementById('stopwatch-display');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const resetBtn = document.getElementById('reset-btn');
    const exerciseGrid = document.getElementById('exercise-grid');
    const owedCountEl = document.getElementById('owed-count');
    const meterBarEl = document.getElementById('meter-bar');
    const bottomPanel = document.getElementById('bottom-panel');
    const meterHandle = document.getElementById('meter-handle');
    const logEntriesContainer = document.getElementById('log-entries');

    // --- EXERCISE DATA ---
    const exercises = [
        { id: 'pushup', title: '10 pushups', icon: 'pushup.png' },
        { id: 'squats', title: '20 squats', icon: 'squats.png' },
        { id: 'pullup', title: '3 pull ups', icon: 'pullup.png' },
        { id: 'stretch', title: '2 min stretch', icon: 'stretch.png' },
        { id: 'rows', title: '20 rows', icon: 'rows.png' },
        { id: 'run', title: '500m run', icon: 'run.png' },
        { id: 'plank', title: '1 min plank', icon: 'plank.png' },
        { id: 'bicycles', title: '20 bicycles', icon: 'bicycles.png' },
        { id: 'dumbbell', title: '8 reps dumbbell', icon: 'dumbbell.png', hasNote: true },
        { id: 'barbell', title: '5 reps barbell', icon: 'barbell.png', hasNote: true },
    ];

    // --- STOPWATCH LOGIC ---
    let stopwatch = {
        startTime: 0,
        elapsedTime: 0,
        intervalId: null,
        isRunning: false,
    };

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        const hundredths = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
        return `${minutes}:${seconds}:${hundredths}`;
    };

    const updateStopwatch = () => {
        const currentTime = Date.now();
        stopwatch.elapsedTime += currentTime - stopwatch.startTime;
        stopwatch.startTime = currentTime;
        stopwatchDisplay.textContent = formatTime(stopwatch.elapsedTime);
    };

    playPauseBtn.addEventListener('click', () => {
        stopwatch.isRunning = !stopwatch.isRunning;
        if (stopwatch.isRunning) {
            stopwatch.startTime = Date.now();
            stopwatch.intervalId = setInterval(updateStopwatch, 10);
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            clearInterval(stopwatch.intervalId);
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    });

    resetBtn.addEventListener('click', () => {
        clearInterval(stopwatch.intervalId);
        stopwatch.isRunning = false;
        stopwatch.elapsedTime = 0;
        stopwatchDisplay.textContent = formatTime(0);
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    });

    // --- UI RENDERING ---
    const renderExercises = () => {
        exerciseGrid.innerHTML = '';
        exercises.forEach(ex => {
            const entry = document.createElement('div');
            entry.className = 'exercise-entry';
            
            let noteInputHtml = '';
            if (ex.hasNote) {
                noteInputHtml = `<input type="text" class="note-input" id="note-${ex.id}" placeholder="Note (e.g., weight)">`;
            }

            entry.innerHTML = `
                <div class="exercise-main">
                    <button class="exercise-btn" data-id="${ex.id}" data-title="${ex.title}">
                        <img src="icons/${ex.icon}" alt="${ex.title}">
                    </button>
                    <span class="exercise-title">${ex.title}</span>
                </div>
                ${noteInputHtml}
            `;
            exerciseGrid.appendChild(entry);
        });
    };

    const updateOwedMeter = () => {
        owedCountEl.textContent = state.exercisesOwed;
        const percentage = Math.min((state.exercisesOwed / 30) * 100, 100);
        meterBarEl.style.width = `${percentage}%`;
    };

    // --- LOGIC FOR LOGGING EXERCISES ---
    exerciseGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.exercise-btn');
        if (!button) return;

        const { id, title } = button.dataset;
        const noteInput = document.getElementById(`note-${id}`);
        const note = noteInput ? noteInput.value.trim() : '';

        // Update state
        if (state.exercisesOwed > 0) {
            state.exercisesOwed -= 1;
        }
        state.log.push({
            timestamp: new Date().toISOString(),
            id,
            title,
            note
        });

        // --- CHANGE 3: The line that cleared the note input has been removed ---

        saveState();
        updateOwedMeter();
        renderLog();
    });

    // --- LOG RENDERING WITH GROUPING ---
    const renderLog = () => {
        logEntriesContainer.innerHTML = '';
        if (state.log.length === 0) {
            logEntriesContainer.innerHTML = '<p style="text-align:center; color: var(--text-light);">No activity yet. Go do some exercises!</p>';
            return;
        }

        const groupedByDate = state.log.reduce((acc, entry) => {
            const entryDate = new Date(entry.timestamp).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
            if (!acc[entryDate]) {
                acc[entryDate] = [];
            }
            acc[entryDate].push(entry);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

        sortedDates.forEach(dateStr => {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'log-date-header';
            dateHeader.textContent = new Date(dateStr).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            logEntriesContainer.appendChild(dateHeader);

            const entriesForDate = groupedByDate[dateStr];
            const processedEntries = processAndGroupEntries(entriesForDate);

            processedEntries.forEach(item => {
                const entryEl = document.createElement('div');
                entryEl.className = 'log-entry';
                const time = new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                let noteHtml = '';
                if (item.note) {
                    noteHtml = ` <span class="log-note">[${item.note}]</span>`;
                }

                entryEl.innerHTML = `
                    <div class="log-time">${time}</div>
                    <div class="log-details">${item.displayTitle}${noteHtml}</div>
                `;
                logEntriesContainer.appendChild(entryEl);
            });
        });
    };
    
    const processAndGroupEntries = (entries) => {
        if (!entries || entries.length === 0) return [];
    
        const grouped = [];
        let tempGroup = [entries[0]];
    
        for (let i = 1; i < entries.length; i++) {
            const prev = tempGroup[tempGroup.length - 1];
            const current = entries[i];
            const timeDiff = (new Date(current.timestamp) - new Date(prev.timestamp)) / (1000 * 60); // Difference in minutes
    
            // --- CHANGE 4: Added a check for the note to the grouping condition ---
            if (current.id === prev.id && timeDiff < 10 && current.note === prev.note) { 
                tempGroup.push(current);
            } else {
                grouped.push(formatGroup(tempGroup));
                tempGroup = [current];
            }
        }
        grouped.push(formatGroup(tempGroup));
        return grouped.reverse();
    };

    const formatGroup = (group) => {
        const first = group[0];
        const count = group.length;
        
        // --- CHANGE 5: Simplified note handling since all notes in a group are now identical ---
        const note = first.note;

        if (count === 1) {
            return { timestamp: first.timestamp, displayTitle: first.title, note: note };
        }

        const baseTitle = first.title;
        let displayTitle = '';

        // Handle reps -> sets
        if (baseTitle.includes('reps')) {
            displayTitle = `${count} sets, ${baseTitle}`;
        } 
        // Handle distance
        else if (baseTitle.includes('m run')) {
            const meters = parseInt(baseTitle) * count;
            displayTitle = meters >= 1000 ? `${meters/1000}km run` : `${meters}m run`;
        }
        // Handle simple counts
        else {
            const num = parseInt(baseTitle);
            if (!isNaN(num)) {
                const text = baseTitle.substring(baseTitle.indexOf(' ')).trim();
                displayTitle = `${num * count} ${text}`;
            } else {
                 displayTitle = `${count} x ${baseTitle}`;
            }
        }

        return { timestamp: first.timestamp, displayTitle, note: note };
    };

    // --- DAILY UPDATE ---
    const performDailyUpdate = () => {
        const todayEST = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        if (state.lastCheckedDate !== todayEST) {
            state.exercisesOwed += 10;
            state.lastCheckedDate = todayEST;
            saveState();
            updateOwedMeter();
        }
    };

    // --- SWIPE PANEL LOGIC ---
    let touchStartY = 0;
    let currentY = 0;
    
    // --- CHANGE 6: Added a click listener to the handle to toggle the panel ---
    meterHandle.addEventListener('click', (e) => {
        // This prevents the click from firing after a drag gesture ends
        if (Math.abs(currentY - touchStartY) < 10) {
            bottomPanel.classList.toggle('is-open');
        }
    });

    meterHandle.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        currentY = touchStartY; // Reset currentY on new touch
        bottomPanel.style.transition = 'none';
    });

    meterHandle.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY;
        if (bottomPanel.classList.contains('is-open')) {
            // If open, we are swiping down to close
            if (diff > 0) { // Only allow pulling down
                 bottomPanel.style.transform = `translateY(calc(15vh + ${diff}px))`;
            }
        } else {
            // If closed, we are swiping up to open
            if (diff < 0) { // Only allow pulling up
                bottomPanel.style.transform = `translateY(calc(100% - 15vh + ${diff}px))`;
            }
        }
    });

    meterHandle.addEventListener('touchend', (e) => {
        const diff = currentY - touchStartY;
        bottomPanel.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
        bottomPanel.style.transform = ''; // Reset inline style

        // Don't toggle on simple clicks, let the click handler do that.
        // Only toggle based on a significant swipe.
        if (Math.abs(diff) > 50) { 
            if (bottomPanel.classList.contains('is-open')) {
                if (diff > 50) { // Swiped down enough to close
                    bottomPanel.classList.remove('is-open');
                }
            } else {
                if (diff < -50) { // Swiped up enough to open
                    bottomPanel.classList.add('is-open');
                }
            }
        }
        
        touchStartY = 0;
        currentY = 0;
    });

    // --- INITIALIZATION ---
    const init = () => {
        loadState();
        performDailyUpdate();
        renderExercises();
        updateOwedMeter();
        renderLog();
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }
    };

    init();
});