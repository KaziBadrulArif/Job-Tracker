import { getAllJobs, saveAllJobs, normalize } from "./utils.js";

const list = document.getElementById("list");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const filter = document.getElementById("filter");
const sort = document.getElementById("sort");
const exportBtn = document.getElementById("exportBtn");
const stats = document.getElementById("stats");

// Modal elements
const modal = document.getElementById("detailModal");
const mCompany = document.getElementById("mCompany");
const mTitle = document.getElementById("mTitle");
const mUrl = document.getElementById("mUrl");
const mDateApplied = document.getElementById("mDateApplied");
const mProgress = document.getElementById("mProgress");
const mNotes = document.getElementById("mNotes");
const mDescription = document.getElementById("mDescription");
const deleteBtn = document.getElementById("deleteBtn");
const saveBtn = document.getElementById("saveBtn");

let jobs = [];
let activeId = null;

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function companyInitial(company) {
  const c = (company || "").trim();
  return c ? c[0].toUpperCase() : "•";
}

function formatDate(iso) {
  return iso ? iso : "—";
}

function makeSnippet(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "No description captured (try highlighting the description before saving).";
  return t.length > 180 ? t.slice(0, 180) + "…" : t;
}

function computeStats(items) {
  const buckets = ["Applied", "Interview", "Offer", "Rejected", "Ghosted"];
  const counts = Object.fromEntries(buckets.map(b => [b, 0]));
  for (const j of items) counts[j.progress || "Applied"] = (counts[j.progress || "Applied"] || 0) + 1;
  return counts;
}

function renderStats() {
  const counts = computeStats(jobs);
  const total = jobs.length;

  const chip = (label, value) => `
    <div class="chip" data-chip="${label}">
      <span class="dot"></span>
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;

  stats.innerHTML = [
    chip("All", total),
    chip("Applied", counts.Applied || 0),
    chip("Interview", counts.Interview || 0),
    chip("Offer", counts.Offer || 0),
    chip("Rejected", counts.Rejected || 0),
    chip("Ghosted", counts.Ghosted || 0)
  ].join("");

  // Click chips to filter quickly
  stats.querySelectorAll("[data-chip]").forEach(el => {
    el.addEventListener("click", () => {
      const val = el.getAttribute("data-chip");
      filter.value = val === "All" ? "ALL" : val;
      render();
    });
  });
}

function matches(job) {
  const q = normalize(search.value);
  const f = filter.value;

  const hay = normalize(`${job.title} ${job.company} ${job.domain}`);
  const okSearch = !q || hay.includes(q);
  const okFilter = f === "ALL" || (job.progress || "Applied") === f;

  return okSearch && okFilter;
}

function sortJobs(items) {
  const mode = sort.value;
  const copy = [...items];

  const cmpStr = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });

  if (mode === "NEWEST") return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (mode === "OLDEST") return copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (mode === "COMPANY") return copy.sort((a, b) => cmpStr(a.company || "", b.company || ""));
  if (mode === "TITLE") return copy.sort((a, b) => cmpStr(a.title || "", b.title || ""));
  return copy;
}

async function load() {
  jobs = await getAllJobs();
  renderStats();
  render();
}

function render() {
  const visible = sortJobs(jobs.filter(matches));

  empty.classList.toggle("hidden", jobs.length !== 0);
  list.innerHTML = "";

  for (const job of visible) {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="avatar">${escapeHtml(companyInitial(job.company))}</div>

      <div class="content">
        <div class="titleRow">
          <div style="min-width:0">
            <p class="jobTitle">${escapeHtml(job.title || "Untitled role")}</p>
            <p class="company">${escapeHtml(job.company || "Unknown company")} • ${escapeHtml(job.domain || "")}</p>
          </div>

          <div class="actions">
            <select data-progress="${job.id}">
              ${["Applied","Interview","Offer","Rejected","Ghosted"].map(p =>
                `<option ${((job.progress || "Applied")===p) ? "selected":""}>${p}</option>`
              ).join("")}
            </select>
            <button class="btn ghost" data-detail="${job.id}">Details</button>
          </div>
        </div>

        <div class="metaRow">
          <span class="pill">${escapeHtml(job.progress || "Applied")}</span>
          <span class="small">Applied: ${escapeHtml(formatDate(job.dateApplied))}</span>
          <a class="link" href="${escapeHtml(job.url)}" target="_blank" rel="noreferrer">Open ↗</a>
        </div>

        <div class="previewLine">${escapeHtml(makeSnippet(job.description))}</div>
      </div>
    `;

    list.appendChild(card);
  }

  // progress change
  list.querySelectorAll("select[data-progress]").forEach(sel => {
    sel.addEventListener("change", async () => {
      const id = sel.getAttribute("data-progress");
      const val = sel.value;
      jobs = jobs.map(j => j.id === id ? { ...j, progress: val, updatedAt: Date.now() } : j);
      await saveAllJobs(jobs);
      renderStats();
      render();
    });
  });

  // open modal
  list.querySelectorAll("[data-detail]").forEach(btn => {
    btn.addEventListener("click", () => openModal(btn.getAttribute("data-detail")));
  });
}

function openModal(id) {
  activeId = id;
  const job = jobs.find(j => j.id === id);
  if (!job) return;

  mCompany.textContent = job.company || "Unknown company";
  mTitle.textContent = job.title || "Untitled role";
  mUrl.href = job.url || "#";
  mUrl.textContent = job.url ? "Open posting ↗" : "No URL";

  mDateApplied.value = job.dateApplied || "";
  mProgress.value = job.progress || "Applied";
  mNotes.value = job.notes || "";

  // Full description — no limit
  mDescription.textContent = job.description || "No description captured.";

  deleteBtn.onclick = async () => {
    jobs = jobs.filter(j => j.id !== activeId);
    await saveAllJobs(jobs);
    activeId = null;
    modal.close();
    renderStats();
    render();
  };

  saveBtn.onclick = async () => {
    jobs = jobs.map(j => {
      if (j.id !== activeId) return j;
      return {
        ...j,
        dateApplied: mDateApplied.value || j.dateApplied,
        progress: mProgress.value || j.progress,
        notes: mNotes.value || "",
        updatedAt: Date.now()
      };
    });

    await saveAllJobs(jobs);
    modal.close();
    renderStats();
    render();
  };

  modal.showModal();
}

function toCSV(rows) {
  const headers = ["title","company","dateApplied","progress","url","domain","notes"];
  const lines = [headers.join(",")];

  for (const r of rows) {
    const line = headers.map(h => {
      const v = String(r[h] ?? "");
      return `"${v.replace(/"/g, '""')}"`;
    }).join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

exportBtn.addEventListener("click", () => {
  const csv = toCSV(jobs);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "job-tracker.csv";
  a.click();

  URL.revokeObjectURL(url);
});

search.addEventListener("input", render);
filter.addEventListener("change", render);
sort.addEventListener("change", render);

load();
