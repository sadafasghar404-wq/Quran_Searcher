async function testAlQuranTranslation() {
    const verseKey = '33:40'; // Surah 33, Ayah 40
    const url = `http://api.alquran.cloud/v1/ayah/${verseKey}/en.sahih`;

    console.log(`Testing: ${url}`);
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.dir(data, { depth: null });
    } catch (e) {
        console.error(e.message);
    }
}
testAlQuranTranslation();
