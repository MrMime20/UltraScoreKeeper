// script.js - Clean, Modern Mobile Baseball Scorekeeper

document.addEventListener('DOMContentLoaded', () => {
  // --- Game State Variables ---
  let homeScoreVal = 0;
  let awayScoreVal = 0;
  let currentInning = 1;
  let isTopInning = true; // true = Top (Away bats), false = Bottom (Home bats)
  let currentOuts = 0;
  let secondsElapsed = 0;
  let isTimerRunning = false;
  let timerInterval = null;

  let homeTeamName = localStorage.getItem('baseball_home_team') || 'Home';
  let awayTeamName = localStorage.getItem('baseball_away_team') || 'Away';
  let selectedShareFormat = 'basic'; // 'basic', 'standard', 'broadcast'
  let currentTheme = localStorage.getItem('baseball_theme') || 'light';
  let hapticsEnabled = localStorage.getItem('baseball_haptics_enabled') !== 'false';

  // Apply saved theme
  document.body.setAttribute('data-theme', currentTheme);

  // --- DOM Elements ---
  const homeScoreEl = document.getElementById('home-score');
  const awayScoreEl = document.getElementById('away-score');
  const homeLabelEl = document.getElementById('home-label');
  const awayLabelEl = document.getElementById('away-label');
  const teamLabelsContainer = document.getElementById('team-labels-container');
  const battingUnderline = document.getElementById('batting-underline');

  const inningContainer = document.getElementById('inning-container');
  const inningValEl = document.getElementById('inning-val');
  const inningUpBtn = document.getElementById('inning-up');
  const inningDownBtn = document.getElementById('inning-down');

  const outsContainer = document.getElementById('outs-container');
  const outCircles = document.querySelectorAll('.out-circle');

  const timerDisplay = document.getElementById('timer-display');
  const timerEl = document.getElementById('timer');
  const timerIcon = document.getElementById('timer-icon');

  // Settings Elements
  const settingsBtn = document.getElementById('settings-btn');
  const settingsBackdrop = document.getElementById('settings-backdrop');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const hapticToggle = document.getElementById('haptic-toggle');
  const homeNameInput = document.getElementById('home-name-input');
  const awayNameInput = document.getElementById('away-name-input');
  const themeCards = document.querySelectorAll('.theme-card');
  const modalTimerToggleBtn = document.getElementById('modal-timer-toggle-btn');
  const modalTimerIcon = document.getElementById('modal-timer-icon');
  const modalTimerText = document.getElementById('modal-timer-text');
  const modalTimerResetBtn = document.getElementById('modal-timer-reset-btn');
  const clearRunsBtn = document.getElementById('clear-runs-btn');
  const resetGameBtn = document.getElementById('reset-game-btn');

  // Share Elements
  const shareBtn = document.getElementById('share-btn');
  const shareBackdrop = document.getElementById('share-backdrop');
  const closeShareBtn = document.getElementById('close-share-btn');
  const summaryCards = document.querySelectorAll('.summary-card');
  const sharePreviewText = document.getElementById('share-preview-text');
  const copyPreviewBtn = document.getElementById('copy-preview-btn');
  const shareNativeBtn = document.getElementById('share-native-btn');
  const shareSmsBtn = document.getElementById('share-sms-btn');
  const shareEmailBtn = document.getElementById('share-email-btn');
  const shareCopyBtn = document.getElementById('share-copy-btn');

  // Advanced Tools Elements
  const advancedToolsBtn = document.getElementById('advanced-tools-btn');
  const advancedBackdrop = document.getElementById('advanced-backdrop');
  const closeAdvancedBtn = document.getElementById('close-advanced-btn');

  // Timeouts & Tracking
  let sideChangeTimeout = null;
  let toastHideTimeout = null;

  // --- Haptic Feedback Helper ---
  function triggerHaptic(pattern = 20) {
    if (hapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }

  if (hapticToggle) {
    hapticToggle.checked = hapticsEnabled;
    hapticToggle.addEventListener('change', () => {
      hapticsEnabled = hapticToggle.checked;
      localStorage.setItem('baseball_haptics_enabled', String(hapticsEnabled));
      if (hapticsEnabled) triggerHaptic(30);
    });
  }

  // --- Visual Feedback & Toast Utilities ---
  function triggerPop(element) {
    if (!element) return;
    element.classList.remove('pop-feedback');
    void element.offsetWidth; // Force DOM reflow
    element.classList.add('pop-feedback');
  }

  function showInningToast(badgeText, messageText) {
    const toast = document.getElementById('inning-toast');
    const toastBadge = document.getElementById('toast-badge');
    const toastText = document.getElementById('toast-message');

    if (!toast) return;
    if (toastBadge) toastBadge.textContent = badgeText;
    if (toastText) toastText.textContent = messageText;

    toast.classList.add('show');
    clearTimeout(toastHideTimeout);
    toastHideTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 1800);
  }

  // --- Dynamic Team Names Sizing (Prevent Overflows) ---
  function fitTeamNames() {
    if (!homeLabelEl || !awayLabelEl) return;
    const maxLen = Math.max(homeTeamName.length, awayTeamName.length);

    homeLabelEl.classList.remove('compact', 'ultra-compact');
    awayLabelEl.classList.remove('compact', 'ultra-compact');

    if (maxLen >= 11) {
      homeLabelEl.classList.add('ultra-compact');
      awayLabelEl.classList.add('ultra-compact');
    } else if (maxLen >= 7) {
      homeLabelEl.classList.add('compact');
      awayLabelEl.classList.add('compact');
    }

    requestAnimationFrame(updateUnderlinePosition);
  }

  // --- Sliding Underline Positioner ---
  function updateUnderlinePosition() {
    if (!teamLabelsContainer || !battingUnderline || !awayLabelEl || !homeLabelEl) return;

    const targetLabel = isTopInning ? awayLabelEl : homeLabelEl;
    const containerRect = teamLabelsContainer.getBoundingClientRect();
    const labelRect = targetLabel.getBoundingClientRect();

    if (containerRect.width === 0 || labelRect.width === 0) return;

    const leftOffset = labelRect.left - containerRect.left;
    const labelWidth = labelRect.width;

    battingUnderline.style.width = `${labelWidth}px`;
    battingUnderline.style.transform = `translateX(${leftOffset}px)`;
  }

  window.addEventListener('resize', () => {
    fitTeamNames();
    updateUnderlinePosition();
  });
  setTimeout(fitTeamNames, 60);
  setTimeout(updateUnderlinePosition, 100);
  setTimeout(updateUnderlinePosition, 300);

  // --- Mobile Pull-To-Refresh Prevention ---
  function preventMobilePullToRefresh(el) {
    if (!el) return;
    el.addEventListener('touchmove', (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  preventMobilePullToRefresh(homeScoreEl);
  preventMobilePullToRefresh(awayScoreEl);
  preventMobilePullToRefresh(inningContainer);
  preventMobilePullToRefresh(outsContainer);
  preventMobilePullToRefresh(document.querySelector('.score-card'));

  // --- Runs (Score) Modification Logic ---
  function changeHomeScore(delta) {
    const prev = homeScoreVal;
    homeScoreVal = Math.max(0, homeScoreVal + delta);
    if (homeScoreEl) {
      homeScoreEl.textContent = homeScoreVal;
      triggerPop(homeScoreEl);
    }
    updateSharePreview();
    if (homeScoreVal !== prev) {
      triggerHaptic(20);
      return true;
    }
    return false;
  }

  function changeAwayScore(delta) {
    const prev = awayScoreVal;
    awayScoreVal = Math.max(0, awayScoreVal + delta);
    if (awayScoreEl) {
      awayScoreEl.textContent = awayScoreVal;
      triggerPop(awayScoreEl);
    }
    updateSharePreview();
    if (awayScoreVal !== prev) {
      triggerHaptic(20);
      return true;
    }
    return false;
  }

  // --- Inning Display Update ---
  function updateInningDisplay() {
    if (inningValEl) {
      inningValEl.textContent = currentInning;
    }

    if (inningUpBtn) {
      inningUpBtn.classList.toggle('active', isTopInning);
      inningUpBtn.setAttribute('aria-pressed', isTopInning ? 'true' : 'false');
      inningUpBtn.title = isTopInning ? 'Top of Inning' : 'Set Top of Inning';
    }
    if (inningDownBtn) {
      inningDownBtn.classList.toggle('active', !isTopInning);
      inningDownBtn.setAttribute('aria-pressed', !isTopInning ? 'true' : 'false');
      inningDownBtn.title = !isTopInning ? 'Bottom of Inning' : 'Set Bottom of Inning';
    }

    if (awayLabelEl && homeLabelEl) {
      awayLabelEl.classList.toggle('batting', isTopInning);
      homeLabelEl.classList.toggle('batting', !isTopInning);
    }

    requestAnimationFrame(updateUnderlinePosition);
    updateSharePreview();
  }

  // Advance by 1 half-inning
  function advanceHalfInning() {
    clearTimeout(sideChangeTimeout);
    if (isTopInning) {
      isTopInning = false;
    } else {
      currentInning++;
      isTopInning = true;
    }
    triggerPop(inningContainer);
    updateInningDisplay();
    triggerHaptic(25);
  }

  // Decrease by 1 half-inning
  function decreaseHalfInning() {
    clearTimeout(sideChangeTimeout);
    let changed = false;
    if (!isTopInning) {
      isTopInning = true;
      changed = true;
    } else if (currentInning > 1) {
      currentInning--;
      isTopInning = false;
      changed = true;
    }
    if (changed) {
      triggerPop(inningContainer);
      updateInningDisplay();
      triggerHaptic(18);
      return true;
    }
    return false;
  }

  // --- Outs Tracker Logic ---
  function updateOutsDisplay() {
    outCircles.forEach((circle) => {
      const outNum = parseInt(circle.getAttribute('data-out'), 10);
      circle.classList.toggle('active', outNum <= currentOuts);
    });
    updateSharePreview();
  }

  function handleThreeOuts() {
    clearTimeout(sideChangeTimeout);

    currentOuts = 3;
    updateOutsDisplay();

    if (outsContainer) {
      outsContainer.classList.remove('flash-3outs');
      void outsContainer.offsetWidth;
      outsContainer.classList.add('flash-3outs');
    }

    showInningToast('3 OUTS', 'CHANGE SIDES');
    triggerHaptic([40, 60, 40]);

    sideChangeTimeout = setTimeout(() => {
      currentOuts = 0;
      updateOutsDisplay();
      advanceHalfInning();
    }, 450);
  }

  function changeOuts(delta) {
    if (delta > 0) {
      if (currentOuts + 1 >= 3) {
        handleThreeOuts();
        return true;
      } else {
        clearTimeout(sideChangeTimeout);
        currentOuts += delta;
        triggerPop(outsContainer);
        updateOutsDisplay();
        triggerHaptic(20);
        return true;
      }
    } else {
      clearTimeout(sideChangeTimeout);
      const prev = currentOuts;
      currentOuts = Math.max(0, currentOuts + delta);
      if (currentOuts !== prev) {
        triggerPop(outsContainer);
        updateOutsDisplay();
        triggerHaptic(15);
        return true;
      }
      return false;
    }
  }

  // --- Unified Tap-And-Hold Controller ---
  // TAP: increases by 1
  // HOLD (>= 400ms): decreases by 1, and continues stepping down incrementally every 500ms
  // --- Unified Tap-And-Hold Controller ---
  // TAP: increases by 1
  // HOLD (>= 480ms): slowly decreases by 1, then steadily steps down one-by-one
  // Fixed bug where mobile contextmenu or swipe fired duplicate decrements.
  function setupTapAndHold(element, { onIncrease, onDecrease, holdDelay = 480, stepInterval = 550, onSwipeUp, onSwipeDown, itemName = 'Item', toastTag = 'SCORE' }) {
    if (!element) return;
    let holdTimeout = null;
    let repeatTimeout = null;
    let holdInterval = null;
    let isHolding = false;
    let holdCount = 0;
    let startTime = 0;
    let startY = 0;
    let movedFar = false;

    element.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      isHolding = false;
      movedFar = false;
      holdCount = 0;
      startTime = Date.now();
      startY = e.clientY;

      clearTimeout(holdTimeout);
      clearTimeout(repeatTimeout);
      clearInterval(holdInterval);

      holdTimeout = setTimeout(() => {
        isHolding = true;
        const couldDec = onDecrease();
        if (couldDec !== false) {
          holdCount = 1;
          showInningToast(toastTag, `${itemName} Removed x ${holdCount}`);

          // Give user a comfortable pause after the 1st removal before subsequent decrements
          repeatTimeout = setTimeout(() => {
            if (!isHolding) return;
            holdInterval = setInterval(() => {
              const continueDec = onDecrease();
              if (continueDec === false) {
                clearInterval(holdInterval);
              } else {
                holdCount++;
                showInningToast(toastTag, `${itemName} Removed x ${holdCount}`);
              }
            }, stepInterval);
          }, 300);
        }
      }, holdDelay);

      if (typeof element.setPointerCapture === 'function') {
        try { element.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });

    element.addEventListener('pointermove', (e) => {
      const diffY = e.clientY - startY;
      if (Math.abs(diffY) > 24) {
        movedFar = true;
      }
    });

    const handleEnd = (e) => {
      clearTimeout(holdTimeout);
      clearTimeout(repeatTimeout);
      clearInterval(holdInterval);

      const duration = Date.now() - startTime;
      const diffY = e.clientY - startY;

      // Only handle swipe if the user moved intentionally AND was not in a hold
      if (!isHolding && movedFar && Math.abs(diffY) >= 28) {
        if (diffY < 0 && onSwipeUp) {
          onSwipeUp();
          return;
        } else if (diffY > 0 && onSwipeDown) {
          onSwipeDown();
          return;
        }
      }

      // If it was a clean quick tap (not held, not dragged far)
      if (!isHolding && !movedFar && duration < holdDelay && duration > 15) {
        onIncrease();
      }
      isHolding = false;
    };

    element.addEventListener('pointerup', handleEnd);
    element.addEventListener('pointercancel', () => {
      clearTimeout(holdTimeout);
      clearTimeout(repeatTimeout);
      clearInterval(holdInterval);
      isHolding = false;
    });

    // Mobile browsers fire contextmenu on long-press; prevent default without causing duplicate decrements!
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  // 1. Home Score: Tap = +1, Hold = slow -1 decrement
  setupTapAndHold(homeScoreEl, {
    onIncrease: () => changeHomeScore(+1),
    onDecrease: () => changeHomeScore(-1),
    onSwipeUp: () => changeHomeScore(+1),
    onSwipeDown: () => changeHomeScore(-1),
    itemName: 'Run',
    toastTag: 'HOME'
  });

  // 2. Away Score: Tap = +1, Hold = slow -1 decrement
  setupTapAndHold(awayScoreEl, {
    onIncrease: () => changeAwayScore(+1),
    onDecrease: () => changeAwayScore(-1),
    onSwipeUp: () => changeAwayScore(+1),
    onSwipeDown: () => changeAwayScore(-1),
    itemName: 'Run',
    toastTag: 'AWAY'
  });

  // 3. Inning Stepper: Tap = +1 half inning, Hold = slow -1 half inning decrement
  setupTapAndHold(inningContainer, {
    onIncrease: () => advanceHalfInning(),
    onDecrease: () => decreaseHalfInning(),
    onSwipeUp: () => advanceHalfInning(),
    onSwipeDown: () => decreaseHalfInning(),
    itemName: 'Half-Inning',
    toastTag: 'INNING'
  });

  // 4. Outs Container: Tap anywhere = +1 Out, Hold = slow -1 decrement
  setupTapAndHold(outsContainer, {
    onIncrease: () => changeOuts(+1),
    onDecrease: () => changeOuts(-1),
    onSwipeUp: () => changeOuts(+1),
    onSwipeDown: () => changeOuts(-1),
    itemName: 'Out',
    toastTag: 'OUTS'
  });

  // Tapping Home or Away team label swaps batting side
  if (homeLabelEl) {
    homeLabelEl.addEventListener('click', () => {
      if (isTopInning) {
        clearTimeout(sideChangeTimeout);
        isTopInning = false;
        triggerPop(homeLabelEl);
        updateInningDisplay();
        triggerHaptic(20);
      }
    });
  }

  if (awayLabelEl) {
    awayLabelEl.addEventListener('click', () => {
      if (!isTopInning) {
        clearTimeout(sideChangeTimeout);
        isTopInning = true;
        triggerPop(awayLabelEl);
        updateInningDisplay();
        triggerHaptic(20);
      }
    });
  }

  // --- Stopwatch Game Clock ---
  function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isTimerRunning) {
        secondsElapsed++;
        if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
      }
    }, 1000);
  }

  function updateTimerUI() {
    if (timerDisplay) {
      timerDisplay.classList.toggle('paused', !isTimerRunning);
    }
    if (timerIcon) {
      // When running: SHOW pause icon (clicking will pause)
      // When paused: SHOW play icon (clicking will resume/play)
      timerIcon.className = isTimerRunning ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    }
    if (modalTimerIcon) {
      modalTimerIcon.className = isTimerRunning ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    }
    if (modalTimerText) {
      modalTimerText.textContent = isTimerRunning ? 'Pause Clock' : 'Start Clock';
    }
  }

  function toggleTimer() {
    isTimerRunning = !isTimerRunning;
    updateTimerUI();
    showInningToast('CLOCK', isTimerRunning ? 'STARTED' : 'PAUSED');
    triggerHaptic(20);
  }

  function resetTimer() {
    secondsElapsed = 0;
    isTimerRunning = false; // Paused by default when resetting clock
    if (timerEl) {
      timerEl.textContent = formatTime(0);
      triggerPop(timerDisplay);
    }
    updateTimerUI();
    showInningToast('CLOCK', 'RESET (00:00:00)');
    updateSharePreview();
    triggerHaptic([30, 40]);
  }

  startTimer();

  if (timerDisplay) {
    timerDisplay.addEventListener('click', toggleTimer);
    timerDisplay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      resetTimer();
    });
  }

  // --- Circular Magnifying Glass Theme Transition (Slow & Smooth) ---
  // Like placing a magnifying glass over the picture: the expanding circular lens reveals
  // the entire application in the new theme wherever it touches, with old theme everywhere else
  function applyThemeWithCircularPaint(newTheme) {
    if (currentTheme === newTheme) return;

    triggerHaptic(30);
    document.documentElement.classList.add('in-theme-transition');

    // Modern View Transitions API (Chrome, Edge, Safari 18+)
    if (typeof document.startViewTransition === 'function') {
      try {
        const transition = document.startViewTransition(() => {
          document.body.setAttribute('data-theme', newTheme);
          currentTheme = newTheme;
          localStorage.setItem('baseball_theme', newTheme);

          themeCards.forEach((c) => c.classList.toggle('active', c.getAttribute('data-theme') === newTheme));
          updateUnderlinePosition();
          fitTeamNames();
        });

        // Add pure GPU-scaled ring rim on top
        const ring = document.createElement('div');
        ring.className = 'theme-magnifier-ring';
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 1400);

        transition.finished
          .catch(() => {})
          .finally(() => {
            document.documentElement.classList.remove('in-theme-transition');
            updateUnderlinePosition();
          });
        return;
      } catch (_) {
        document.documentElement.classList.remove('in-theme-transition');
        // Fallback to clone overlay if View Transition throws
      }
    }

    // High-fidelity DOM Clone Fallback (works in all webviews / browsers):
    // Clones the application inside an overlay with data-theme="newTheme",
    // expanding outward with circular clip-path like a magnifying lens.
    const overlay = document.createElement('div');
    overlay.className = 'theme-magnifier-clone-overlay';
    overlay.setAttribute('data-theme', newTheme);

    const container = document.querySelector('.scoreboard-container');
    if (container) {
      const clone = container.cloneNode(true);
      const cloneHome = clone.querySelector('#home-name-input');
      const cloneAway = clone.querySelector('#away-name-input');
      if (cloneHome && homeNameInput) cloneHome.value = homeNameInput.value;
      if (cloneAway && awayNameInput) cloneAway.value = awayNameInput.value;
      clone.querySelectorAll('.theme-card').forEach((c) => {
        c.classList.toggle('active', c.getAttribute('data-theme') === newTheme);
      });
      overlay.appendChild(clone);
    }

    const ring = document.createElement('div');
    ring.className = 'theme-magnifier-ring';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 1400);

    document.body.appendChild(overlay);

    const anim = overlay.animate([
      { clipPath: 'circle(0% at 50% 50%)' },
      { clipPath: 'circle(150vmax at 50% 50%)' }
    ], {
      duration: 1350,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    });

    anim.onfinish = () => {
      document.body.setAttribute('data-theme', newTheme);
      currentTheme = newTheme;
      localStorage.setItem('baseball_theme', newTheme);

      themeCards.forEach((c) => c.classList.toggle('active', c.getAttribute('data-theme') === newTheme));
      updateUnderlinePosition();
      fitTeamNames();
      overlay.remove();
      document.documentElement.classList.remove('in-theme-transition');
    };
  }

  // --- Settings Drawer ---
  function openSettings() {
    if (!settingsBackdrop) return;
    if (homeNameInput) homeNameInput.value = homeTeamName;
    if (awayNameInput) awayNameInput.value = awayTeamName;
    settingsBackdrop.classList.add('open');
    settingsBackdrop.setAttribute('aria-hidden', 'false');
    updateTimerUI();
    triggerHaptic(20);
  }

  function closeSettings() {
    if (!settingsBackdrop) return;
    settingsBackdrop.classList.remove('open');
    settingsBackdrop.setAttribute('aria-hidden', 'true');
    setTimeout(updateUnderlinePosition, 100);
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettings);
  }

  if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', (e) => {
      if (e.target === settingsBackdrop) closeSettings();
    });
  }

  // Theme Picker
  themeCards.forEach((card) => {
    card.addEventListener('click', () => {
      const theme = card.getAttribute('data-theme');
      if (!theme) return;
      applyThemeWithCircularPaint(theme);
    });
  });

  // Set active theme card on start
  themeCards.forEach((c) => c.classList.toggle('active', c.getAttribute('data-theme') === currentTheme));

  // Team Names Input
  if (homeNameInput) {
    homeNameInput.addEventListener('input', () => {
      homeTeamName = homeNameInput.value.trim() || 'Home';
      if (homeLabelEl) homeLabelEl.textContent = homeTeamName;
      localStorage.setItem('baseball_home_team', homeTeamName);
      fitTeamNames();
      updateSharePreview();
    });
  }

  if (awayNameInput) {
    awayNameInput.addEventListener('input', () => {
      awayTeamName = awayNameInput.value.trim() || 'Away';
      if (awayLabelEl) awayLabelEl.textContent = awayTeamName;
      localStorage.setItem('baseball_away_team', awayTeamName);
      fitTeamNames();
      updateSharePreview();
    });
  }

  if (homeLabelEl) homeLabelEl.textContent = homeTeamName;
  if (awayLabelEl) awayLabelEl.textContent = awayTeamName;
  fitTeamNames();

  // Modal Clock Controls
  if (modalTimerToggleBtn) {
    modalTimerToggleBtn.addEventListener('click', toggleTimer);
  }

  if (modalTimerResetBtn) {
    modalTimerResetBtn.addEventListener('click', resetTimer);
  }

  // Clear Runs
  if (clearRunsBtn) {
    clearRunsBtn.addEventListener('click', () => {
      homeScoreVal = 0;
      awayScoreVal = 0;
      if (homeScoreEl) homeScoreEl.textContent = '0';
      if (awayScoreEl) awayScoreEl.textContent = '0';
      updateSharePreview();
      showInningToast('SCORES', 'RESET TO 0 - 0');
      triggerHaptic([30, 30]);
      closeSettings();
    });
  }

  // New Game
  if (resetGameBtn) {
    resetGameBtn.addEventListener('click', () => {
      homeScoreVal = 0;
      awayScoreVal = 0;
      currentInning = 1;
      isTopInning = true;
      currentOuts = 0;
      secondsElapsed = 0;
      isTimerRunning = false;

      if (homeScoreEl) homeScoreEl.textContent = '0';
      if (awayScoreEl) awayScoreEl.textContent = '0';
      if (timerEl) timerEl.textContent = formatTime(0);

      clearTimeout(sideChangeTimeout);
      updateInningDisplay();
      updateOutsDisplay();
      updateTimerUI();
      showInningToast('GAME', 'NEW GAME STARTED');
      triggerHaptic([40, 50, 40]);
      closeSettings();
    });
  }

  // --- Live Sportscast Authentic Broadcaster Commentary Generator ---
  function getOrdinal(num) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function generateSportscastAnnouncerCall() {
    const half = isTopInning ? 'top' : 'bottom';
    const ordInning = `${currentInning}${getOrdinal(currentInning)}`;
    const outsStr = currentOuts === 1 ? '1 out' : `${currentOuts} outs`;
    const diff = Math.abs(homeScoreVal - awayScoreVal);
    const leader = homeScoreVal > awayScoreVal ? homeTeamName : (awayScoreVal > homeScoreVal ? awayTeamName : null);
    const trailer = homeScoreVal > awayScoreVal ? awayTeamName : (awayScoreVal > homeScoreVal ? homeTeamName : null);
    const leadScore = Math.max(homeScoreVal, awayScoreVal);
    const trailScore = Math.min(homeScoreVal, awayScoreVal);
    const batting = isTopInning ? awayTeamName : homeTeamName;

    // Stem 1: Tied Ballgame
    if (diff === 0) {
      if (homeScoreVal === 0) {
        const scorelessStems = [
          `"Welcome in baseball fans! We've got a classic pitchers' duel underway. Not a single run on the board as ${homeTeamName} and ${awayTeamName} are locked at 0-0 in the ${half} of the ${ordInning} with ${outsStr}."`,
          `"Zeroes across the scoreboard folks! Both starting arms are dealing pure fire. It's ${homeTeamName} 0, ${awayTeamName} 0 in the ${half} of the ${ordInning} with ${outsStr}. Who is gonna blink first?"`,
          `"Defensive clinic out there today! Scoreless at 0-0 between ${homeTeamName} and ${awayTeamName} in the ${half} of the ${ordInning}."`
        ];
        return scorelessStems[Math.floor(Math.random() * scorelessStems.length)];
      } else {
        const tiedStems = [
          `"Folks, we've got a dead heat! All knotted up at ${homeScoreVal} apiece as ${batting} steps in here in the ${half} of the ${ordInning} with ${outsStr}. Anyone's ballgame right now!"`,
          `"Back to square one! ${homeTeamName} and ${awayTeamName} are deadlocked at ${homeScoreVal} runs each in the ${half} of the ${ordInning}. The next big swing could decide this clash!"`,
          `"You couldn't slip a sheet of paper between these two clubs today! Tied at ${homeScoreVal} to ${awayScoreVal} with ${outsStr} in the ${half} of the ${ordInning}!"`
        ];
        return tiedStems[Math.floor(Math.random() * tiedStems.length)];
      }
    }

    // Stem 2: Crushing / Blowout (diff >= 4)
    if (diff >= 4) {
      const crushingStems = [
        `"And what an absolute shellacking we are witnessing! ${leader} is completely crushing ${trailer}, pouring it on for a commanding ${leadScore} to ${trailScore} lead in the ${half} of the ${ordInning}!"`,
        `"Hold onto your caps, folks, because ${leader} is running away with this one! An explosive offensive clinic has them blowing out ${trailer} ${leadScore}-${trailScore} in the ${half} of the ${ordInning} with ${outsStr}."`,
        `"Total and utter dominance from ${leader}! They are pulverizing the baseball today, leading ${leadScore} to ${trailScore} over a shell-shocked ${trailer} dugout in the ${half} of the ${ordInning}."`,
        `"This one has turned into a runaway train! ${leader} is crushing ${trailer} by ${diff} runs, sitting pretty at ${leadScore}-${trailScore} in the ${half} of the ${ordInning}!"`
      ];
      return crushingStems[Math.floor(Math.random() * crushingStems.length)];
    }

    // Stem 3: Barely Scraping By / Nail-biter (diff === 1)
    if (diff === 1) {
      const scrapingStems = [
        `"Talk about edge-of-your-seat drama! ${leader} is barely scraping by with a razor-thin ${leadScore}-${trailScore} edge over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}."`,
        `"Every single pitch is magnified right now! ${leader} is clinging for dear life to a fragile 1-run lead, up ${leadScore} to ${trailScore} as ${trailer} lurks just one swing away in the ${half} of the ${ordInning}!"`,
        `"A pure white-knuckle thriller, baseball fans! ${leader} is barely scraping by with a slim ${leadScore}-${trailScore} cushion. Tension is so thick in the ballpark you could cut it with a knife!"`,
        `"Down to the wire! ${leader} holds the slimmest margin in sports—protecting a tight 1-run lead, ${leadScore}-${trailScore} over ${trailer} with ${outsStr} in the ${half} of the ${ordInning}!"`
      ];
      return scrapingStems[Math.floor(Math.random() * scrapingStems.length)];
    }

    // Stem 4: Solid Lead (diff 2 or 3)
    const solidStems = [
      `"${leader} holding steady control right now! They carry a solid ${leadScore}-${trailScore} lead over ${trailer} as play continues in the ${half} of the ${ordInning} with ${outsStr}."`,
      `"${leader} keeping ${trailer} at arm's length! It's a ${leadScore}-${trailScore} ballgame in the ${half} of the ${ordInning}. ${trailer} needs to string some hits together soon!"`,
      `"Good situational baseball on display! ${leader} is in front ${leadScore} to ${trailScore} over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}."`
    ];
    return solidStems[Math.floor(Math.random() * solidStems.length)];
  }

  // --- Share Message Formatter ---
  function generateShareMessage(format) {
    const half = isTopInning ? 'Top' : 'Bottom';
    const outsStr = `${currentOuts} ${currentOuts === 1 ? 'Out' : 'Outs'}`;
    const timeStr = formatTime(secondsElapsed);

    switch (format) {
      case 'basic':
        return `${homeTeamName} ${homeScoreVal} - ${awayScoreVal} ${awayTeamName}`;

      case 'standard':
        return `${homeTeamName} ${homeScoreVal} - ${awayScoreVal} ${awayTeamName} (${half} ${currentInning} • ${outsStr} • Clock: ${timeStr})`;

      case 'broadcast':
        return generateSportscastAnnouncerCall();

      default:
        return `${homeTeamName} ${homeScoreVal} - ${awayScoreVal} ${awayTeamName}`;
    }
  }

  function updateSharePreview() {
    if (!sharePreviewText) return;
    sharePreviewText.textContent = generateShareMessage(selectedShareFormat);
  }

  // --- Share Drawer Actions ---
  function openShareMenu() {
    if (!shareBackdrop) return;
    updateSharePreview();
    shareBackdrop.classList.add('open');
    shareBackdrop.setAttribute('aria-hidden', 'false');
    triggerHaptic(20);
  }

  function closeShareMenu() {
    if (!shareBackdrop) return;
    shareBackdrop.classList.remove('open');
    shareBackdrop.setAttribute('aria-hidden', 'true');
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', openShareMenu);
  }

  if (closeShareBtn) {
    closeShareBtn.addEventListener('click', closeShareMenu);
  }

  if (shareBackdrop) {
    shareBackdrop.addEventListener('click', (e) => {
      if (e.target === shareBackdrop) closeShareMenu();
    });
  }

  // --- Advanced Tools Drawer ---
  function openAdvancedTools() {
    if (!advancedBackdrop) return;
    renderHitList();
    advancedBackdrop.classList.add('open');
    advancedBackdrop.setAttribute('aria-hidden', 'false');
    setTimeout(updateStadiumScale, 60);
    setTimeout(updateStadiumScale, 300);
    triggerHaptic(20);
  }

  function closeAdvancedTools() {
    if (!advancedBackdrop) return;
    advancedBackdrop.classList.remove('open');
    advancedBackdrop.setAttribute('aria-hidden', 'true');
  }

  if (advancedToolsBtn) {
    advancedToolsBtn.addEventListener('click', openAdvancedTools);
  }

  if (closeAdvancedBtn) {
    closeAdvancedBtn.addEventListener('click', closeAdvancedTools);
  }

  if (advancedBackdrop) {
    advancedBackdrop.addEventListener('click', (e) => {
      if (e.target === advancedBackdrop) closeAdvancedTools();
    });
  }

  // --- Canvas Instructure Style Modules (Dropdown Functionality) ---
  const canvasModules = document.querySelectorAll('.canvas-module');
  canvasModules.forEach((mod) => {
    const header = mod.querySelector('.module-header');
    if (header) {
      header.addEventListener('click', () => {
        const isOpen = mod.classList.contains('open');
        if (isOpen) {
          mod.classList.remove('open');
          mod.classList.add('collapsed');
          header.setAttribute('aria-expanded', 'false');
        } else {
          mod.classList.add('open');
          mod.classList.remove('collapsed');
          header.setAttribute('aria-expanded', 'true');
          if (mod.id === 'module-hit-log') {
            setTimeout(updateStadiumScale, 40);
            setTimeout(updateStadiumScale, 320);
          }
        }
        triggerHaptic(15);
      });
    }
  });

  // --- Hit Log Tool (Minimalist Bleacher Scorekeeper) ---
  const hitPlayerInput = document.getElementById('hit-player-input');
  const hitOutcomeSelect = document.getElementById('hit-outcome-select');
  const diamondSectionBlock = document.getElementById('diamond-section-block');
  const noDiamondMsg = document.getElementById('no-diamond-msg');
  const stadiumViewport = document.getElementById('stadium-viewport');
  const stadiumEl = document.getElementById('stadium');
  const stadiumHitMarker = document.getElementById('stadium-hit-marker');
  const hitLocationTag = document.getElementById('hit-location-tag');
  const logHitSubmitBtn = document.getElementById('log-hit-submit-btn');
  const loggedHitsList = document.getElementById('logged-hits-list');
  const clearHitsBtn = document.getElementById('clear-hits-btn');
  const hitLogBadge = document.getElementById('hit-log-badge');

  let currentHitLocation = { x: 490, y: 237, name: 'Second Base (2B)' };
  let hitLogData = [];
  try {
    hitLogData = JSON.parse(localStorage.getItem('baseball_hit_log') || '[]');
  } catch (_) {
    hitLogData = [];
  }

  // Dynamic Responsive Stadium Scaling (snugly fits diamond into box with no wasted space)
  function updateStadiumScale() {
    if (!stadiumViewport || !stadiumEl) return;
    const vpWidth = stadiumViewport.clientWidth;
    const vpHeight = stadiumViewport.clientHeight;
    if (vpWidth === 0 || vpHeight === 0) return;
    // Diamond visual bounding box: 690px width, 660px height
    const scale = Math.min((vpWidth - 10) / 690, (vpHeight - 10) / 660);
    stadiumEl.style.transform = `translate(-490px, -380px) scale(${scale})`;
    stadiumEl.dataset.scale = String(scale);
  }

  window.addEventListener('resize', updateStadiumScale);

  // Exact Baseball Diamond Field Geometry Calculator
  // Accurate outfield fence curve and infield dirt boundary
  function calculateHitZone(x, y) {
    const homeX = 490;
    const homeY = 680;
    const dx = x - homeX;
    const dy = homeY - y; // positive towards outfield
    const dist = Math.hypot(dx, dy);
    const angleDeg = Math.atan2(dx, dy) * (180 / Math.PI); // 0 = straight up to CF

    // 1. Foul territory: Outside left foul line (-45°) or right foul line (+45°), or behind home plate (dy < -15)
    if (dy < -15 || angleDeg < -45.0 || angleDeg > 45.0) {
      if (dy < -15) return 'Foul (Behind Plate)';
      if (dx < 0) {
        if (dist > 620) return 'Foul (Left - Out of Park)';
        if (dist > 400) return 'Foul (Left Outfield)';
        return 'Foul (Third Baseline)';
      } else {
        if (dist > 620) return 'Foul (Right - Out of Park)';
        if (dist > 400) return 'Foul (Right Outfield)';
        return 'Foul (First Baseline)';
      }
    }

    // 2. Out of the park: follow top curve of outfield fence (dist > 620 in fair territory)
    if (dist > 620) {
      if (angleDeg < -15) return 'Out of the Park (Left Field)';
      if (angleDeg > 15) return 'Out of the Park (Right Field)';
      return 'Out of the Park (Center Field)';
    }

    // 3. Infield dirt boundary:
    // Second base dirt apex is at ~490px in center, tapering to ~360px along 1B/3B foul lines
    const normAngle = Math.min(1, Math.abs(angleDeg) / 45);
    const dirtRadius = 490 - (130 * Math.pow(normAngle, 1.3));

    // If inside infield dirt: strictly infield!
    if (dist <= dirtRadius) {
      if (dist < 85) return 'Home Plate';
      if (Math.hypot(x - 490, y - 460) <= 55 || (dist < 250 && Math.abs(angleDeg) <= 16)) {
        return "Pitcher's Mound";
      }
      // Specific bases
      if (Math.hypot(x - 712, y - 456) <= 55) return 'First Base (1B)';
      if (Math.hypot(x - 268, y - 456) <= 55) return 'Third Base (3B)';
      if (Math.hypot(x - 490, y - 237) <= 55) return 'Second Base (2B)';
      if (Math.hypot(x - 375, y - 350) <= 55) return 'Shortstop (SS)';

      // Infield zones
      if (dist < 360) {
        if (angleDeg < -24) return 'Third Base (3B)';
        if (angleDeg > 24) return 'First Base (1B)';
        if (angleDeg <= 0) return 'Shortstop (SS)';
        return 'Second Base (2B)';
      } else {
        if (angleDeg < -20) return 'Deep 3B (Hole)';
        if (angleDeg > 20) return 'Deep 1B (Hole)';
        if (angleDeg <= 0) return 'Deep Shortstop';
        return 'Deep Second Base';
      }
    }

    // 4. Outfield (only strictly past the infield dirt: dist > dirtRadius && dist <= 620)
    // Shallow Outfield
    if (dist <= dirtRadius + 45) {
      if (angleDeg < -15) return 'Shallow Left Field';
      if (angleDeg > 15) return 'Shallow Right Field';
      return 'Shallow Center Field';
    }

    // Mid Outfield
    if (dist <= 575) {
      if (angleDeg < -15) return 'Left Field';
      if (angleDeg > 15) return 'Right Field';
      return 'Center Field';
    }

    // Deep Outfield / Warning Track
    if (angleDeg < -15) return 'Deep Left Field';
    if (angleDeg > 15) return 'Deep Right Field';
    return 'Deep Center Field';
  }

  function placeHitPin(x, y, forcedName = null) {
    const clampedX = Math.max(60, Math.min(930, Math.round(x)));
    const clampedY = Math.max(20, Math.min(730, Math.round(y)));
    const zoneName = forcedName || calculateHitZone(clampedX, clampedY);

    currentHitLocation = {
      x: clampedX,
      y: clampedY,
      name: zoneName
    };

    if (stadiumHitMarker) {
      stadiumHitMarker.style.display = 'block';
      stadiumHitMarker.style.left = `${clampedX}px`;
      stadiumHitMarker.style.top = `${clampedY}px`;
    }
    if (hitLocationTag) {
      hitLocationTag.textContent = zoneName;
    }

    triggerHaptic(20);
  }

  // Initial Pin default to 2B
  placeHitPin(490, 237, 'Second Base (2B)');

  if (stadiumViewport) {
    stadiumViewport.addEventListener('pointerdown', (e) => {
      if (!stadiumEl) return;
      const rect = stadiumViewport.getBoundingClientRect();
      const scale = parseFloat(stadiumEl.dataset.scale || '0.42');
      const vpCenterX = rect.left + rect.width / 2;
      const vpCenterY = rect.top + rect.height / 2;
      const relX = e.clientX - vpCenterX;
      const relY = e.clientY - vpCenterY;
      const x = 490 + (relX / scale);
      const y = 380 + (relY / scale);

      placeHitPin(x, y);
    });
  }

  // Outcome Change: Hide diamond if Walk or Strikeout, or auto-set location
  function handleOutcomeChange() {
    if (!hitOutcomeSelect) return;
    const outcome = hitOutcomeSelect.value;
    const isWalkOrK = outcome === 'Walk' || outcome === 'Strikeout';

    if (diamondSectionBlock) diamondSectionBlock.style.display = isWalkOrK ? 'none' : 'block';
    if (noDiamondMsg) noDiamondMsg.style.display = isWalkOrK ? 'flex' : 'none';
  }

  if (hitOutcomeSelect) {
    hitOutcomeSelect.addEventListener('change', handleOutcomeChange);
    handleOutcomeChange();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Build clean display sentence for hit log
  function formatHitSentence(player, outcome, location) {
    const name = player && player.trim() ? player.trim() : 'Batter';
    const loc = location ? location.replace(/\s*\([^)]*\)/g, '').trim() : '';

    if (outcome === 'Strikeout') {
      return `${name} struck out.`;
    }
    if (outcome === 'Walk') {
      return `${name} walked.`;
    }
    if (outcome === 'Error - 1st' || outcome === 'Reached 1st on Error') {
      return `${name} reached first on an error.`;
    }
    if (outcome === 'Error - 2nd' || outcome === 'Reached 2nd on Error') {
      return `${name} reached second on an error.`;
    }
    if (outcome === 'Error - 3rd' || outcome === 'Reached 3rd on Error') {
      return `${name} reached third on an error.`;
    }
    if (outcome === 'Flyout') {
      return `${name} flied out to ${loc || 'the outfield'}.`;
    }
    if (outcome === 'Groundout') {
      return `${name} grounded out to ${loc || 'the infield'}.`;
    }
    if (outcome === 'Home Run') {
      return `${name} hit a home run to ${loc || 'Center Field'}.`;
    }
    if (outcome === 'Single') {
      return `${name} hit a single to ${loc || 'the outfield'}.`;
    }
    if (outcome === 'Double') {
      return `${name} hit a double to ${loc || 'the outfield'}.`;
    }
    if (outcome === 'Triple') {
      return `${name} hit a triple to ${loc || 'the outfield'}.`;
    }
    if (outcome === 'Foul Ball') {
      return `${name} hit a foul ball to ${loc || 'foul territory'}.`;
    }
    return `${name} hit a ${outcome.toLowerCase()} to ${loc || 'the field'}.`;
  }

  // Drag and drop reordering for hits (Desktop drag and mobile touch-and-hold drag)
  let draggedHitIndex = null;

  function setupHitReordering() {
    if (!loggedHitsList) return;
    const cards = loggedHitsList.querySelectorAll('.logged-hit-card');

    cards.forEach((card, index) => {
      card.setAttribute('draggable', 'true');

      // Desktop drag events
      card.addEventListener('dragstart', (e) => {
        draggedHitIndex = index;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        cards.forEach(c => c.classList.remove('drag-over'));
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cards.forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const fromIdx = draggedHitIndex;
        const toIdx = index;
        if (fromIdx !== null && fromIdx !== toIdx) {
          const [moved] = hitLogData.splice(fromIdx, 1);
          hitLogData.splice(toIdx, 0, moved);
          localStorage.setItem('baseball_hit_log', JSON.stringify(hitLogData));
          renderHitList();
          triggerHaptic(20);
        }
      });

      // Mobile Touch Hold-To-Drag Support
      let touchTimer = null;
      let startY = 0;
      let isDraggingTouch = false;

      card.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        draggedHitIndex = index;
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => {
          isDraggingTouch = true;
          card.classList.add('dragging');
          triggerHaptic(30);
        }, 260); // 260ms hold to activate drag
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        if (!isDraggingTouch) {
          if (Math.abs(e.touches[0].clientY - startY) > 8) {
            clearTimeout(touchTimer);
          }
          return;
        }
        e.preventDefault(); // Stop drawer scroll while dragging
        const touchY = e.touches[0].clientY;
        const targetCard = document.elementFromPoint(e.touches[0].clientX, touchY)?.closest('.logged-hit-card');
        cards.forEach(c => c.classList.toggle('drag-over', c === targetCard && c !== card));
      }, { passive: false });

      card.addEventListener('touchend', (e) => {
        clearTimeout(touchTimer);
        if (isDraggingTouch) {
          isDraggingTouch = false;
          card.classList.remove('dragging');
          const touch = e.changedTouches[0];
          const targetCard = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.logged-hit-card');
          if (targetCard && targetCard !== card) {
            const toIdx = Array.from(cards).indexOf(targetCard);
            if (toIdx !== -1 && draggedHitIndex !== toIdx) {
              const [moved] = hitLogData.splice(draggedHitIndex, 1);
              hitLogData.splice(toIdx, 0, moved);
              localStorage.setItem('baseball_hit_log', JSON.stringify(hitLogData));
              renderHitList();
              triggerHaptic(25);
            }
          }
          cards.forEach(c => c.classList.remove('drag-over'));
        }
      });

      card.addEventListener('touchcancel', () => {
        clearTimeout(touchTimer);
        isDraggingTouch = false;
        card.classList.remove('dragging');
        cards.forEach(c => c.classList.remove('drag-over'));
      });
    });
  }

  function renderHitList() {
    if (!loggedHitsList) return;
    if (hitLogBadge) {
      hitLogBadge.textContent = `${hitLogData.length} Logged`;
    }

    if (hitLogData.length === 0) {
      loggedHitsList.innerHTML = `<div class="hit-empty-hint">No plays logged yet. Tap the diamond and save your first play!</div>`;
      return;
    }

    loggedHitsList.innerHTML = '';
    hitLogData.forEach((hit) => {
      const card = document.createElement('div');
      card.className = 'logged-hit-card';

      const sentenceText = hit.sentence || formatHitSentence(hit.player, hit.outcome, hit.location);
      const inningDisplay = hit.inning || 'T1';

      card.innerHTML = `
        <span class="reorder-handle" title="Hold and drag to reorder"><i class="fa-solid fa-grip-vertical"></i></span>
        <div class="hit-card-content">
          <span class="hit-play-sentence">${escapeHtml(sentenceText)}</span>
        </div>
        <div class="hit-card-right">
          <span class="hit-inning-badge">${escapeHtml(inningDisplay)}</span>
          <button type="button" class="delete-hit-btn" title="Delete play" data-id="${hit.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      const deleteBtn = card.querySelector('.delete-hit-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteHit(hit.id);
        });
      }

      loggedHitsList.appendChild(card);
    });

    setupHitReordering();
  }

  function deleteHit(id) {
    hitLogData = hitLogData.filter((h) => h.id !== id);
    localStorage.setItem('baseball_hit_log', JSON.stringify(hitLogData));
    renderHitList();
    showInningToast('HIT LOG', 'Entry Removed');
    triggerHaptic(20);
  }

  if (clearHitsBtn) {
    clearHitsBtn.addEventListener('click', () => {
      if (hitLogData.length === 0) return;
      hitLogData = [];
      localStorage.setItem('baseball_hit_log', JSON.stringify(hitLogData));
      renderHitList();
      showInningToast('HIT LOG', 'All Entries Cleared');
      triggerHaptic([30, 30]);
    });
  }

  if (logHitSubmitBtn) {
    logHitSubmitBtn.addEventListener('click', () => {
      const rawPlayer = hitPlayerInput ? hitPlayerInput.value.trim() : '';
      const playerText = rawPlayer || 'Batter';
      const outcomeText = hitOutcomeSelect ? hitOutcomeSelect.value : 'Single';
      const isWalkOrK = outcomeText === 'Walk' || outcomeText === 'Strikeout';
      const locationText = isWalkOrK ? '' : (currentHitLocation.name || 'Second Base (2B)');
      const inningTag = `${isTopInning ? 'T' : 'B'}${currentInning}`;
      const sentenceText = formatHitSentence(playerText, outcomeText, locationText);

      const newHit = {
        id: Date.now(),
        player: playerText,
        outcome: outcomeText,
        location: locationText,
        inning: inningTag,
        sentence: sentenceText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      hitLogData.unshift(newHit);
      localStorage.setItem('baseball_hit_log', JSON.stringify(hitLogData));
      renderHitList();

      showInningToast('HIT LOG', sentenceText);
      triggerHaptic([30, 40]);

      if (hitPlayerInput) {
        hitPlayerInput.value = '';
      }
    });
  }

  // Render initial hits on load
  renderHitList();

  // Escape Key to close any active drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (shareBackdrop && shareBackdrop.classList.contains('open')) closeShareMenu();
      if (settingsBackdrop && settingsBackdrop.classList.contains('open')) closeSettings();
      if (advancedBackdrop && advancedBackdrop.classList.contains('open')) closeAdvancedTools();
    }
  });

  // Summary Format Cards
  summaryCards.forEach((card) => {
    card.addEventListener('click', () => {
      const format = card.getAttribute('data-format');
      if (!format) return;
      selectedShareFormat = format;

      summaryCards.forEach((c) => c.classList.toggle('active', c === card));
      updateSharePreview();
      triggerPop(document.getElementById('share-preview-box'));
      triggerHaptic(20);
    });
  });

  // Copy Preview Button
  function copyTextToClipboard(text, btnElement) {
    const doFeedback = () => {
      showInningToast('COPIED', 'Score copied to clipboard');
      triggerHaptic(30);
      if (btnElement) {
        const originalContent = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copied!</span>`;
        setTimeout(() => {
          btnElement.innerHTML = originalContent;
        }, 1500);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(doFeedback).catch(() => {
        fallbackCopy(text);
        doFeedback();
      });
    } else {
      fallbackCopy(text);
      doFeedback();
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (_) {}
    document.body.removeChild(textArea);
  }

  if (copyPreviewBtn) {
    copyPreviewBtn.addEventListener('click', () => {
      const text = sharePreviewText ? sharePreviewText.textContent : generateShareMessage(selectedShareFormat);
      copyTextToClipboard(text, copyPreviewBtn);
    });
  }

  // Share Channels
  if (shareNativeBtn) {
    shareNativeBtn.addEventListener('click', () => {
      const text = generateShareMessage(selectedShareFormat);
      triggerHaptic(20);
      if (navigator.share) {
        navigator.share({
          title: `${homeTeamName} vs ${awayTeamName}`,
          text: text
        }).catch(() => {});
      } else {
        copyTextToClipboard(text, shareNativeBtn);
      }
    });
  }

  if (shareSmsBtn) {
    shareSmsBtn.addEventListener('click', () => {
      triggerHaptic(20);
      const text = generateShareMessage(selectedShareFormat);
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const delimiter = isiOS ? '&' : '?';
      window.location.href = `sms:${delimiter}body=${encodeURIComponent(text)}`;
    });
  }

  if (shareEmailBtn) {
    shareEmailBtn.addEventListener('click', () => {
      triggerHaptic(20);
      const text = generateShareMessage(selectedShareFormat);
      const subject = `Baseball Score: ${homeTeamName} vs ${awayTeamName}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    });
  }

  if (shareCopyBtn) {
    shareCopyBtn.addEventListener('click', () => {
      const text = generateShareMessage(selectedShareFormat);
      copyTextToClipboard(text, shareCopyBtn);
    });
  }

  // Initial renders
  updateInningDisplay();
  updateOutsDisplay();
  updateTimerUI();
  updateSharePreview();
});
