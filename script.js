// script.js - Clean, Modern Mobile Baseball Scorekeeper

document.addEventListener('DOMContentLoaded', () => {
  // --- Prevent Pull-To-Refresh on Scrollable Drawers ---
  function preventPullToRefreshOnScrollable(el) {
    if (!el) return;
    let startY = 0;
    
    el.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].clientY;
      const diffY = currentY - startY;
      
      // If container is at the very top and user is swiping down (pulling down)
      if (el.scrollTop <= 0 && diffY > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }, { passive: false });
  }

  // Apply to all drawers and scrollable drawer bodies
  document.querySelectorAll('.settings-drawer').forEach(preventPullToRefreshOnScrollable);
  document.querySelectorAll('.drawer-body').forEach(preventPullToRefreshOnScrollable);
  document.querySelectorAll('.advanced-drawer-body').forEach(preventPullToRefreshOnScrollable);
  // --- Game State Variables ---
  let homeScoreVal = 0;
  let awayScoreVal = 0;
  let currentInning = 1;
  let isTopInning = true; // true = Top (Away bats), false = Bottom (Home bats)
  let currentOuts = 0;
  let secondsElapsed = 0;
  let isTimerRunning = false;
  let timerInterval = null;

  // High-precision clock math: tracks original start time and accumulated paused duration
  let clockStartedAt = null; // Timestamp (ms) when clock first started in this run
  let accumulatedPausedMs = 0; // Total duration (ms) spent in pause
  let lastPausedAt = null; // Timestamp (ms) when paused

  // Pitch Counter Variables
  let pitchCounterEnabled = false;
  let pitchCounterAdvanced = false;
  let simplePitches = 0;
  let ballsCount = 0;
  let strikesCount = 0;

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

  // Pitch Counter DOM Elements
  const pitchCounterSection = document.getElementById('pitch-counter-section');
  const pitchViewSimple = document.getElementById('pitch-view-simple');
  const pitchViewAdvanced = document.getElementById('pitch-view-advanced');

  // Pitch Simple View Elements
  const pitchSimpleBtn = document.getElementById('pitch-simple-btn');
  const pitchSimpleVal = document.getElementById('pitch-simple-val');
  const pitchTotalStatSimple = document.getElementById('pitch-total-stat-simple');

  // Pitch Advanced View Elements
  const pitchBallSide = document.getElementById('pitch-ball-side');
  const pitchBallsVal = document.getElementById('pitch-balls-val');
  const pitchStrikeSide = document.getElementById('pitch-strike-side');
  const pitchStrikesVal = document.getElementById('pitch-strikes-val');
  const pitchStrikePct = document.getElementById('pitch-strike-pct');
  const pitchTotalStatAdv = document.getElementById('pitch-total-stat-adv');
  const pitchBallPct = document.getElementById('pitch-ball-pct');

  // Pitch Counter Module Elements in Drawer
  const enablePitchCounterChk = document.getElementById('enable-pitch-counter-chk');
  const advancedPitchCounterChk = document.getElementById('advanced-pitch-counter-chk');
  const resetPitchesBtn = document.getElementById('reset-pitches-btn');
  const pitchCounterBadge = document.getElementById('pitch-counter-badge');

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

  // Reset Confirmation Modal Elements
  const resetConfirmBackdrop = document.getElementById('reset-confirm-backdrop');
  const resetConfirmCancelBtn = document.getElementById('reset-confirm-cancel-btn');
  const resetConfirmProceedBtn = document.getElementById('reset-confirm-proceed-btn');

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

  // --- Complete Game State LocalStorage Persistence ---
  function saveGameState() {
    const isHitLogOpen = document.getElementById('module-hit-log')?.classList.contains('open') || false;
    const isPitchCounterOpen = document.getElementById('module-pitch-counter')?.classList.contains('open') || false;
    const isBunsButtonOpen = document.getElementById('module-buns-button')?.classList.contains('open') || false;
    const gameState = {
      homeScore: homeScoreVal,
      awayScore: awayScoreVal,
      inning: currentInning,
      isTop: isTopInning,
      outs: currentOuts,
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      timer: {
        clockStartedAt,
        accumulatedPausedMs,
        isTimerRunning,
        lastPausedAt
      },
      pitchCounter: {
        enabled: pitchCounterEnabled,
        advanced: pitchCounterAdvanced,
        simplePitches,
        ballsCount,
        strikesCount
      },
      moduleHitLogOpen: isHitLogOpen,
      modulePitchCounterOpen: isPitchCounterOpen,
      moduleBunsButtonOpen: isBunsButtonOpen
    };
    try {
      localStorage.setItem('baseball_game_state', JSON.stringify(gameState));
      localStorage.setItem('baseball_home_team', homeTeamName);
      localStorage.setItem('baseball_away_team', awayTeamName);
    } catch (_) {}
  }

  function loadGameState() {
    try {
      const saved = localStorage.getItem('baseball_game_state');
      if (!saved) return;
      const state = JSON.parse(saved);

      if (typeof state.homeScore === 'number') homeScoreVal = Math.max(0, state.homeScore);
      if (typeof state.awayScore === 'number') awayScoreVal = Math.max(0, state.awayScore);
      if (typeof state.inning === 'number') currentInning = Math.max(1, state.inning);
      if (typeof state.isTop === 'boolean') isTopInning = state.isTop;
      if (typeof state.outs === 'number') currentOuts = Math.max(0, Math.min(2, state.outs));
      if (state.homeTeam) homeTeamName = state.homeTeam;
      if (state.awayTeam) awayTeamName = state.awayTeam;

      if (state.timer) {
        clockStartedAt = typeof state.timer.clockStartedAt === 'number' ? state.timer.clockStartedAt : null;
        accumulatedPausedMs = typeof state.timer.accumulatedPausedMs === 'number' ? state.timer.accumulatedPausedMs : 0;
        isTimerRunning = !!state.timer.isTimerRunning;
        lastPausedAt = typeof state.timer.lastPausedAt === 'number' ? state.timer.lastPausedAt : null;

        if (clockStartedAt !== null) {
          if (isTimerRunning) {
            const elapsedMs = (Date.now() - clockStartedAt) - accumulatedPausedMs;
            secondsElapsed = Math.max(0, Math.floor(elapsedMs / 1000));
          } else {
            const pauseRef = lastPausedAt || Date.now();
            const elapsedMs = (pauseRef - clockStartedAt) - accumulatedPausedMs;
            secondsElapsed = Math.max(0, Math.floor(elapsedMs / 1000));
          }
        } else {
          secondsElapsed = 0;
        }
      }

      // Restore pitch counter state
      if (state.pitchCounter) {
        pitchCounterEnabled = !!state.pitchCounter.enabled;
        pitchCounterAdvanced = !!state.pitchCounter.advanced;
        if (typeof state.pitchCounter.simplePitches === 'number') simplePitches = Math.max(0, state.pitchCounter.simplePitches);
        if (typeof state.pitchCounter.ballsCount === 'number') ballsCount = Math.max(0, state.pitchCounter.ballsCount);
        if (typeof state.pitchCounter.strikesCount === 'number') strikesCount = Math.max(0, state.pitchCounter.strikesCount);

        if (enablePitchCounterChk) enablePitchCounterChk.checked = pitchCounterEnabled;
        if (advancedPitchCounterChk) advancedPitchCounterChk.checked = pitchCounterAdvanced;
      }

      // Restore module hit log state (defaults to closed / collapsed on fresh game)
      const hitLogMod = document.getElementById('module-hit-log');
      const hitLogHeader = document.getElementById('module-hit-log-header');
      if (hitLogMod && hitLogHeader) {
        if (state.moduleHitLogOpen) {
          hitLogMod.classList.add('open');
          hitLogMod.classList.remove('collapsed');
          hitLogHeader.setAttribute('aria-expanded', 'true');
        } else {
          hitLogMod.classList.remove('open');
          hitLogMod.classList.add('collapsed');
          hitLogHeader.setAttribute('aria-expanded', 'false');
        }
      }

      // Restore module pitch counter state (defaults to closed / collapsed on fresh game)
      const pitchMod = document.getElementById('module-pitch-counter');
      const pitchHeader = document.getElementById('module-pitch-counter-header');
      if (pitchMod && pitchHeader) {
        if (state.modulePitchCounterOpen) {
          pitchMod.classList.add('open');
          pitchMod.classList.remove('collapsed');
          pitchHeader.setAttribute('aria-expanded', 'true');
        } else {
          pitchMod.classList.remove('open');
          pitchMod.classList.add('collapsed');
          pitchHeader.setAttribute('aria-expanded', 'false');
        }
      }

      // Restore module buns button state
      const bunsMod = document.getElementById('module-buns-button');
      const bunsHeader = document.getElementById('module-buns-button-header');
      if (bunsMod && bunsHeader) {
        if (state.moduleBunsButtonOpen) {
          bunsMod.classList.add('open');
          bunsMod.classList.remove('collapsed');
          bunsHeader.setAttribute('aria-expanded', 'true');
        } else {
          bunsMod.classList.remove('open');
          bunsMod.classList.add('collapsed');
          bunsHeader.setAttribute('aria-expanded', 'false');
        }
      }
    } catch (_) {}
  }

  // Load saved state immediately on startup
  loadGameState();

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
    saveGameState();
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
    saveGameState();
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
    saveGameState();
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
      saveGameState();
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
      saveGameState();
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
        saveGameState();
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
        saveGameState();
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
        saveGameState();
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
        saveGameState();
        triggerHaptic(20);
      }
    });
  }

  // --- Pitch Counter Controller (Simple & Advanced Mode) ---
  function updatePitchCounterUI() {
    if (!pitchCounterSection) return;

    if (!pitchCounterEnabled) {
      pitchCounterSection.style.display = 'none';
      if (pitchCounterBadge) pitchCounterBadge.textContent = 'Disabled';
      return;
    }

    pitchCounterSection.style.display = 'flex';

    if (pitchCounterAdvanced) {
      if (pitchViewSimple) pitchViewSimple.style.display = 'none';
      if (pitchViewAdvanced) pitchViewAdvanced.style.display = 'flex';

      const totalAdv = ballsCount + strikesCount;
      if (pitchBallsVal) pitchBallsVal.textContent = ballsCount;
      if (pitchStrikesVal) pitchStrikesVal.textContent = strikesCount;
      if (pitchTotalStatAdv) pitchTotalStatAdv.textContent = totalAdv;

      if (totalAdv === 0) {
        if (pitchStrikePct) pitchStrikePct.textContent = '0%';
        if (pitchBallPct) pitchBallPct.textContent = '0%';
      } else {
        const sPct = Math.round((strikesCount / totalAdv) * 100);
        const bPct = Math.round((ballsCount / totalAdv) * 100);
        if (pitchStrikePct) pitchStrikePct.textContent = `${sPct}%`;
        if (pitchBallPct) pitchBallPct.textContent = `${bPct}%`;
      }

      if (pitchCounterBadge) pitchCounterBadge.textContent = `${totalAdv} Pitches`;
    } else {
      if (pitchViewSimple) pitchViewSimple.style.display = 'flex';
      if (pitchViewAdvanced) pitchViewAdvanced.style.display = 'none';

      if (pitchSimpleVal) pitchSimpleVal.textContent = simplePitches;
      if (pitchTotalStatSimple) pitchTotalStatSimple.textContent = simplePitches;

      if (pitchCounterBadge) pitchCounterBadge.textContent = `${simplePitches} Pitches`;
    }
  }

  function changeSimplePitch(delta) {
    const prev = simplePitches;
    simplePitches = Math.max(0, simplePitches + delta);
    // Keep balls and strikes synchronized in the background
    if (delta > 0) {
      strikesCount += delta;
    } else if (strikesCount > 0) {
      strikesCount += delta;
    } else if (ballsCount > 0) {
      ballsCount += delta;
    }
    if (pitchSimpleVal) triggerPop(pitchSimpleVal);
    updatePitchCounterUI();
    saveGameState();
    if (simplePitches !== prev) {
      triggerHaptic(20);
      return true;
    }
    return false;
  }

  function changeBallsCount(delta) {
    const prev = ballsCount;
    ballsCount = Math.max(0, ballsCount + delta);
    simplePitches = ballsCount + strikesCount;
    if (pitchBallsVal) triggerPop(pitchBallsVal);
    if (pitchBallSide) triggerPop(pitchBallSide);
    updatePitchCounterUI();
    saveGameState();
    if (ballsCount !== prev) {
      triggerHaptic(20);
      return true;
    }
    return false;
  }

  function changeStrikesCount(delta) {
    const prev = strikesCount;
    strikesCount = Math.max(0, strikesCount + delta);
    simplePitches = ballsCount + strikesCount;
    if (pitchStrikesVal) triggerPop(pitchStrikesVal);
    if (pitchStrikeSide) triggerPop(pitchStrikeSide);
    updatePitchCounterUI();
    saveGameState();
    if (strikesCount !== prev) {
      triggerHaptic(20);
      return true;
    }
    return false;
  }

  // 1. Simple Pitch Button: Tap = +1, Hold = slow -1 decrement
  setupTapAndHold(pitchSimpleBtn, {
    onIncrease: () => changeSimplePitch(+1),
    onDecrease: () => changeSimplePitch(-1),
    onSwipeUp: () => changeSimplePitch(+1),
    onSwipeDown: () => changeSimplePitch(-1),
    itemName: 'Pitch',
    toastTag: 'PITCH'
  });

  // 2. Advanced Pitch Button - Balls Side: Tap = +1, Hold = slow -1 decrement
  setupTapAndHold(pitchBallSide, {
    onIncrease: () => changeBallsCount(+1),
    onDecrease: () => changeBallsCount(-1),
    onSwipeUp: () => changeBallsCount(+1),
    onSwipeDown: () => changeBallsCount(-1),
    itemName: 'Ball',
    toastTag: 'BALL'
  });

  // 3. Advanced Pitch Button - Strikes Side: Tap = +1, Hold = slow -1 decrement
  setupTapAndHold(pitchStrikeSide, {
    onIncrease: () => changeStrikesCount(+1),
    onDecrease: () => changeStrikesCount(-1),
    onSwipeUp: () => changeStrikesCount(+1),
    onSwipeDown: () => changeStrikesCount(-1),
    itemName: 'Strike',
    toastTag: 'STRIKE'
  });

  // Prevent mobile pull-to-refresh on pitch counter elements
  preventMobilePullToRefresh(pitchCounterSection);
  preventMobilePullToRefresh(pitchSimpleBtn);
  preventMobilePullToRefresh(pitchBallSide);
  preventMobilePullToRefresh(pitchStrikeSide);

  // Pitch Counter Drawer Checkboxes
  if (enablePitchCounterChk) {
    enablePitchCounterChk.addEventListener('change', () => {
      pitchCounterEnabled = enablePitchCounterChk.checked;
      updatePitchCounterUI();
      saveGameState();
      showInningToast('PITCH COUNTER', pitchCounterEnabled ? 'ENABLED' : 'DISABLED');
      triggerHaptic(20);
    });
  }

  if (advancedPitchCounterChk) {
    advancedPitchCounterChk.addEventListener('change', () => {
      pitchCounterAdvanced = advancedPitchCounterChk.checked;
      if (pitchCounterAdvanced && !pitchCounterEnabled) {
        pitchCounterEnabled = true;
        if (enablePitchCounterChk) enablePitchCounterChk.checked = true;
      }
      updatePitchCounterUI();
      saveGameState();
      showInningToast('PITCH COUNTER', pitchCounterAdvanced ? 'ADVANCED MODE' : 'SIMPLE MODE');
      triggerHaptic(20);
    });
  }

  if (resetPitchesBtn) {
    resetPitchesBtn.addEventListener('click', () => {
      simplePitches = 0;
      ballsCount = 0;
      strikesCount = 0;
      updatePitchCounterUI();
      saveGameState();
      showInningToast('PITCHES', 'RESET TO 0');
      triggerHaptic([30, 30]);
    });
  }

  // --- Stopwatch Game Clock with Start Time & Accumulated Pause Math ---
  function calculateCurrentElapsedSeconds() {
    if (clockStartedAt === null) return 0;
    if (isTimerRunning) {
      const elapsedMs = (Date.now() - clockStartedAt) - accumulatedPausedMs;
      return Math.max(0, Math.floor(elapsedMs / 1000));
    } else {
      const pauseRef = lastPausedAt || Date.now();
      const elapsedMs = (pauseRef - clockStartedAt) - accumulatedPausedMs;
      return Math.max(0, Math.floor(elapsedMs / 1000));
    }
  }

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
      if (isTimerRunning && clockStartedAt !== null) {
        secondsElapsed = calculateCurrentElapsedSeconds();
        if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
      }
    }, 500);
  }

  function updateTimerUI() {
    if (timerDisplay) {
      timerDisplay.classList.toggle('paused', !isTimerRunning);
    }
    if (timerIcon) {
      // When running: SHOW pause icon (clicking will pause)
      // When paused: SHOW play icon (clicking will resume/play)
      timerIcon.className = isTimerRunning ? 'ph-bold ph-pause' : 'ph-bold ph-play';
    }
    if (modalTimerIcon) {
      modalTimerIcon.className = isTimerRunning ? 'ph-bold ph-pause' : 'ph-bold ph-play';
    }
    if (modalTimerText) {
      modalTimerText.textContent = isTimerRunning ? 'Pause Clock' : 'Start Clock';
    }
  }

  function toggleTimer() {
    const now = Date.now();
    if (!isTimerRunning) {
      // Starting or resuming clock
      if (clockStartedAt === null) {
        clockStartedAt = now;
        accumulatedPausedMs = 0;
        lastPausedAt = null;
      } else if (lastPausedAt !== null) {
        accumulatedPausedMs += (now - lastPausedAt);
        lastPausedAt = null;
      }
      isTimerRunning = true;
      secondsElapsed = calculateCurrentElapsedSeconds();
      if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
      showInningToast('CLOCK', 'STARTED');
    } else {
      // Pausing clock
      isTimerRunning = false;
      lastPausedAt = now;
      secondsElapsed = calculateCurrentElapsedSeconds();
      if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
      showInningToast('CLOCK', 'PAUSED');
    }

    updateTimerUI();
    saveGameState();
    triggerHaptic(20);
  }

  function resetTimer() {
    clockStartedAt = null;
    accumulatedPausedMs = 0;
    lastPausedAt = null;
    isTimerRunning = false;
    secondsElapsed = 0;
    if (timerEl) {
      timerEl.textContent = formatTime(0);
      triggerPop(timerDisplay);
    }
    updateTimerUI();
    showInningToast('CLOCK', 'RESET (00:00:00)');
    updateSharePreview();
    saveGameState();
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
        setTimeout(() => ring.remove(), 2300);

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
    setTimeout(() => ring.remove(), 2300);

    document.body.appendChild(overlay);

    const anim = overlay.animate([
      { clipPath: 'circle(0% at 50% 50%)' },
      { clipPath: 'circle(150vmax at 50% 50%)' }
    ], {
      duration: 2200,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
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
      saveGameState();
    });
  }

  if (awayNameInput) {
    awayNameInput.addEventListener('input', () => {
      awayTeamName = awayNameInput.value.trim() || 'Away';
      if (awayLabelEl) awayLabelEl.textContent = awayTeamName;
      localStorage.setItem('baseball_away_team', awayTeamName);
      fitTeamNames();
      updateSharePreview();
      saveGameState();
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
      saveGameState();
      showInningToast('SCORES', 'RESET TO 0 - 0');
      triggerHaptic([30, 30]);
      closeSettings();
    });
  }

  // Reset Confirmation Modal Handlers
  function openResetConfirmModal() {
    if (!resetConfirmBackdrop) return;
    resetConfirmBackdrop.classList.add('open');
    resetConfirmBackdrop.setAttribute('aria-hidden', 'false');
    triggerHaptic(20);
  }

  function closeResetConfirmModal() {
    if (!resetConfirmBackdrop) return;
    resetConfirmBackdrop.classList.remove('open');
    resetConfirmBackdrop.setAttribute('aria-hidden', 'true');
  }

  // Start New Game (Opens Confirmation Modal)
  if (resetGameBtn) {
    resetGameBtn.addEventListener('click', () => {
      openResetConfirmModal();
    });
  }

  if (resetConfirmCancelBtn) {
    resetConfirmCancelBtn.addEventListener('click', closeResetConfirmModal);
  }

  if (resetConfirmBackdrop) {
    resetConfirmBackdrop.addEventListener('click', (e) => {
      if (e.target === resetConfirmBackdrop) closeResetConfirmModal();
    });
  }

  if (resetConfirmProceedBtn) {
    resetConfirmProceedBtn.addEventListener('click', () => {
      // Clear game data from LocalStorage
      localStorage.removeItem('baseball_game_state');
      localStorage.removeItem('baseball_hit_log');
      localStorage.removeItem('baseball_home_team');
      localStorage.removeItem('baseball_away_team');

      homeScoreVal = 0;
      awayScoreVal = 0;
      currentInning = 1;
      isTopInning = true;
      currentOuts = 0;
      homeTeamName = 'Home';
      awayTeamName = 'Away';

      // Clock reset
      clockStartedAt = null;
      accumulatedPausedMs = 0;
      lastPausedAt = null;
      isTimerRunning = false;
      secondsElapsed = 0;

      hitLogData = [];

      // Pitch counter reset
      simplePitches = 0;
      ballsCount = 0;
      strikesCount = 0;
      updatePitchCounterUI();

      // Reset modules to collapsed on fresh game
      const allModules = document.querySelectorAll('.canvas-module');
      allModules.forEach((mod) => {
        mod.classList.remove('open');
        mod.classList.add('collapsed');
        const header = mod.querySelector('.module-header');
        if (header) header.setAttribute('aria-expanded', 'false');
      });

      if (homeScoreEl) homeScoreEl.textContent = '0';
      if (awayScoreEl) awayScoreEl.textContent = '0';
      if (timerEl) timerEl.textContent = formatTime(0);

      if (homeNameInput) homeNameInput.value = homeTeamName;
      if (awayNameInput) awayNameInput.value = awayTeamName;
      if (homeLabelEl) homeLabelEl.textContent = homeTeamName;
      if (awayLabelEl) awayLabelEl.textContent = awayTeamName;
      fitTeamNames();

      clearTimeout(sideChangeTimeout);
      updateInningDisplay();
      updateOutsDisplay();
      updateTimerUI();
      renderHitList();
      saveGameState();

      showInningToast('GAME', 'NEW GAME STARTED');
      triggerHaptic([40, 50, 40]);
      closeResetConfirmModal();
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
    const pitching = isTopInning ? homeTeamName : awayTeamName;
    const isLateInnings = currentInning >= 7;
    const isNinthOrLater = currentInning >= 9;
    const lastHit = hitLogData && hitLogData.length > 0 ? hitLogData[0] : null;

    // SITUATION 1: WALK-OFF / POTENTIAL WALK-OFF DRAMA (Bottom 9th or Extras)
    if (!isTopInning && isNinthOrLater) {
      if (homeScoreVal > awayScoreVal) {
        const walkoffWinStems = [
          `"BALLGAME! TOUCH 'EM ALL! ${homeTeamName} pulls off the walk-off thriller in the bottom of the ${ordInning}, conquering ${awayTeamName} ${homeScoreVal} to ${awayScoreVal}! Pandemonium on the field!"`,
          `"SANTA MARIA! It is OVER! ${homeTeamName} walks it off in dramatic fashion right here in the ${ordInning}! Final score: ${homeTeamName} ${homeScoreVal}, ${awayTeamName} ${awayScoreVal}! What a ballgame!"`,
          `"Put a big curly 'W' in the books! The dugout empties as ${homeTeamName} clinches the walk-off victory, taking down ${awayTeamName} ${homeScoreVal}-${awayScoreVal}!"`
        ];
        return walkoffWinStems[Math.floor(Math.random() * walkoffWinStems.length)];
      } else if (diff === 0) {
        const walkoffThreatStems = [
          `"Hold onto your caps, folks! Bottom of the ${ordInning}, tied ${homeScoreVal}-${awayScoreVal} with ${outsStr}. ${homeTeamName} is literally ninety feet away from sending everyone home happy with one swing!"`,
          `"Cardiac baseball in the bottom of the ${ordInning}! Deadlocked at ${homeScoreVal} apiece. Every fan in the stadium is on their feet as ${homeTeamName} looks to walk this baby off!"`,
          `"It doesn't get any tighter than this! Tied ${homeScoreVal}-${awayScoreVal} in the bottom of the ${ordInning}. One mistake pitch from ${awayTeamName} and this game is officially over!"`
        ];
        return walkoffThreatStems[Math.floor(Math.random() * walkoffThreatStems.length)];
      } else if (awayScoreVal > homeScoreVal && diff <= 2) {
        const ninthInningRallyStems = [
          `"Down to the absolute wire! ${awayTeamName} clinging to a ${leadScore}-${trailScore} lead in the bottom of the ${ordInning}, but ${homeTeamName} is digging in with ${outsStr}. Do not turn that dial!"`,
          `"Last call for the home squad! Bottom of the ${ordInning}, ${awayTeamName} up ${leadScore}-${trailScore}. ${outsStr} on the board. ${homeTeamName} needs late-inning magic right now!"`
        ];
        return ninthInningRallyStems[Math.floor(Math.random() * ninthInningRallyStems.length)];
      }
    }

    // SITUATION 2: EXTRA INNINGS (10th inning or beyond, Top or Bottom)
    if (currentInning >= 10) {
      const extraInningStems = [
        `"Bonus baseball under the lights! We are deep into extra innings in the ${half} of the ${ordInning}, locked at ${homeScoreVal}-${awayScoreVal} with ${outsStr}. Pure endurance and grit on display!"`,
        `"Free baseball for everyone! Into the ${ordInning} inning we go! ${homeTeamName} ${homeScoreVal}, ${awayTeamName} ${awayScoreVal}. The bullpens are burning through arms as both clubs fight tooth and nail!"`,
        `"You couldn't script a more stubborn contest! Extra frames in the ${half} of the ${ordInning}. ${batting} batting with ${outsStr}. Who will be the hero today?"`
      ];
      return extraInningStems[Math.floor(Math.random() * extraInningStems.length)];
    }

    // SITUATION 3: TWO-OUT DRAMA (High Leverage Moment)
    if (currentOuts === 2) {
      const twoOutStems = [
        `"Two down in the ${half} of the ${ordInning}! ${pitching} is just one single out away from wiggling out of trouble, but ${batting} refuses to go quietly here with the score ${leadScore}-${trailScore}!"`,
        `"Two outs, nowhere to hide! The stadium is buzzing as ${batting} looks for a clutch two-out rally against ${pitching} in the ${half} of the ${ordInning}."`,
        `"Backs against the wall with two outs in the ${half} of the ${ordInning}! ${leader ? `${leader} leads ${leadScore}-${trailScore}` : `Tied up at ${homeScoreVal}`}. Can ${batting} spark two-out lightning?"`
      ];
      // 50% chance to highlight 2-out drama if in a close game
      if (diff <= 2 && Math.random() > 0.4) {
        return twoOutStems[Math.floor(Math.random() * twoOutStems.length)];
      }
    }

    // SITUATION 4: TIED BALLGAME (diff === 0)
    if (diff === 0) {
      if (homeScoreVal === 0) {
        const scorelessStems = [
          `"Welcome in baseball fans! We've got a classic pitchers' duel underway. Not a single run on the board as ${homeTeamName} and ${awayTeamName} are locked at 0-0 in the ${half} of the ${ordInning} with ${outsStr}."`,
          `"Zeroes across the scoreboard folks! Both starting arms are dealing pure fire. It's ${homeTeamName} 0, ${awayTeamName} 0 in the ${half} of the ${ordInning} with ${outsStr}. Who is gonna blink first?"`,
          `"Defensive clinic out there today! Scoreless at 0-0 between ${homeTeamName} and ${awayTeamName} in the ${half} of the ${ordInning}. Web gems, pinpoint fastballs, and zero room for error!"`,
          `"Still searching for that breakthrough swing! ${homeTeamName} 0, ${awayTeamName} 0 here in the ${half} of the ${ordInning}. Both hurlers have completely locked in!"`
        ];
        return scorelessStems[Math.floor(Math.random() * scorelessStems.length)];
      } else {
        const tiedStems = [
          `"Folks, we've got a dead heat! All knotted up at ${homeScoreVal} apiece as ${batting} steps in here in the ${half} of the ${ordInning} with ${outsStr}. Anyone's ballgame right now!"`,
          `"Back to square one! ${homeTeamName} and ${awayTeamName} are deadlocked at ${homeScoreVal} runs each in the ${half} of the ${ordInning}. The next big swing could decide this clash!"`,
          `"You couldn't slip a sheet of paper between these two clubs today! Tied at ${homeScoreVal} to ${awayScoreVal} with ${outsStr} in the ${half} of the ${ordInning}!"`,
          `"A seesaw war of attrition! Even-steven at ${homeScoreVal}-${awayScoreVal} in the ${half} of the ${ordInning}. Every single pitch has postseason intensity right now!"`,
          `"Don't change that channel! We are all squared away at ${homeScoreVal} runs apiece in the ${half} of the ${ordInning}. Momentum hanging by a thread with ${outsStr} on the board!"`
        ];
        return tiedStems[Math.floor(Math.random() * tiedStems.length)];
      }
    }

    // SITUATION 5: CRUSHING / RUNAWAY BLOWOUT (diff >= 5)
    if (diff >= 5) {
      const blowoutStems = [
        `"And what an absolute shellacking we are witnessing! ${leader} is completely crushing ${trailer}, pouring it on for a commanding ${leadScore} to ${trailScore} lead in the ${half} of the ${ordInning}!"`,
        `"Hold onto your caps, folks, because ${leader} is running away with this one! An explosive offensive clinic has them blowing out ${trailer} ${leadScore}-${trailScore} in the ${half} of the ${ordInning} with ${outsStr}."`,
        `"Total and utter dominance from ${leader}! They are pulverizing the baseball today, leading ${leadScore} to ${trailScore} over a shell-shocked ${trailer} dugout in the ${half} of the ${ordInning}."`,
        `"This one has turned into a runaway train! ${leader} is crushing ${trailer} by ${diff} runs, sitting pretty at ${leadScore}-${trailScore} in the ${half} of the ${ordInning}!"`,
        `"Offensive fireworks on full display! ${leader} has broken this one wide open, piling on runs to lead ${leadScore} to ${trailScore} as ${trailer} struggles to stem the bleeding in the ${half} of the ${ordInning}."`,
        `"A lopsided affair here at the yard! ${leader} cruising comfortably ahead ${leadScore}-${trailScore} over ${trailer} in the ${half} of the ${ordInning}. Complete command from start to finish!"`
      ];
      return blowoutStems[Math.floor(Math.random() * blowoutStems.length)];
    }

    // SITUATION 6: LATE-INNING NAIL-BITER (diff === 1 && currentInning >= 7)
    if (diff === 1 && isLateInnings) {
      const lateNailBiterStems = [
        `"Late-inning nail-biter alert! ${leader} is hanging onto a razor-thin 1-run lead, ${leadScore}-${trailScore} over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}. Pure cardiac baseball!"`,
        `"The tension in this ballpark is palpable! ${leader} leads by just a lone run, ${leadScore}-${trailScore}, heading deep into the ${ordInning} with ${outsStr}. One swing ties it, one swing changes everything!"`,
        `"Edge of your seats, everybody! ${leader} protecting that precious 1-run cushion, up ${leadScore} to ${trailScore} over ${trailer} in the ${half} of the ${ordInning}. The closer is warming, but ${batting} has other plans!"`,
        `"High drama in the late frames! ${leader} clinging to a 1-run advantage, ${leadScore}-${trailScore} in the ${half} of the ${ordInning}. Every pitch feels like a full count!"`
      ];
      return lateNailBiterStems[Math.floor(Math.random() * lateNailBiterStems.length)];
    }

    // SITUATION 7: 1-RUN GAME (EARLY OR MID INNINGS)
    if (diff === 1) {
      const scrapingStems = [
        `"Talk about edge-of-your-seat drama! ${leader} is barely scraping by with a razor-thin ${leadScore}-${trailScore} edge over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}."`,
        `"Every single pitch is magnified right now! ${leader} is clinging for dear life to a fragile 1-run lead, up ${leadScore} to ${trailScore} as ${trailer} lurks just one swing away in the ${half} of the ${ordInning}!"`,
        `"A pure white-knuckle thriller, baseball fans! ${leader} is barely scraping by with a slim ${leadScore}-${trailScore} cushion. Tension is so thick in the ballpark you could cut it with a knife!"`,
        `"Down to the wire! ${leader} holds the slimmest margin in sports—protecting a tight 1-run lead, ${leadScore}-${trailScore} over ${trailer} with ${outsStr} in the ${half} of the ${ordInning}!"`,
        `"One single tally separates these two heavyweight rivals! ${leader} leads ${leadScore} to ${trailScore} in the ${half} of the ${ordInning} with ${outsStr}."`
      ];
      return scrapingStems[Math.floor(Math.random() * scrapingStems.length)];
    }

    // SITUATION 8: SOLID 2-3 RUN LEAD
    if (diff <= 3) {
      const solidStems = [
        `"${leader} holding steady control right now! They carry a solid ${leadScore}-${trailScore} lead over ${trailer} as play continues in the ${half} of the ${ordInning} with ${outsStr}."`,
        `"${leader} keeping ${trailer} at arm's length! It's a ${leadScore}-${trailScore} ballgame in the ${half} of the ${ordInning}. ${trailer} needs to string some hits together soon!"`,
        `"Good situational baseball on display! ${leader} is in front ${leadScore} to ${trailScore} over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}."`,
        `"${leader} doing the little things right today—timely hitting and sharp glovework give them a ${leadScore}-${trailScore} advantage in the ${half} of the ${ordInning}."`,
        `"A competitive, hard-fought contest! ${leader} up by ${diff} runs, ${leadScore}-${trailScore} over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}."`
      ];
      return solidStems[Math.floor(Math.random() * solidStems.length)];
    }

    // SITUATION 9: 4-RUN COMFORTABLE LEAD
    const comfortableStems = [
      `"${leader} firmly in the driver's seat! They hold a 4-run cushion, leading ${leadScore} to ${trailScore} over ${trailer} in the ${half} of the ${ordInning} with ${outsStr}."`,
      `"A disciplined offensive showing has ${leader} leading ${leadScore}-${trailScore} against ${trailer} in the ${half} of the ${ordInning}. ${trailer} has their work cut out for them!"`,
      `"${leader} setting the pace with authority today! Ahead ${leadScore} to ${trailScore} over ${trailer} in the ${half} of the ${ordInning}."`
    ];
    return comfortableStems[Math.floor(Math.random() * comfortableStems.length)];
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
    if (sharePreviewText) {
      sharePreviewText.style.display = 'block';
      sharePreviewText.textContent = generateShareMessage(selectedShareFormat);
    }
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
            requestAnimationFrame(() => updateStadiumScale());
            setTimeout(updateStadiumScale, 60);
            setTimeout(updateStadiumScale, 280);
          }
        }
        saveGameState();
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

  let currentHitLocation = { x: 490, y: 237, name: 'Second Base' };
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
  // Uncomplicated clean locations: Home Plate, Pitcher's Mound, 1B, 2B, 3B, SS, LF, CF, RF, Foul Territory
  // Rejects out-of-park or out-of-field clicks
  function calculateHitZone(x, y) {
    const homeX = 490;
    const homeY = 680;
    const dx = x - homeX;
    const dy = homeY - y; // positive towards outfield
    const dist = Math.hypot(dx, dy);
    const angleDeg = Math.atan2(dx, dy) * (180 / Math.PI); // 0 = straight towards CF

    // 1. Outside the field: past outfield fence top curve (dist > 620) or behind home plate bounds (dy < -25)
    // Clicks outside do NOT register; prompt the user to tap inside the field.
    if (dist > 700 || dy < -50) {
      return null;
    }

    // 2. Foul Territory: outside the foul lines (-45° to +45° is fair territory)
    if (angleDeg < -45.0 || angleDeg > 45.0 || dy < -10) {
      return 'Foul Territory';
    }

    // 3. Fair Territory:
    // Infield dirt boundary: apex at ~475px distance from home, tapering to ~350px near foul lines
    const normAngle = Math.min(1, Math.abs(angleDeg) / 45);
    const dirtRadius = 515 - (110 * Math.pow(normAngle, 1.3));

    // A. INFIELD (dist <= dirtRadius)
    if (dist <= dirtRadius) {
      if (dist < 80) return 'Catcher';

      // Pitcher's Mound (centered at 490, 460)
      if (Math.hypot(x - 490, y - 460) <= 55 || (dist < 250 && Math.abs(angleDeg) <= 15)) {
        return "Pitcher";
      }

      // Proximity to bases
      if (Math.hypot(x - 712, y - 456) <= 60 || (angleDeg > 20 && dist <= 360)) {
        return 'First Base';
      }
      if (Math.hypot(x - 268, y - 456) <= 60 || (angleDeg < -20 && dist <= 360)) {
        return 'Third Base';
      }
      if (Math.hypot(x - 490, y - 237) <= 60 || (angleDeg >= 0 && dist > 340)) {
        return 'Second Base';
      }
      if (Math.hypot(x - 375, y - 350) <= 60 || (angleDeg < 0 && dist > 320)) {
        return 'Shortstop';
      }

      // Position by angle
      if (angleDeg < -20) return 'Third Base';
      if (angleDeg > 20) return 'First Base';
      if (angleDeg < 0) return 'Shortstop';
      return 'Second Base';
    }

    // B. OUTFIELD (dist > dirtRadius && dist <= 620)
    // Clean classic outfield positions without sub-zones
    if (angleDeg < -15) {
      return 'Left Field';
    } else if (angleDeg > 15) {
      return 'Right Field';
    } else {
      return 'Center Field';
    }
  }

  function placeHitPin(x, y, forcedName = null) {
    const clampedX = Math.max(60, Math.min(930, Math.round(x)));
    const clampedY = Math.max(20, Math.min(730, Math.round(y)));
    const zoneName = forcedName || calculateHitZone(clampedX, clampedY);

    if (!zoneName) return false;

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
    return true;
  }

  // Initial Pin default to 2B
  placeHitPin(490, 237, 'Second Base');

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

      const zone = calculateHitZone(x, y);
      if (!zone) {
        showInningToast('FIELD', 'Please tap inside the field');
        triggerHaptic([30, 30]);
        return;
      }

      placeHitPin(x, y, zone);
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

  // Build clean natural display sentence for hit log
  function formatHitSentence(player, outcome, location) {
    const name = player && player.trim() ? player.trim() : 'Batter';
    const loc = location ? location.replace(/\s*\([^)]*\)/g, '').trim() : '';

    if (outcome === 'Strikeout') {
      return `${name} struck out.`;
    }
    if (outcome === 'Walk') {
      return `${name} walked.`;
    }
    if (outcome === 'Reached on Error' || outcome === 'Error - 1st' || outcome === 'Error - 2nd' || outcome === 'Error - 3rd') {
      return `${name} reached on an error at ${loc || 'the field'}.`;
    }
    if (outcome === 'Pop-out') {
      return `${name} popped out to ${loc || 'the field'}.`;
    }
    if (outcome === 'Line-out') {
      return `${name} lined out to ${loc || 'the field'}.`;
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
      return `${name} hit a foul ball to ${loc || 'Foul Territory'}.`;
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
      loggedHitsList.innerHTML = `<div class="hit-empty-hint">No plays logged yet.</div>`;
      return;
    }

    loggedHitsList.innerHTML = '';
    hitLogData.forEach((hit) => {
      const card = document.createElement('div');
      card.className = 'logged-hit-card';

      const sentenceText = hit.sentence || formatHitSentence(hit.player, hit.outcome, hit.location);
      const inningDisplay = hit.inning || 'T1';

      card.innerHTML = `
        <span class="reorder-handle" title="Hold and drag to reorder"><i class="ph-bold ph-dots-six-vertical"></i></span>
        <div class="hit-card-content">
          <span class="hit-play-sentence">${escapeHtml(sentenceText)}</span>
        </div>
        <div class="hit-card-right">
          <span class="hit-inning-badge">${escapeHtml(inningDisplay)}</span>
          <button type="button" class="delete-hit-btn" title="Delete play" data-id="${hit.id}">
            <i class="ph-bold ph-trash"></i>
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
    saveGameState();
    showInningToast('HIT LOG', 'Entry Removed');
    triggerHaptic(20);
  }

  if (clearHitsBtn) {
    clearHitsBtn.addEventListener('click', () => {
      if (hitLogData.length === 0) return;
      hitLogData = [];
      localStorage.setItem('baseball_hit_log', JSON.stringify(hitLogData));
      renderHitList();
      saveGameState();
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
      const locationText = isWalkOrK ? '' : (currentHitLocation.name || 'Second Base');
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
      saveGameState();

      showInningToast('HIT LOG', sentenceText);
      triggerHaptic([30, 40]);

      if (hitPlayerInput) {
        hitPlayerInput.value = '';
      }
    });
  }

  // Render initial hits on load
  renderHitList();

  // Escape Key to close any active drawer or modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (resetConfirmBackdrop && resetConfirmBackdrop.classList.contains('open')) closeResetConfirmModal();
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
        btnElement.innerHTML = `<i class="ph-bold ph-check"></i> <span>Copied!</span>`;
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

  // =========================================================================
  // THE BUNS BUTTON: Easter Egg Nuclear Bun Drop Generator
  // =========================================================================
  const bunsNukeBtn = document.getElementById('buns-nuke-btn');
  const bunsStatusMsg = document.getElementById('buns-status-msg');
  let bunRainInterval = null;

  function startBunRain() {
    if (bunRainInterval) return; // Prevent multiple intervals
    bunRainInterval = setInterval(() => {
      const bun = document.createElement('div');
      bun.className = 'bun-drop';
      bun.style.backgroundImage = "url('https://codehs.com/uploads/79411300e7ae3cb0766885493066194d')";

      // Randomize horizontal start, fall speed and scale
      const startX = Math.random() * (window.innerWidth - 60);
      const duration = Math.random() * 2 + 2; // 2 - 4 seconds
      const size = Math.random() * 40 + 40; // 40 - 80px

      bun.style.left = `${startX}px`;
      bun.style.width = `${size}px`;
      bun.style.height = `${size}px`;
      bun.style.animationDuration = `${duration}s`;

      document.body.appendChild(bun);

      // Cleanup element after animation ends
      setTimeout(() => {
        if (bun.parentNode) bun.remove();
      }, duration * 1000);
    }, 150); // Drop a bun every 150ms
  }

  function stopBunRain() {
    if (bunRainInterval) {
      clearInterval(bunRainInterval);
      bunRainInterval = null;
    }
  }

  function playBuns() {
    const trumpet = document.getElementById('audio-trumpet');
    const randomAudios = [
      document.getElementById('audio-rand-1'),
      document.getElementById('audio-rand-3'),
      document.getElementById('audio-rand-4'),
      document.getElementById('audio-rand-5'),
      document.getElementById('audio-rand-6'),
      document.getElementById('audio-rand-7'),
      document.getElementById('audio-rand-8'),
      document.getElementById('audio-rand-9'),
      document.getElementById('audio-rand-10')
    ];

    if (bunsNukeBtn) {
      bunsNukeBtn.classList.add('pressed');
      setTimeout(() => bunsNukeBtn.classList.remove('pressed'), 400);
    }

    triggerHaptic([60, 60, 80, 80, 100]);

    // Start raining buns immediately
    startBunRain();

    if (!trumpet) {
      setTimeout(stopBunRain, 4000);
      return;
    }

    try {
      trumpet.currentTime = 0;
      const playPromise = trumpet.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.log("Trumpet failed", e);
          setTimeout(stopBunRain, 4000);
        });
      }
    } catch (e) {
      console.log("Trumpet playback error", e);
      setTimeout(stopBunRain, 4000);
    }

    trumpet.onended = () => {
      const valid = randomAudios.filter((a) => a && a.src && a.src.trim() !== "");
      if (valid.length > 0) {
        const selected = valid[Math.floor(Math.random() * valid.length)];
        try {
          selected.currentTime = 0;
          const randomPlayPromise = selected.play();
          if (randomPlayPromise !== undefined) {
            randomPlayPromise.catch((e) => {
              console.log("Dialogue failed", e);
              stopBunRain();
              if (bunsStatusMsg) {
              }
            });
          }
        } catch (_) {
          stopBunRain();
        }

        // Stop raining only after the dialogue audio ends
        selected.onended = () => {
          stopBunRain();
          if (bunsStatusMsg) {
          }
        };
      } else {
        // If no dialogue audio found, stop after trumpet ends
        stopBunRain();
        if (bunsStatusMsg) {
        }
      }
    };
  }

  if (bunsNukeBtn) {
    bunsNukeBtn.addEventListener('click', () => {
      playBuns();
    });
  }

  // Initial renders
  if (homeScoreEl) homeScoreEl.textContent = homeScoreVal;
  if (awayScoreEl) awayScoreEl.textContent = awayScoreVal;
  if (homeNameInput) homeNameInput.value = homeTeamName;
  if (awayNameInput) awayNameInput.value = awayTeamName;
  if (homeLabelEl) homeLabelEl.textContent = homeTeamName;
  if (awayLabelEl) awayLabelEl.textContent = awayTeamName;
  if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
  updateInningDisplay();
  updateOutsDisplay();
  updateTimerUI();
  updatePitchCounterUI();
  updateSharePreview();
  fitTeamNames();
});
