(() => {
  "use strict";

  const explorer = document.getElementById("comparisonExplorer");
  if (!explorer) return;

  const root = "./media/comparisons/";
  const cabinetTask = "Open the left door of the wooden cabinet located directly to the right of the doorway.";
  const groups = {
    regions: {
      task: cabinetTask,
      description: "Object-matched, non-semantic, and Structured candidate regions are shown alongside the full scene.",
      legend: "Green marks the retained candidate region.",
      clips: [
        ["Full Scene", "regions/full_scene.mp4"],
        ["Object-matched", "regions/object_matched.mp4"],
        ["Non-semantic matched", "regions/nonsemantic.mp4"],
        ["Structured", "regions/structured.mp4"]
      ]
    },
    support: {
      task: "Control some functions on the washing machine using the button panel.",
      description: "Coarse and learned initial support are shown before and after the same conservative refinement.",
      legend: "Green marks functional support before or after refinement.",
      clips: [
        ["Coarse Support · Initial", "support/coarse_initial.mp4"],
        ["Coarse Support · Refined", "support/coarse_refined.mp4"],
        ["Learned Support · Initial", "support/learned_initial.mp4"],
        ["Learned Support · Refined", "support/learned_refined.mp4"]
      ]
    },
    foundation: {
      task: cabinetTask,
      description: "Direct VLM + SAM3 and PartSAM-based predictions are compared with ActFun3D. The direct baselines use raw task instructions.",
      legend: "Green marks the predicted functional region.",
      clips: [
        ["Qwen3.8-Max + SAM3", "foundation/qwen_sam3.mp4"],
        ["GPT-6 Sol + SAM3", "foundation/gpt_sam3.mp4"],
        ["PartSAM + GPT-6 Sol", "foundation/partsam_gpt.mp4"],
        ["ActFun3D", "foundation/actfun3d.mp4"]
      ]
    }
  };

  const videos = [...explorer.querySelectorAll("[data-comparison-video]")];
  const titles = [...explorer.querySelectorAll("[data-comparison-title]")];
  const tabs = [...explorer.querySelectorAll("[data-comparison]")];
  const playback = document.getElementById("comparisonPlayback");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let playing = false;
  let visible = false;
  let entered = false;
  let resumeOnVisible = false;
  let resumeAfterHidden = false;
  let generation = 0;

  function showPlaybackState() {
    playback.textContent = playing ? "Pause together" : "Play together";
    playback.setAttribute("aria-pressed", String(playing));
  }

  async function setPlaying(value) {
    playing = value;
    showPlaybackState();
    if (!value) {
      videos.forEach(video => video.pause());
      return;
    }
    const currentGeneration = generation;
    const outcomes = await Promise.allSettled(videos.map(video => video.play()));
    if (currentGeneration !== generation) return;
    if (outcomes.every(outcome => outcome.status === "rejected")) {
      playing = false;
      showPlaybackState();
    }
  }

  function resetTime() {
    videos.forEach(video => {
      if (video.readyState >= 1) video.currentTime = 0;
    });
  }

  function selectGroup(key) {
    const group = groups[key];
    if (!group) return;
    generation += 1;
    setPlaying(false);
    tabs.forEach(tab => {
      const selected = tab.dataset.comparison === key;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    document.getElementById("comparisonTask").textContent = group.task;
    document.getElementById("comparisonDescription").textContent = group.description;
    document.getElementById("comparisonLegend").lastChild.textContent = group.legend;
    videos.forEach((video, index) => {
      const [title, file] = group.clips[index];
      titles[index].textContent = title;
      video.setAttribute("aria-label", title + ": " + group.task);
      video.src = root + file;
      video.preload = "metadata";
      video.load();
    });
    if (visible && !reducedMotion.matches && !document.hidden) setPlaying(true);
  }

  tabs.forEach(tab => tab.addEventListener("click", () => selectGroup(tab.dataset.comparison)));
  playback.addEventListener("click", () => setPlaying(!playing));
  document.getElementById("comparisonRestart").addEventListener("click", () => {
    resetTime();
    setPlaying(true);
  });

  videos.forEach(video => {
    video.addEventListener("play", () => {
      if (!playing && visible && !document.hidden) setPlaying(true);
    });
    video.addEventListener("pause", () => {
      if (playing && video.paused && !video.ended) setPlaying(false);
    });
  });

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) {
      resumeOnVisible = playing;
      setPlaying(false);
      return;
    }
    if (!entered) {
      entered = true;
      videos.forEach(video => { video.preload = "metadata"; video.load(); });
      if (!reducedMotion.matches && !document.hidden) setPlaying(true);
    } else if (resumeOnVisible && !reducedMotion.matches && !document.hidden) {
      resumeOnVisible = false;
      setPlaying(true);
    }
  }, { threshold: 0.08 });
  observer.observe(explorer);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resumeAfterHidden = playing;
      setPlaying(false);
    } else if (resumeAfterHidden && visible && !reducedMotion.matches) {
      resumeAfterHidden = false;
      setPlaying(true);
    }
  });
  reducedMotion.addEventListener("change", event => {
    if (event.matches) setPlaying(false);
  });
})();
