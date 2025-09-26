document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const APP_STATE_KEY = 'tinyWorkoutState';
    let state = {
        exercisesOwed: 10,
        log: [],
        lastCheckedDate: null,
        nextUpQueue: [],
    };

    const loadState = () => {
        const savedState = localStorage.getItem(APP_STATE_KEY);
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            state = { ...state, ...loadedState };
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
    const swipeIndicator = document.querySelector('.swipe-indicator');
    const logEntriesContainer = document.getElementById('log-entries');
    const nextUpQueueContainer = document.getElementById('next-up-queue');
    const resetQueueBtn = document.getElementById('reset-queue-btn');


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

    // --- STOPWATCH LOGIC (Unchanged) ---
    let stopwatch = { startTime: 0, elapsedTime: 0, intervalId: null, isRunning: false };
    const formatTime = ms => { const t = s => Math.floor(s).toString().padStart(2, '0'); const secs = ms / 1000; return `${t(secs/60%60)}:${t(secs%60)}:${t(ms%1000/10)}`; };
    const updateStopwatch = () => { const now = Date.now(); stopwatch.elapsedTime += now - stopwatch.startTime; stopwatch.startTime = now; stopwatchDisplay.textContent = formatTime(stopwatch.elapsedTime); };
    playPauseBtn.addEventListener('click', () => { stopwatch.isRunning = !stopwatch.isRunning; if (stopwatch.isRunning) { stopwatch.startTime = Date.now(); stopwatch.intervalId = setInterval(updateStopwatch, 10); playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; } else { clearInterval(stopwatch.intervalId); playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; } });
    resetBtn.addEventListener('click', () => { clearInterval(stopwatch.intervalId); stopwatch.isRunning = false; stopwatch.elapsedTime = 0; stopwatchDisplay.textContent = formatTime(0); playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; });

    // --- UI RENDERING ---
    const renderExercises = () => {
        exerciseGrid.innerHTML = '';
        exercises.forEach(ex => {
            const entry = document.createElement('div');
            entry.className = 'exercise-entry';
            entry.dataset.id = ex.id;

            let noteInputHtml = '';
            if (ex.hasNote) {
                noteInputHtml = `<input type="text" class="note-input" id="note-${ex.id}" placeholder="Note (e.g., weight)">`;
            }

            // Make only exercise-main draggable
            const exerciseMain = document.createElement('div');
            exerciseMain.className = 'exercise-main';
            exerciseMain.setAttribute('draggable', 'true');
            exerciseMain.innerHTML = `
                <button class="exercise-btn" data-id="${ex.id}" data-title="${ex.title}">
                    <img src="icons/${ex.icon}" alt="${ex.title}">
                </button>
                <span class="exercise-title">${ex.title}</span>
            `;
            entry.appendChild(exerciseMain);
            if (noteInputHtml) entry.innerHTML += noteInputHtml;
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

        // Animate button for feedback
        button.classList.add('animated');
        // Animate owed-count
        owedCountEl.classList.add('animated');
        setTimeout(() => owedCountEl.classList.remove('animated'), 500);
        setTimeout(() => button.classList.remove('animated'), 500);

        const { id, title } = button.dataset;
        const noteInput = document.getElementById(`note-${id}`);
        const note = noteInput ? noteInput.value.trim() : '';

        if (state.exercisesOwed > 0) {
            state.exercisesOwed -= 1;
        }
        state.log.push({
            timestamp: new Date().toISOString(),
            id,
            title,
            note
        });

        saveState();
        updateOwedMeter();
        renderLog();
    });

    // --- LOG RENDERING WITH GROUPING & DELETION ---
    const renderLog = () => {
        logEntriesContainer.innerHTML = '';
        if (state.log.length === 0) {
            logEntriesContainer.innerHTML = '<p style="text-align:center; color: var(--text-light);">No activity yet. Go do some exercises!</p>';
            return;
        }
        
        const sortedLog = [...state.log].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

        const groupedByDate = sortedLog.reduce((acc, entry) => {
            const entryDate = new Date(entry.timestamp).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
            if (!acc[entryDate]) acc[entryDate] = [];
            acc[entryDate].push(entry);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

        sortedDates.forEach((dateStr, dateIndex) => {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'log-date-header';
            dateHeader.textContent = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            logEntriesContainer.appendChild(dateHeader);

            const entriesForDate = groupedByDate[dateStr].reverse();
            const processedEntries = processAndGroupLogEntries(entriesForDate);

            processedEntries.reverse().forEach((item, itemIndex) => {
                const entryEl = document.createElement('div');
                entryEl.className = 'log-entry';
                const time = new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                let noteHtml = item.note ? ` <span class="log-note">[${item.note}]</span>` : '';
                
                let deleteBtnHtml = '';
                if (dateIndex === 0 && itemIndex === 0) {
                     deleteBtnHtml = `
                        <button class="delete-log-btn" data-timestamp="${item.timestamp}" data-count="${item.count}" aria-label="Delete entry">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
                        </button>`;
                }

                entryEl.innerHTML = `
                    <div class="log-time">${time}</div>
                    <div class="log-details">${item.displayTitle}${noteHtml}</div>
                    ${deleteBtnHtml}
                `;
                logEntriesContainer.appendChild(entryEl);
            });
        });
    };
    
    const processAndGroupLogEntries = (entries) => {
        if (!entries || entries.length === 0) return [];
        const grouped = [];
        let tempGroup = [entries[0]];
    
        for (let i = 1; i < entries.length; i++) {
            const prev = tempGroup[tempGroup.length - 1];
            const current = entries[i];
            const timeDiff = (new Date(current.timestamp) - new Date(prev.timestamp)) / (1000 * 60);
            
            if (current.id === prev.id && current.note === prev.note && timeDiff < 10) {
                tempGroup.push(current);
            } else {
                grouped.push(formatGroup(tempGroup));
                tempGroup = [current];
            }
        }
        grouped.push(formatGroup(tempGroup));
        return grouped;
    };

    const formatGroup = (group) => {
        const first = group[0];
        const count = group.length;
        let displayTitle = first.title;
        const notes = group.map(g => g.note).filter(Boolean).join(', ');

        if (count > 1) {
            const baseTitle = first.title;
            if (baseTitle.includes('reps')) { displayTitle = `${count} sets, ${baseTitle}`; } 
            else if (baseTitle.includes('m run')) { const m = parseInt(baseTitle) * count; displayTitle = m >= 1000 ? `${m/1000}km run` : `${m}m run`; }
            else { const num = parseInt(baseTitle); displayTitle = !isNaN(num) ? `${num * count} ${baseTitle.substring(baseTitle.indexOf(' ')).trim()}` : `${count} x ${baseTitle}`; }
        }
        return { timestamp: first.timestamp, displayTitle, note: notes, count: count };
    };

    logEntriesContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-log-btn');
        if (!deleteBtn) return;
        
        const { timestamp, count } = deleteBtn.dataset;
        const numCount = parseInt(count, 10);
        
        const indexToRemove = state.log.findIndex(entry => entry.timestamp === timestamp);
        
        if (indexToRemove > -1) {
            state.log.splice(indexToRemove, numCount);
            state.exercisesOwed += numCount;
            
            saveState();
            updateOwedMeter();
            renderLog();
        }
    });

    // --- "NEXT UP" QUEUE LOGIC ---
    const renderNextUpQueue = () => {
        nextUpQueueContainer.innerHTML = '';
        if (state.nextUpQueue.length === 0) {
            nextUpQueueContainer.innerHTML = '<span class="queue-placeholder">Drag exercises here</span>';
            return;
        }

        const groupedQueue = processAndGroupQueueEntries(state.nextUpQueue);
        
        groupedQueue.forEach((item, index) => {
            const queueEl = document.createElement('div');
            queueEl.className = 'queue-item';
            const exerciseData = exercises.find(ex => ex.id === item.id);
            if (!exerciseData) return;

            let buttonHtml = `
                <button class="exercise-btn" data-count="${item.count}" data-group-index="${index}">
                    <img src="icons/${exerciseData.icon}" alt="${item.displayTitle}">
                </button>
            `;
            const noteHtml = item.note ? `<div class="queue-item-note">${item.note}</div>` : '';
            queueEl.innerHTML = `
                ${buttonHtml}
                <div class="queue-item-title">${item.displayTitle}</div>
                ${noteHtml}
            `;
            nextUpQueueContainer.appendChild(queueEl);
        });
        // Add clear button as its own final div
        const clearDiv = document.createElement('div');
        clearDiv.className = 'queue-item';
        clearDiv.innerHTML = `<button id="reset-queue-btn" aria-label="Clear Queue" style="background:none;border:none;color:var(--accent-color);font-weight:500;cursor:pointer;padding:2px 10px;">Clear</button>`;
        nextUpQueueContainer.appendChild(clearDiv);
    };

    const processAndGroupQueueEntries = (queue) => {
        if (!queue || queue.length === 0) return [];
        const grouped = [];
        let tempGroup = [queue[0]];

        for (let i = 1; i < queue.length; i++) {
            const prev = tempGroup[tempGroup.length - 1];
            const current = queue[i];

            if (current.id === prev.id && current.note === prev.note) {
                tempGroup.push(current);
            } else {
                grouped.push(formatGroupForQueue(tempGroup));
                tempGroup = [current];
            }
        }
        grouped.push(formatGroupForQueue(tempGroup));
        return grouped;
    };
    
    const formatGroupForQueue = (group) => {
        const first = group[0];
        const count = group.length;
        const { displayTitle } = formatGroup(group);
        return { id: first.id, displayTitle, note: first.note, count: count };
    };

    // --- DRAG AND DROP LISTENERS (CORRECTED) ---
    exerciseGrid.addEventListener('dragstart', (e) => {
        // Prevent drag if starting on an input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            e.preventDefault();
            return;
        }
        // Only allow drag from .exercise-main
        const draggable = e.target.closest('.exercise-main');
        if (draggable) {
            const parentEntry = draggable.parentElement;
            e.dataTransfer.setData('text/plain', parentEntry.dataset.id);
            setTimeout(() => {
                draggable.style.opacity = '0.5';
            }, 0);
        } else {
            e.preventDefault();
        }
    });

    exerciseGrid.addEventListener('dragend', (e) => {
        const draggable = e.target.closest('.exercise-main');
        if (draggable) {
            draggable.style.opacity = '1';
        }
    });

    nextUpQueueContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        nextUpQueueContainer.classList.add('drag-over');
    });

    nextUpQueueContainer.addEventListener('dragleave', () => {
        nextUpQueueContainer.classList.remove('drag-over');
    });

    nextUpQueueContainer.addEventListener('drop', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        nextUpQueueContainer.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const exerciseData = exercises.find(ex => ex.id === id);
        
        if (exerciseData) {
            const noteInput = document.getElementById(`note-${id}`);
            const note = noteInput ? noteInput.value.trim() : '';
            state.nextUpQueue.push({ ...exerciseData, note });
            saveState();
            renderNextUpQueue();
        }
    });

    nextUpQueueContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.exercise-btn');
        if (button) {
            // Animate button for feedback
            button.classList.add('animated');
            // Animate owed-count
            owedCountEl.classList.add('animated');
            setTimeout(() => owedCountEl.classList.remove('animated'), 500);
            // Find the queue item element
            const queueItem = button.closest('.queue-item');
            // Get group index and count
            const count = parseInt(button.dataset.count, 10);
            const groupIndex = parseInt(button.dataset.groupIndex, 10);
            let startIdx = 0;
            let grouped = processAndGroupQueueEntries(state.nextUpQueue);
            for (let i = 0; i < grouped.length; i++) {
                if (i === groupIndex) break;
                startIdx += grouped[i].count;
            }
            // After animation, remove items and animate slide-back
            setTimeout(() => {
                // Animate removal of the queue item
                if (queueItem) {
                    queueItem.classList.add('slide-back');
                }
                // Wait for slide-back transition before updating state
                setTimeout(() => {
                    const itemsToLog = state.nextUpQueue.slice(startIdx, startIdx + count);
                    itemsToLog.forEach(item => {
                        if (state.exercisesOwed > 0) state.exercisesOwed--;
                        state.log.push({
                            timestamp: new Date().toISOString(),
                            id: item.id,
                            title: item.title,
                            note: item.note
                        });
                    });
                    state.nextUpQueue.splice(startIdx, count);
                    saveState();
                    updateOwedMeter();
                    renderLog();
                    renderNextUpQueue();
                }, 300); // match CSS transition duration
            }, 500); // wait for button animation
            return;
        }
        const clearBtn = e.target.closest('#reset-queue-btn');
        if (clearBtn) {
            state.nextUpQueue = [];
            saveState();
            renderNextUpQueue();
        }
    });

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
    let touchStartY = 0; let currentY = 0;
    let drawerState = 'closed'; // 'open', 'closed', 'transitioning'

    function setDrawerState(newState) {
        if (drawerState === newState) return;
        drawerState = newState;
        if (newState === 'open') {
            bottomPanel.classList.add('is-open');
        } else if (newState === 'closed') {
            bottomPanel.classList.remove('is-open');
        }
    }

    // Listen for transition end to update state
    bottomPanel.addEventListener('transitionend', () => {
        if (bottomPanel.classList.contains('is-open')) {
            drawerState = 'open';
        } else {
            drawerState = 'closed';
        }
    });

    swipeIndicator.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (drawerState === 'transitioning') return;
        if (drawerState === 'open') {
            setDrawerState('transitioning');
            bottomPanel.classList.remove('is-open');
        } else if (drawerState === 'closed') {
            setDrawerState('transitioning');
            bottomPanel.classList.add('is-open');
        }
    });

    meterHandle.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; bottomPanel.style.transition = 'none'; });
    meterHandle.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY;
        if (drawerState === 'open') { if (diff > 0) { bottomPanel.style.transform = `translateY(calc(15vh + ${diff}px))`; } } 
        else { if (diff < 0) { bottomPanel.style.transform = `translateY(calc(100% - 15vh + ${diff}px))`; } }
    });
    meterHandle.addEventListener('touchend', () => {
        const diff = currentY - touchStartY;
        bottomPanel.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
        bottomPanel.style.transform = '';
        if (drawerState === 'open' && diff > 50) {
            setDrawerState('transitioning');
            bottomPanel.classList.remove('is-open');
        } else if (drawerState === 'closed' && diff < -50) {
            setDrawerState('transitioning');
            bottomPanel.classList.add('is-open');
        }
        touchStartY = 0; currentY = 0;
    });

    // --- INITIALIZATION ---
    const init = () => {
        loadState();
        performDailyUpdate();
        renderExercises();
        updateOwedMeter();
        renderLog();
        renderNextUpQueue();
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }
    };

    init();
});