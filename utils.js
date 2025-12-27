export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function getAllJobs() {
  const { jobs = [] } = await chrome.storage.local.get(["jobs"]);
  return jobs;
}

export async function saveAllJobs(jobs) {
  await chrome.storage.local.set({ jobs });
}

export function normalize(s) {
  return (s || "").trim().toLowerCase();
}
