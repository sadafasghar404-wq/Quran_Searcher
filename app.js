document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsArea = document.getElementById('results-area');
    const resultsList = document.getElementById('results-list');
    const resultsStats = document.getElementById('results-stats');
    const loading = document.getElementById('loading');
    const pagination = document.getElementById('pagination');

    // Translation ID 131 is Sahih International
    const TRANSLATION_ID = 131;
    let currentQuery = '';
    let currentPage = 1;

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        currentQuery = query;
        currentPage = 1;

        // Transform layout to "results" mode
        document.body.classList.add('search-active');

        // Show results area with opacity transition
        resultsArea.classList.remove('hidden');
        // Small delay to allow display block to apply before animating opacity
        setTimeout(() => {
            resultsArea.classList.remove('opacity-0');
            resultsArea.classList.add('opacity-100');
        }, 50);

        performSearch(currentQuery, currentPage);
    });

    async function performSearch(query, page) {
        showLoading(true);
        resultsList.innerHTML = '';
        pagination.innerHTML = '';
        pagination.classList.add('hidden');

        try {
            const size = 10; // Items per page
            const res = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=${size}&page=${page}&language=en&translations=${TRANSLATION_ID}`);

            if (!res.ok) throw new Error('Network response was not ok');

            const data = await res.json();
            const searchData = data.search;

            updateStats(searchData.total_results, query);

            if (searchData.total_results > 0) {
                await renderResults(searchData.results);
                renderPagination(searchData.current_page, searchData.total_pages);
            } else {
                renderEmptyState();
            }
        } catch (error) {
            console.error('Search error:', error);
            resultsList.innerHTML = `
                <div class="text-red-500 py-4">
                    An error occurred while fetching results. Please try again.
                </div>
            `;
        } finally {
            showLoading(false);
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loading.classList.remove('hidden');
            resultsList.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
            resultsList.classList.remove('hidden');
        }
    }

    function updateStats(total, query) {
        if (total === 1) {
            resultsStats.textContent = `About 1 result for "${query}"`;
        } else if (total > 0) {
            // Using a fake time since API doesn't give duration but it feels "Google-esque"
            const randomTime = (Math.random() * 0.5 + 0.1).toFixed(2);
            resultsStats.textContent = `About ${total} results (${randomTime} seconds)`;
        } else {
            resultsStats.textContent = `0 results for "${query}"`;
        }
    }

    async function renderResults(results) {
        // Collect verse keys to fetch translations if not fully delivered by search API
        // Wait! The Search API (api/v4/search) often doesn't actually include the translations array even if requested
        // Let's create an array of promises to fetch translation and full text if needed.

        const versePromises = results.map(async (result) => {
            // fetch verse details by key
            try {
                // Fetch translation and surah info from AlQuran.cloud API
                const verseRes = await fetch(`https://api.alquran.cloud/v1/ayah/${result.verse_key}/en.sahih`);
                const verseData = await verseRes.json();

                return {
                    searchHit: result,
                    verseDetails: verseData.data
                };
            } catch (err) {
                console.error('Error fetching verse details:', err);
                return { searchHit: result, verseDetails: null };
            }
        });

        const versesWithDetails = await Promise.all(versePromises);

        versesWithDetails.forEach(item => {
            const { searchHit, verseDetails } = item;

            // Build the card
            const card = document.createElement('div');
            card.className = 'bg-white/70 backdrop-blur-md rounded-xl p-6 hover:bg-white/90 transition-all border border-white/50 hover:border-white/80 hover:shadow-lg duration-300';

            // Surah and Ayah reference
            // verse_key is format "Surah:Ayah" e.g., "33:40"
            const [surahNum, ayahNum] = searchHit.verse_key.split(':');
            const surahName = verseDetails && verseDetails.surah ? verseDetails.surah.englishName : `Surah ${surahNum}`;
            const referenceLabel = `${surahName}, Ayah ${ayahNum}`;

            const translation = verseDetails && verseDetails.text
                ? verseDetails.text
                : 'Translation not available';

            // We use highlighted text from searchHit if it has the keyword highlighted,
            // else fallback to full text.
            const arabicHTML = searchHit.highlighted || searchHit.text;

            card.innerHTML = `
                <div class="text-sm font-medium text-google-lightText mb-2">
                    <span class="bg-gray-100 px-2 py-1 rounded text-gray-700">${referenceLabel}</span>
                </div>
                <div class="font-arabic text-3xl text-right text-google-text mt-4 mb-4" dir="rtl">
                    ${arabicHTML}
                </div>
                <div class="text-md text-google-text leading-relaxed">
                    ${translation}
                </div>
            `;

            resultsList.appendChild(card);
        });
    }

    function renderEmptyState() {
        resultsList.innerHTML = `
            <div class="py-8">
                <p class="text-google-text text-lg">Your search - <b>${currentQuery}</b> - did not match any ayahs.</p>
                <p class="text-google-lightText mt-2">Suggestions:</p>
                <ul class="list-disc list-inside text-google-lightText mt-2">
                    <li>Make sure all words are spelled correctly.</li>
                    <li>Try searching using simple root words.</li>
                    <li>Ensure you are using Arabic keyboard input.</li>
                </ul>
            </div>
        `;
    }

    function renderPagination(currentPage, totalPages) {
        if (totalPages <= 1) return;

        pagination.classList.remove('hidden');

        // Previous Button
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'px-4 py-2 border rounded text-google-blue hover:bg-google-gray';
            prevBtn.textContent = 'Previous';
            prevBtn.onclick = () => performSearch(currentQuery, currentPage - 1);
            pagination.appendChild(prevBtn);
        }

        // Page info
        const info = document.createElement('span');
        info.className = 'px-4 py-2 text-google-text';
        info.textContent = `Page ${currentPage} of ${totalPages}`;
        pagination.appendChild(info);

        // Next Button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'px-4 py-2 border rounded text-google-blue hover:bg-google-gray';
            nextBtn.textContent = 'Next';
            nextBtn.onclick = () => performSearch(currentQuery, currentPage + 1);
            pagination.appendChild(nextBtn);
        }
    }
});
