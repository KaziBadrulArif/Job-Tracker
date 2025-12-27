(function () {
  // ---------- helpers ----------
  function cleanText(s) {
    return (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (!style) return true;
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;
    return true;
  }

  function isBadContainer(el) {
    // Avoid pulling nav/footer/sidebar/cookie banners, etc.
    if (!el || el.nodeType !== 1) return true;
    const badSelectors = [
      "nav",
      "footer",
      "header",
      "aside",
      "[role='navigation']",
      "[role='banner']",
      "[role='contentinfo']",
      ".cookie",
      "#cookie",
      "[id*='cookie']",
      "[class*='cookie']",
      "[aria-label*='cookie']",
      "[aria-label*='Cookie']",
      "[class*='newsletter']",
      "[id*='newsletter']",
      "[class*='subscribe']",
      "[id*='subscribe']",
      "[class*='signin']",
      "[id*='signin']"
    ];
    return badSelectors.some(sel => el.matches?.(sel));
  }

  function pickFirstText(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && !isBadContainer(el)) {
        const t = cleanText(el.innerText || el.textContent);
        if (t && t.length > 2) return t;
      }
    }
    return "";
  }

  // ---------- smarter description extraction ----------
  function siteSpecificDescription() {
    const host = location.hostname.toLowerCase();

    // Add/adjust selectors over time as you test sites
    const map = [
      // LinkedIn job posting page
      {
        match: h => h.includes("linkedin.com"),
        selectors: [
          ".jobs-description-content__text",
          ".jobs-box__html-content",
          ".jobs-description__content",
          "[data-job-description]"
        ]
      },
      // Indeed
      {
        match: h => h.includes("indeed."),
        selectors: [
          "#jobDescriptionText",
          ".jobsearch-JobComponent-description",
          "[data-testid='jobDescriptionText']"
        ]
      },
      // Greenhouse
      {
        match: h => h.includes("greenhouse.io"),
        selectors: [
          "#content",
          ".content",
          "#job_description",
          "section.applicant"
        ]
      },
      // Lever
      {
        match: h => h.includes("lever.co"),
        selectors: [
          ".description",
          ".posting-detail",
          ".content",
          "section.posting"
        ]
      },
      // Workday (varies a lot; these help sometimes)
      {
        match: h => h.includes("workday"),
        selectors: [
          "[data-automation-id='jobPostingDescription']",
          "[data-automation-id='jobPosting']",
          "main"
        ]
      }
    ];

    for (const entry of map) {
      if (entry.match(host)) {
        const t = pickFirstText(entry.selectors);
        if (t && t.length >= 120) return t;
      }
    }

    return "";
  }

  function scoreElement(el) {
    if (!el || !isVisible(el) || isBadContainer(el)) return -1;

    const text = cleanText(el.innerText || "");
    const len = text.length;
    if (len < 200) return -1;

    // count useful structures
    const liCount = el.querySelectorAll("li").length;
    const pCount = el.querySelectorAll("p").length;

    // keyword hints common in job descriptions
    const lower = text.toLowerCase();
    const keywords = [
      "responsibil", "qualification", "requirements", "what you’ll do", "what you will do",
      "about the role", "job description", "skills", "experience", "benefits", "education"
    ];
    const kwHits = keywords.reduce((acc, k) => acc + (lower.includes(k) ? 1 : 0), 0);

    // penalty if it looks like a whole page dump
    const penalty =
      (lower.includes("cookie") ? 200 : 0) +
      (lower.includes("sign in") ? 120 : 0) +
      (lower.includes("create account") ? 120 : 0);

    // Score weights (tuned to prefer “real” JD blocks)
    const score = len + liCount * 220 + pCount * 80 + kwHits * 400 - penalty;

    return score;
  }

  function bestDescriptionSmart() {
    // 1) If user highlighted the description, trust it (most accurate)
    const selection = window.getSelection()?.toString();
    const selected = cleanText(selection);
    if (selected && selected.length >= 80) return selected;

    // 2) Try site-specific selectors (best for LinkedIn/Indeed/etc.)
    const specific = siteSpecificDescription();
    if (specific) return specific;

    // 3) Try common description containers
    const commonSelectors = [
      "[data-automation='jobDescriptionText']",
      "[data-testid*='description']",
      "[class*='description']",
      "[id*='description']",
      "#jobDescriptionText",
      "#job-description",
      "article",
      "main"
    ];
    const common = pickFirstText(commonSelectors);
    if (common && common.length >= 200) return common;

    // 4) Smart fallback: scan candidate blocks and pick the best-scoring one
    const candidates = Array.from(document.querySelectorAll("main, article, section, div"))
      .slice(0, 1200); // safety cap on huge pages

    let bestEl = null;
    let bestScore = -1;

    for (const el of candidates) {
      // skip tiny or clearly irrelevant containers fast
      if (!el || isBadContainer(el)) continue;
      const s = scoreElement(el);
      if (s > bestScore) {
        bestScore = s;
        bestEl = el;
      }
    }

    if (bestEl) {
      const t = cleanText(bestEl.innerText || "");
      if (t.length >= 200) return t;
    }

    // 5) Last resort: page body (trim)
    const bodyText = cleanText(document.body?.innerText || "");
    return bodyText; // no limit
  }

  function detectCompanyFromMeta() {
    const ogSite = document.querySelector("meta[property='og:site_name']")?.content;
    const author = document.querySelector("meta[name='author']")?.content;
    return cleanText(ogSite || author || "");
  }

  function getJobData() {
    const title =
      pickFirstText([
        "h1",
        "[data-test='job-title']",
        ".top-card-layout__title",
        ".jobsearch-JobInfoHeader-title",
        ".jobs-unified-top-card__job-title",
        "[data-automation-id='jobPostingHeader']"
      ]) || cleanText(document.title);

    const company =
      pickFirstText([
        "[data-test='company-name']",
        ".top-card-layout__second-subline span",
        ".jobsearch-InlineCompanyRating div:first-child",
        ".jobs-unified-top-card__company-name",
        "a[data-tracking-control-name*='company']",
        "[data-automation-id='companyName']"
      ]) || detectCompanyFromMeta();

    const description = bestDescriptionSmart();

    return {
      title,
      company,
      description,
      url: location.href,
      domain: location.hostname
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GET_JOB_DATA") {
      try {
        sendResponse({ ok: true, data: getJobData() });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    }
    return true;
  });
})();
