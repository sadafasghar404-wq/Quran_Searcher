// ─── Surah Name Lookup ───────────────────────────────────────────────────────
const SURAH_NAMES = {
    1: "Al-Fatiha", 2: "Al-Baqarah", 3: "Ali 'Imran", 4: "An-Nisa'",
    5: "Al-Ma'idah", 6: "Al-An'am", 7: "Al-A'raf", 8: "Al-Anfal",
    9: "At-Tawbah", 10: "Yunus", 11: "Hud", 12: "Yusuf",
    13: "Ar-Ra'd", 14: "Ibrahim", 15: "Al-Hijr", 16: "An-Nahl",
    17: "Al-Isra'", 18: "Al-Kahf", 19: "Maryam", 20: "Ta-Ha",
    21: "Al-Anbiya'", 22: "Al-Hajj", 23: "Al-Mu'minun", 24: "An-Nur",
    25: "Al-Furqan", 26: "Ash-Shu'ara'", 27: "An-Naml", 28: "Al-Qasas",
    29: "Al-'Ankabut", 30: "Ar-Rum", 31: "Luqman", 32: "As-Sajdah",
    33: "Al-Ahzab", 34: "Saba'", 35: "Fatir", 36: "Ya-Sin",
    37: "As-Saffat", 38: "Sad", 39: "Az-Zumar", 40: "Ghafir",
    41: "Fussilat", 42: "Ash-Shura", 43: "Az-Zukhruf", 44: "Ad-Dukhan",
    45: "Al-Jathiyah", 46: "Al-Ahqaf", 47: "Muhammad", 48: "Al-Fath",
    49: "Al-Hujurat", 50: "Qaf", 51: "Adh-Dhariyat", 52: "At-Tur",
    53: "An-Najm", 54: "Al-Qamar", 55: "Ar-Rahman", 56: "Al-Waqi'ah",
    57: "Al-Hadid", 58: "Al-Mujadila", 59: "Al-Hashr", 60: "Al-Mumtahanah",
    61: "As-Saf", 62: "Al-Jumu'ah", 63: "Al-Munafiqun", 64: "At-Taghabun",
    65: "At-Talaq", 66: "At-Tahrim", 67: "Al-Mulk", 68: "Al-Qalam",
    69: "Al-Haqqah", 70: "Al-Ma'arij", 71: "Nuh", 72: "Al-Jinn",
    73: "Al-Muzzammil", 74: "Al-Muddaththir", 75: "Al-Qiyamah", 76: "Al-Insan",
    77: "Al-Mursalat", 78: "An-Naba'", 79: "An-Nazi'at", 80: "'Abasa",
    81: "At-Takwir", 82: "Al-Infitar", 83: "Al-Mutaffifin", 84: "Al-Inshiqaq",
    85: "Al-Buruj", 86: "At-Tariq", 87: "Al-A'la", 88: "Al-Ghashiyah",
    89: "Al-Fajr", 90: "Al-Balad", 91: "Ash-Shams", 92: "Al-Layl",
    93: "Ad-Duha", 94: "Ash-Sharh", 95: "At-Tin", 96: "Al-'Alaq",
    97: "Al-Qadr", 98: "Al-Bayyinah", 99: "Az-Zalzalah", 100: "Al-'Adiyat",
    101: "Al-Qari'ah", 102: "At-Takathur", 103: "Al-'Asr", 104: "Al-Humazah",
    105: "Al-Fil", 106: "Quraysh", 107: "Al-Ma'un", 108: "Al-Kawthar",
    109: "Al-Kafirun", 110: "An-Nasr", 111: "Al-Masad", 112: "Al-Ikhlas",
    113: "Al-Falaq", 114: "An-Nas"
};

// Translation IDs on Quran.com
// 131 = Saheeh International (English)
// 97  = Abul Ala Maududi (Urdu)
const EN_ID = 131;
const UR_ID = 97;

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');

    btn.addEventListener('click', performSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(); });
});

