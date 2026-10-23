const trackingForm = document.querySelector("#tracking-form");
const trackingInput = document.querySelector("#tracking-number");
const trackingMessage = document.querySelector("#tracking-message");
const trackingCard = document.querySelector("#tracking-card");
const trackingCode = document.querySelector("#tracking-code");
const currentStatus = document.querySelector("#current-status");
const progressBar = document.querySelector("#progress-bar");
const progressTrack = progressBar.parentElement;
const routeLine = document.querySelector(".route-line");
const timeline = document.querySelector("#timeline");

const STORAGE_KEY = "kgg-santa-letter-tracking-v1";
const MIN_INTERVAL_HOURS = 12;
const MAX_INTERVAL_HOURS = 16;

const journeyStops = [
  { title: "Letter posted", description: "Left KGG, Kitakyushu", status: "At KGG, Kitakyushu" },
  { title: "On its way north", description: "Travelling through the Christmas post", status: "In transit to the North Pole" },
  { title: "Crossing the Arctic", description: "Getting closer to Santa’s workshop", status: "Near the North Pole" },
  { title: "At the North Pole!", description: "Being sorted by Santa’s elves", status: "At the North Pole sorting office" },
  { title: "Delivered to Santa", description: "Your letter is ready for Santa to read", status: "Delivered to Santa" },
];

function randomIntervalMs() {
  const hours = MIN_INTERVAL_HOURS + Math.random() * (MAX_INTERVAL_HOURS - MIN_INTERVAL_HOURS);
  return Math.round(hours * 60 * 60 * 1000);
}

function readTrackingRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("Could not read saved tracking records:", error);
    return {};
  }
}

function writeTrackingRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.warn("Could not save tracking records:", error);
    trackingMessage.textContent = "Your browser could not save this tracking record. Please check your browser storage settings.";
    return false;
  }
}

function createTrackingRecord(trackingNumber, now = Date.now()) {
  return {
    trackingNumber,
    stage: 0,
    createdAt: now,
    lastAdvancedAt: now,
    nextIntervalMs: randomIntervalMs(),
    stageTimestamps: [now],
  };
}

function getTrackingRecord(number) {
  const trackingNumber = number.trim().toUpperCase();
  const records = readTrackingRecords();
  let record = records[trackingNumber];

  if (!record || !Number.isInteger(record.stage) || !Number.isFinite(record.lastAdvancedAt)) {
    record = createTrackingRecord(trackingNumber);
    records[trackingNumber] = record;
    writeTrackingRecords(records);
    return record;
  }

  // Catch up based on elapsed time, even if nobody opened the page for a while.
  // Each completed leg gets its own newly randomized 12–16 hour interval.
  const now = Date.now();
  let changed = false;
  while (record.stage < journeyStops.length - 1 && now - record.lastAdvancedAt >= record.nextIntervalMs) {
    record.lastAdvancedAt += record.nextIntervalMs;
    record.stage += 1;
    record.stageTimestamps = Array.isArray(record.stageTimestamps) ? record.stageTimestamps : [];
    record.stageTimestamps[record.stage] = record.lastAdvancedAt;
    record.nextIntervalMs = randomIntervalMs();
    changed = true;
  }

  if (changed) {
    records[trackingNumber] = record;
    writeTrackingRecords(records);
  }
  return record;
}

function formatDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function renderTimeline(record) {
  timeline.innerHTML = journeyStops.map((stop, index) => {
    const state = index < record.stage ? "is-complete" : index === record.stage ? "is-current" : "";
    const icon = index < record.stage ? "✓" : index === record.stage ? "✦" : String(index + 1);
    let time = "Next stop";

    if (index <= record.stage) {
      time = formatDate(record.stageTimestamps?.[index] ?? (index === 0 ? record.createdAt : undefined));
    } else if (index === record.stage + 1 && record.stage < journeyStops.length - 1) {
      time = `Est. ${formatDate(record.lastAdvancedAt + record.nextIntervalMs)}`;
    }

    return `
      <div class="timeline-item ${state}">
        <span class="timeline-icon">${icon}</span>
        <div><strong>${stop.title}</strong><small>${stop.description}</small></div>
        <time>${time}</time>
      </div>`;
  }).join("");
}

function showDemoTracking(number) {
  trackingMessage.textContent = "";
  trackingCard.hidden = false;
  const trackingNumber = number.trim().toUpperCase();
  trackingCode.textContent = trackingNumber;

  const record = getTrackingRecord(trackingNumber);
  const currentStop = Math.min(record.stage, journeyStops.length - 1);
  const progress = [15, 35, 55, 75, 100][currentStop];

  currentStatus.textContent = journeyStops[currentStop].status;
  progressBar.style.width = `${progress}%`;
  progressTrack.setAttribute("aria-valuenow", String(progress));
  routeLine.style.setProperty("--journey-progress", `${progress}%`);
  renderTimeline(record);
}

trackingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const enteredNumber = trackingInput.value.trim();

  if (!enteredNumber) {
    trackingCard.hidden = true;
    trackingMessage.textContent = "Please enter the tracking number from your KGG letter card.";
    trackingInput.focus();
    return;
  }

  showDemoTracking(enteredNumber);
});
