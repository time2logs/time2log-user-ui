<script lang="ts">
  import { Dropdown, DropdownItem } from "flowbite-svelte";

  // Kategorien für Aufgaben
  let categories = ["Arbeit", "Meeting", "Lernen", "Organisation", "Sport", "Privat"];
  let selectedCategory = "Arbeit";

  // Eingabefelder für die Aufgabe
  let description = ""; // Beschreibung der Aufgabe
  let startTime = ""; // Startzeit der Aufgabe
  let endTime = "";   // Endzeit der Aufgabe
  let outcome = "gut"; // Erfolg der Aufgabe (gut/schlecht)
  let difficulties = ""; // Schwierigkeiten falls Aufgabe schlecht gelaufen
  let date = new Date().toISOString().split("T")[0]; // aktuelles Datum

  let error = ""; // Fehlermeldung

  // Berechnet die Dauer zwischen Start- und Endzeit
  function calculateDuration(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return "";
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }

  // Formular zurücksetzen nach Speichern
  function resetForm() {
    description = "";
    startTime = "";
    endTime = "";
    outcome = "gut";
    difficulties = "";
    error = "";
  }

  // Aufgabe speichern (wird intern gespeichert, aber nicht angezeigt)
  function addTask() {
    error = "";
    if (!description || !startTime || !endTime) {
      error = "Bitte alle Pflichtfelder ausfüllen.";
      return;
    }
    if (endTime <= startTime) {
      error = "Endzeit muss nach der Startzeit liegen.";
      return;
    }
    // Aufgabe kann hier gespeichert werden, z.B. in einer Datenbank oder intern
    resetForm();
  }
</script>

<style>
  /* Container und allgemeine Styles */
  .wrapper { max-width: 900px; margin: 2rem auto; padding: 1.5rem; font-family: 'Inter', sans-serif; }
  h1 { text-align: center; font-size: 2rem; margin-bottom: 1rem; color: #4f46e5; }
  .card { background: white; border-radius: 20px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: grid; gap: 1rem; }
  input, select, textarea, button { padding: 0.75rem; border-radius: 12px; border: 1px solid #ddd; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
  button { background: #6366f1; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  button:hover { background: #4f46e5; }
</style>

<div class="wrapper">
  <h1>📘 Arbeitsjournal</h1>

  <div class="card">
    <!-- Aufgabenbeschreibung -->
    <label>Was hast du heute gemacht?</label>
    <input type="text" placeholder="Aufgabenbeschreibung eingeben" bind:value={description} />

    <!-- Kategorie Dropdown -->
    <label>Kategorie auswählen</label>
    <select bind:value={selectedCategory}>
      {#each categories as category}
        <option value={category}>{category}</option>
      {/each}
    </select>

    <!-- Start- und Endzeit Eingabe -->
    <label>Startzeit:</label>
    <input type="time" bind:value={startTime} />
    <label>Endzeit:</label>
    <input type="time" bind:value={endTime} />

    <!-- Erfolgsauswahl -->
    <label>Wie lief die Aufgabe?</label>
    <select bind:value={outcome}>
      <option value="gut">✅ Gut gelaufen</option>
      <option value="schlecht">❌ Nicht gut gelaufen</option>
    </select>

    <!-- Aufgabe speichern -->
    <button on:click={addTask}>Eintrag speichern</button>
  </div>
</div>
scm-history-item:c%3A%5CUsers%5Cjana%5Ctime2log-user-ui?%7B%22repositoryId%22%3A%22scm0%22%2C%22historyItemId%22%3A%22d54e8b3dc87a3b5a4d20452887306423e5012630%22%2C%22historyItemParentId%22%3A%22bcb3232dd82f671c07feece719dd01082e0e6c51%22%2C%22historyItemDisplayId%22%3A%22d54e8b3%22%7D