// ─── Main Search Flow ─────────────────────────────────────────────────────────
async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    setLoading(true);
    clearResults();
    hideError();

    try {
        // 1. Search Quran.com for the English word
        const searchUrl =
            `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=20&page=1&language=en`;

        const searchResp = await fetch(searchUrl);
        if (!searchResp.ok) throw new Error(`API error: ${searchResp.status}`);
        const searchData = await searchResp.json();

        const total = searchData.search?.total_results ?? 0;
        const results = searchData.search?.results ?? [];

        if (results.length === 0) {
            showError(`No results found for <strong>"${escHtml(query)}"</strong>.<br>Try another word (e.g. mercy, light, prayer).`);
            setLoading(false);
            return;
        }

        // 2. Show frequency
        showFrequency(query, total);

        // 3. Fetch English + Urdu translations for every verse (parallel)
        const verseKeys = results.map(r => r.verse_key);
        const translations = await fetchAllTranslations(verseKeys);

        // 4. Render cards
        renderCards(results, translations);

        // 5. Show pagination note if more than 20 results
        if (total > 20) showPaginationNote(total);

    } catch (err) {
        console.error(err);
        showError('Could not connect to the Quran API.<br>Please check your internet connection and try again.');
    } finally {
        setLoading(false);
    }
}

// ─── Fetch Translations in Parallel ──────────────────────────────────────────
async function fetchAllTranslations(verseKeys) {
    const map = {};

    await Promise.all(
        verseKeys.map(async key => {
            try {
                const url =
                    `https://api.quran.com/api/v4/verses/by_key/${key}` +
                    `?translations=${EN_ID},${UR_ID}&fields=text_uthmani`;
                const resp = await fetch(url);
                if (!resp.ok) return;
                const data = await resp.json();
                map[key] = data.verse;
            } catch { /* silently skip failed verse */ }
        })
    );

    return map;
}

// ─── Render Result Cards ──────────────────────────────────────────────────────
function renderCards(results, translationMap) {
    const container = document.getElementById('results-container');

    results.forEach((result, idx) => {
        const key = result.verse_key;
        const [chapStr, verseStr] = key.split(':');
        const surahName = SURAH_NAMES[parseInt(chapStr)] || `Surah ${chapStr}`;

        // Extract English & Urdu from fetched translation data
        let englishText = 'Translation not available.';
        let urduText = 'ترجمہ دستیاب نہیں۔';

        const verse = translationMap[key];
        if (verse?.translations) {
            for (const t of verse.translations) {
                if (t.resource_id === EN_ID) englishText = stripTags(t.text);
                if (t.resource_id === UR_ID) urduText = stripTags(t.text);
            }
        }

        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.animationDelay = `${idx * 0.045}s`;

        card.innerHTML = `
      <div class="card-header">
        <div class="verse-ref">
          <span class="surah-name">${escHtml(surahName)}</span>
          <span class="ayah-badge">Ayah ${escHtml(verseStr)}</span>
        </div>
        <span class="verse-key">${escHtml(key)}</span>
      </div>

      <div class="translation">
        <div class="trans-label">🇬🇧 English</div>
        <p class="trans-text">${escHtml(englishText)}</p>
      </div>

      <div class="translation urdu-trans" dir="rtl">
        <div class="trans-label" dir="ltr">🇵🇰 اردو</div>
        <p class="trans-text urdu-text">${escHtml(urduText)}</p>
      </div>
    `;

        container.appendChild(card);
    });
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showFrequency(query, total) {
    const el = document.getElementById('freq-display');
    document.getElementById('freq-text').innerHTML =
        `Found <strong>${total.toLocaleString()}</strong> occurrence${total !== 1 ? 's' : ''} of <em>"${escHtml(query)}"</em> in the Quran`;
    el.classList.remove('hidden');
}

function showPaginationNote(total) {
    const el = document.getElementById('pagination-info');
    el.textContent = `Showing top 20 of ${total.toLocaleString()} results`;
    el.classList.remove('hidden');
}

function setLoading(visible) {
    document.getElementById('loading').classList.toggle('hidden', !visible);
}

function clearResults() {
    document.getElementById('results-container').innerHTML = '';
    document.getElementById('freq-display').classList.add('hidden');
    document.getElementById('pagination-info').classList.add('hidden');
}

function showError(html) {
    const el = document.getElementById('error-display');
    el.innerHTML = html;
    el.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-display').classList.add('hidden');
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function stripTags(html) {
    return html ? html.replace(/<[^>]*>/g, '') : '';
}
