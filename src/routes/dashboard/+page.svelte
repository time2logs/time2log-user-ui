<script lang="ts">
  import { onMount } from "svelte";

  // ================================
  // Kategorien
  // ================================
  let categories = ["Arbeit", "Meeting", "Lernen", "Organisation", "Sport", "Privat"];
  let selectedCategory = "Arbeit"; // Optional

  // ================================
  // Eingabefelder
  // ================================
  let description = "";   // Aufgabenbeschreibung
  let startTime = "";     // Startzeit
  let endTime = "";       // Endzeit
  let outcome = "gut";    // Erfolgsauswahl
  let difficulties = "";  // Nur bei schlechtem Outcome sichtbar
  let date = new Date().toISOString().split("T")[0]; // Datumsauswahlfeld

  // ================================
  // Gespeicherte Aufgaben
  // ================================
  type Task = {
    date: string;
    category: string;
    description: string;
    startTime: string;
    endTime: string;
    duration: string;
    outcome: string;
    difficulties: string;
  };
  let tasks: Task[] = [];

  // ================================
  // Speech-to-Text Setup
  // ================================
  let recognition: any;
  let isListening = false;

  onMount(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      description += " " + transcript;
    };

    recognition.onstart = () => { isListening = true; };
    recognition.onend = () => { isListening = false; };
    recognition.onerror = () => { isListening = false; };
  });

  function startListening() {
    if (recognition) recognition.start();
    else alert("Speech Recognition wird von deinem Browser nicht unterstützt.");
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
  // Aufgabe speichern
  // ================================
  function addTask() {
    // Pflichtfelder: Beschreibung + Start- + Endzeit
    if (!description.trim() || !startTime || !endTime) {
      alert("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    // Wenn schlecht gelaufen, dann Schwierigkeiten angeben
    if (outcome === "schlecht" && !difficulties.trim()) {
      alert("Bitte beschreibe, was nicht gut gelaufen ist.");
      return;
    }

    const duration = calculateDuration(startTime, endTime);

    // Task speichern
    tasks = [
      ...tasks,
      {
        date,
        category: selectedCategory,
        description,
        startTime,
        endTime,
        duration,
        outcome,
        difficulties
      }
    ];

    // Formular zurücksetzen
    description = "";
    startTime = "";
    endTime = "";
    outcome = "gut";
    difficulties = "";
    date = new Date().toISOString().split("T")[0];
  }
</script>

<style>
  .wrapper { max-width: 900px; margin: 2rem auto; padding: 2rem; font-family: 'Inter', sans-serif; }
  h1 { text-align: center; margin-bottom: 2rem; color: #4f46e5; font-size: 2rem; }
  .card { background: white; padding: 2rem; border-radius: 20px; box-shadow: 0 12px 28px rgba(0,0,0,0.12); display: flex; flex-direction: column; gap: 1rem; transition: all 0.3s ease; }
  label { font-weight: 600; margin-top: 0.5rem; display: block; }
  input, select, textarea { padding: 0.75rem; border-radius: 12px; border: 1px solid #ccc; font-size: 0.95rem; width: 100%; box-sizing: border-box; transition: all 0.2s ease; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
  button { padding: 0.75rem; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
  button:hover { opacity: 0.9; transform: translateY(-2px); }
  .save-btn { background: #6366f1; color: white; }
  .speech-btn { background: #10b981; color: white; }
  .speech-btn:hover { background: #059669; }
  .fade-enter { opacity: 0; max-height: 0; transform: translateY(-10px); }
  .fade-enter-active { opacity: 1; max-height: 200px; transform: translateY(0); transition: all 0.4s ease; }
  .fade-leave { opacity: 1; max-height: 200px; transform: translateY(0); }
  .fade-leave-active { opacity: 0; max-height: 0; transform: translateY(-10px); transition: all 0.3s ease; }
  .task-list { margin-top: 2rem; }
  .task-item { background: #f9f9f9; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
  .task-item span { font-weight: 600; }
</style>

<div class="wrapper">
  <h1>📘 Arbeitsjournal</h1>

  <div class="card">
    <!-- Datumsauswahl -->
    <label>Datum <span style="color:red">*</span></label>
    <input type="date" bind:value={date} />

    <!-- Aufgabenbeschreibung -->
    <label>Was hast du heute gemacht? <span style="color:red">*</span></label>
    <input type="text" placeholder="Aufgabenbeschreibung eingeben" bind:value={description} />

    <!-- Speech-to-Text -->
    <button type="button" class="speech-btn" on:click={startListening}>
      {isListening ? "🎙️ Höre zu..." : "🎤 Spracheingabe starten"}
    </button>

    <!-- Kategorie Auswahl (optional) -->
    <label>Kategorie auswählen (optional)</label>
    <select bind:value={selectedCategory}>
      {#each categories as category}
        <option value={category}>{category}</option>
      {/each}
    </select>

    <!-- Start- und Endzeit -->
    <label>Startzeit <span style="color:red">*</span></label>
    <input type="time" bind:value={startTime} />

    <label>Endzeit <span style="color:red">*</span></label>
    <input type="time" bind:value={endTime} />

    <!-- Erfolgsauswahl -->
    <label>Wie lief die Aufgabe? <span style="color:red">*</span></label>
    <select bind:value={outcome}>
      <option value="gut">✅ Gut gelaufen</option>
      <option value="schlecht">❌ Nicht gut gelaufen</option>
    </select>

    <!-- Schwierigkeiten nur bei 'schlecht' -->
    {#if outcome === "schlecht"}
      <textarea placeholder="Beschreibe die Schwierigkeiten..." bind:value={difficulties} rows="3" class="fade-enter"></textarea>
    {/if}

    <!-- Speichern -->
    <button class="save-btn" on:click={addTask}>
      💾 Eintrag speichern
    </button>
  </div>

  <!-- ============================
       Tagesübersicht der Aufgaben
       ============================ -->
  {#if tasks.length > 0}
    <div class="task-list">
      <h2>📋 Tagesübersicht</h2>
      {#each tasks as task (task.startTime + task.description)}
        <div class="task-item">
          <div><span>Datum:</span> {task.date}</div>
          <div><span>Kategorie:</span> {task.category || "–"}</div>
          <div><span>Beschreibung:</span> {task.description}</div>
          <div><span>Zeit:</span> {task.startTime} – {task.endTime} ({task.duration})</div>
          <div><span>Status:</span> {task.outcome}</div>
          {#if task.outcome === "schlecht"}
            <div><span>Schwierigkeiten:</span> {task.difficulties}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
