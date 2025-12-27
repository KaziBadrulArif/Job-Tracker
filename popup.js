import { getAllJobs, saveAllJobs, uid, todayISO, normalize } from "./utils.js";

const dateApplied = document.getElementById("dateApplied");
const progress = document.getElementById("progress");
const saveBtn = document.getElementById("saveBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const toast = document.getElementById("toast");
const togglePreview = document.getElementById("togglePreview");
const preview = document.getElementById("preview");
const openTracker = document.getElementById("openTracker");

dateApplied.value = todayISO();

function setLoading(v) {
  btnSpinner.classList.toggle("hidden", !v);
  btnText.textContent = v ? "Saving..." : "Save this job";
  saveBtn.disabled = v;
  saveBtn.style.opacity = v ? "0.85" : "1";
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getJobDataFromPage(tabId) {
  return await chrome.tabs.sendMessage(tabId, { type: "GET_JOB_DATA" });
}

saveBtn.addEventListener("click", async () => {
  setLoading(true);
  try {
    const tab = await getCurrentTab();
    const resp = await getJobDataFromPage(tab.id);

    if (!resp?.ok) throw new Error(resp?.error || "Could not read job data.");

    const jobs = await getAllJobs();
    const data = resp.data;

    // Simple duplicate guard: same URL or same (title+company)
    const isDup = jobs.some(j =>
      j.url === data.url ||
      (normalize(j.title) === normalize(data.title) && normalize(j.company) === normalize(data.company))
    );

    const record = {
      id: uid(),
      title: data.title || "Untitled role",
      company: data.company || data.domain || "Unknown company",
      url: data.url,
      domain: data.domain,
      description: data.description || "",
      dateApplied: dateApplied.value || todayISO(),
      progress: progress.value,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: ""
    };

    const updated = isDup
      ? jobs.map(j => (j.url === record.url ? { ...j, ...record, id: j.id, updatedAt: Date.now() } : j))
      : [record, ...jobs];

    await saveAllJobs(updated);
    showToast(isDup ? "Updated existing job ✅" : "Saved ✅");

    // show preview
    preview.textContent = (record.description || "").slice(0, 2000);
  } catch (e) {
    showToast(`Error: ${e.message || e}`);
  } finally {
    setLoading(false);
  }
});

togglePreview.addEventListener("click", async () => {
  preview.classList.toggle("hidden");
  if (!preview.classList.contains("hidden") && !preview.textContent.trim()) {
    try {
      const tab = await getCurrentTab();
      const resp = await getJobDataFromPage(tab.id);
      if (resp?.ok) preview.textContent = (resp.data.description || "").slice(0, 2000);
    } catch {}
  }
});

openTracker.addEventListener("click", async (e) => {
  e.preventDefault();
  await chrome.runtime.openOptionsPage();
});
