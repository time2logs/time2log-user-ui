const API_URL = "http://localhost:8080/api/tasks";
const LOGOUT_URL = "http://localhost:8080/api/logout";

<script lang="ts">
  import { onMount } from "svelte";

  let categories = ["Arbeit", "Meeting", "Lernen", "Kurs", "Externe Anlässe", "Private Abwesenheit"];
  let selectedCategory = "Arbeit"; // Optional

  let description = "";
  let startTime = "";
  let endTime = "";
  let outcome = "gut";
  let difficulties = "";
  let date = new Date().toISOString().split("T")[0];


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


  function calculateDuration(start: string, end: string) {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return "";
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }


  function addTask() {
    if (!description.trim() || !startTime || !endTime) {
      alert("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    if (outcome === "schlecht" && !difficulties.trim()) {
      alert("Bitte beschreibe, was nicht gut gelaufen ist.");
      return;
    }

    const duration = calculateDuration(startTime, endTime);


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

    description = "";
    startTime = "";
    endTime = "";
    outcome = "gut";
    difficulties = "";
    date = new Date().toISOString().split("T")[0];
  }


  async function logout() {
    try {
      const response = await fetch(LOGOUT_URL, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/login';
      } else {
        console.error('Logout fehlgeschlagen:', response.statusText);
      }
    } catch (error) {
      console.error('Logout fehlgeschlagen:', error);
    }
  }

</script>

<svelte:head>
  <title>Time2Log Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div
  class="min-h-screen w-full flex flex-col items-center py-8 px-4 font-sans text-gray-900 bg-[#f3f5fa]"
  style="background: radial-gradient(circle at 10% 20%, rgb(239, 246, 255) 0%, rgb(243, 245, 250) 40%, rgb(243, 238, 252) 90%);"
>
  <!-- Main Logo -->
  <h1 class="text-[42px] font-bold tracking-tight text-[#1a1a1a] mb-6">
    Time2Log
  </h1>
  <p class="text-center text-gray-500 text-[15px] font-medium mb-6 -mt-4">
    Track your daily activities
  </p>

  <div class="w-full max-w-[600px] bg-white rounded-[24px] p-10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] relative z-10 border border-white/50 flex flex-col gap-5">
    <label for="date" class="font-semibold text-[#1a1a1a] text-[15px] block">
      Datum <span class="text-red-500 ml-0.5">*</span>
    </label>
    <input
      id="date"
      type="date"
      bind:value={date}
      class="h-[52px] px-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full"
    />

    <label for="description" class="font-semibold text-[#1a1a1a] text-[15px] block">
      Was hast du heute gemacht? <span class="text-red-500 ml-0.5">*</span>
    </label>
    <input
      id="description"
      type="text"
      placeholder="Aufgabenbeschreibung eingeben"
      bind:value={description}
      class="h-[52px] px-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full"
    />

    <!-- Speech-to-Text -->
    <button
      type="button"
      class="h-[52px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-[12px] font-medium text-[16px] flex items-center justify-center gap-2 transition-colors"
      on:click={startListening}
      aria-label="Spracheingabe starten"
    >
      {isListening ? "🎙️ Höre zu..." : "🎤 Spracheingabe starten"}
    </button>

    <label for="category" class="font-semibold text-[#1a1a1a] text-[15px] block">
      Kategorie auswählen (optional)
    </label>
    <select
      id="category"
      bind:value={selectedCategory}
      class="h-[52px] px-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full"
    >
      {#each categories as category}
        <option value={category}>{category}</option>
      {/each}
    </select>

    <label for="startTime" class="font-semibold text-[#1a1a1a] text-[15px] block">
      Startzeit <span class="text-red-500 ml-0.5">*</span>
    </label>
    <input
      id="startTime"
      type="time"
      bind:value={startTime}
      class="h-[52px] px-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full"
    />

    <label for="endTime" class="font-semibold text-[#1a1a1a] text-[15px] block">
      Endzeit <span class="text-red-500 ml-0.5">*</span>
    </label>
    <input
      id="endTime"
      type="time"
      bind:value={endTime}
      class="h-[52px] px-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full"
    />

    <label for="outcome" class="font-semibold text-[#1a1a1a] text-[15px] block">
      Wie lief die Aufgabe? <span class="text-red-500 ml-0.5">*</span>
    </label>
    <select
      id="outcome"
      bind:value={outcome}
      class="h-[52px] px-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full"
    >
      <option value="gut">✅ Gut gelaufen</option>
      <option value="schlecht">❌ Nicht gut gelaufen</option>
    </select>

    {#if outcome === "schlecht"}
      <label for="difficulties" class="font-semibold text-[#1a1a1a] text-[15px] block">
        Beschreibe die Schwierigkeiten
      </label>
      <textarea
        id="difficulties"
        placeholder="Beschreibe die Schwierigkeiten..."
        bind:value={difficulties}
        rows="3"
        class="px-4 py-3 min-h-[80px] bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-full resize-y"
      ></textarea>
    {/if}

    <button
      class="h-[52px] bg-[#222222] hover:bg-black text-white rounded-[12px] font-medium text-[16px] flex items-center justify-center gap-2 transition-colors mt-2"
      on:click={addTask}
    >
      💾 Eintrag speichern
    </button>
  </div>

  {#if tasks.length > 0}
    <div class="mt-8 w-full max-w-[600px]">
      <h2 class="text-[24px] font-semibold text-[#1a1a1a] mb-4">
        📋 Tagesübersicht
      </h2>
      {#each tasks as task (task.startTime + task.description)}
        <div class="bg-white p-5 rounded-[16px] mb-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-black/4">
          <div class="mb-2 text-[14px] text-gray-700">
            <span class="font-semibold text-[#1a1a1a] mr-2">Datum:</span> {task.date}
          </div>
          <div class="mb-2 text-[14px] text-gray-700">
            <span class="font-semibold text-[#1a1a1a] mr-2">Kategorie:</span> {task.category || "–"}
          </div>
          <div class="mb-2 text-[14px] text-gray-700">
            <span class="font-semibold text-[#1a1a1a] mr-2">Beschreibung:</span> {task.description}
          </div>
          <div class="mb-2 text-[14px] text-gray-700">
            <span class="font-semibold text-[#1a1a1a] mr-2">Zeit:</span> {task.startTime} – {task.endTime} ({task.duration})
          </div>
          <div class = "button">
          <button
            on:click = {logout}
            class= "py-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-[12px] font-medium transition-colors">
            Logout
            </button>
            </div>
          <div class="mb-2 text-[14px] text-gray-700">
            <span class="font-semibold text-[#1a1a1a] mr-2">Status:</span> {task.outcome}
          </div>
          {#if task.outcome === "schlecht"}
            <div class="text-[14px] text-gray-700 mb-0">
              <span class="font-semibold text-[#1a1a1a] mr-2">Schwierigkeiten:</span> {task.difficulties}
            </div>
          {/if}
        </div>
      {/each}
    </div>

  {/if}

</div>
