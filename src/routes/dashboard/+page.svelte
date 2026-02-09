<script lang="ts">
  // ================================
  // Kategorien
  // ================================
  let categories = ["Arbeit", "Meeting", "Lernen", "Organisation", "Sport", "Privat"];
  let selectedCategory = "Arbeit";

  // ================================
  // Eingabefelder
  // ================================
  let description = "";   // Aufgabenbeschreibung
  let startTime = "";     // Startzeit
  let endTime = "";       // Endzeit
  let outcome = "gut";    // Erfolgsauswahl
  let difficulties = "";  // Optional – aktuell nicht sichtbar
  let date = new Date().toISOString().split("T")[0];

  // ================================
  // Speech-to-Text Setup
  // ================================
  let recognition: any;
  let isListening = false;

  if (typeof window !== "undefined") {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();

      recognition.lang = "de-DE";      // Sprache Deutsch
      recognition.continuous = false;  // Beendet sich nach einem Satz
      recognition.interimResults = false;

      // Wenn Sprache erkannt wird
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        description += " " + transcript; // Text anhängen
      };

      // Wenn Aufnahme endet
      recognition.onend = () => {
        isListening = false;
      };
    }
  }

  // Aufnahme starten
  function startListening() {
    if (recognition) {
      recognition.start();
      isListening = true;
    } else {
      alert("Speech Recognition wird von deinem Browser nicht unterstützt.");
    }
  }

  // ================================
  // Dauer berechnen
  // ================================
  function calculateDuration(start: string, end: string) {
    if (!start || !end) return "";

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return "";

    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }

  // ================================
  // Speichern (aktuell nur Reset).
  // ================================
  function addTask() {
    const duration = calculateDuration(startTime, endTime);
    console.log({
      date,
      selectedCategory,
      description,
      startTime,
      endTime,
      duration,
      outcome
    });

    // Formular zurücksetzen
    description = "";
    startTime = "";
    endTime = "";
    outcome = "gut";
  }
</script>

<style>
  .wrapper {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: Arial, sans-serif;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #4f46e5;
  }

  .card {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    font-weight: 600;
    margin-top: 0.5rem;
  }

  input, select, button {
    padding: 0.7rem;
    border-radius: 10px;
    border: 1px solid #ccc;
    font-size: 0.95rem;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #6366f1;
  }

  button {
    background: #6366f1;
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
  }

  button:hover {
    background: #4f46e5;
  }

  .speech-btn {
    background: #10b981;
  }

  .speech-btn:hover {
    background: #059669;
  }
</style>

<div class="wrapper">
  <h1>📘 Arbeitsjournal</h1>

  <div class="card">

    <!-- Aufgabenbeschreibung -->
    <label>Was hast du heute gemacht?</label>
    <input
      type="text"
      placeholder="Aufgabenbeschreibung eingeben"
      bind:value={description}
    />

    <!-- Speech to Text Button -->
    <button
      type="button"
      class="speech-btn"
      on:click={startListening}
    >
      {isListening ? "🎙️ Höre zu..." : "🎤 Spracheingabe starten"}
    </button>

    <!-- Kategorie Auswahl -->
    <label>Kategorie auswählen</label>
    <select bind:value={selectedCategory}>
      {#each categories as category}
        <option value={category}>{category}</option>
      {/each}
    </select>

    <!-- Startzeit -->
    <label>Startzeit</label>
    <input type="time" bind:value={startTime} />

    <!-- Endzeit -->
    <label>Endzeit</label>
    <input type="time" bind:value={endTime} />

    <!-- Erfolgsauswahl -->
    <label>Wie lief die Aufgabe?</label>
    <select bind:value={outcome}>
      <option value="gut">✅ Gut gelaufen</option>
      <option value="schlecht">❌ Nicht gut gelaufen</option>
    </select>

    <!-- Speichern -->
    <button on:click={addTask}>
      Eintrag speichern
    </button>

  </div>
</div>
