async function testTranslation() {
    const q = encodeURIComponent('محمد');
    // API returns translation ID 131 (Sahih International). Let's see if it's included in search.
    const url1 = `https://api.quran.com/api/v4/search?q=${q}&size=2&page=1&language=en&translations=131`;
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    console.log('Search API with translations=131:');
    console.dir(data1.search.results[0], { depth: null });

    // If translation text isn't in search result, we use verses/by_key
    const verseKey = data1.search.results[0].verse_key;
    const url2 = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?language=en&words=false&translations=131&fields=text_imlaei`;
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    console.log('\nVerse By Key API:');
    console.dir(data2.verse, { depth: null });
}
testTranslation().catch(console.error);
