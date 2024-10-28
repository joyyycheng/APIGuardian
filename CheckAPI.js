const axios = require('axios');

async function fetchApiResults(fullURLS) {
    const results = new Map();

    for (const [originalUrl, finalUrl] of fullURLS) {
        
        const cleanUrl = finalUrl.replace(/^f|^'|'$|^`|`$|^"|"$|"/g, '').trim();
        const cleanedUrl = cleanUrl.replace(/^'|'$|^"|"$|"/g, '').trim();

        const encodedUrl = encodeURI(cleanedUrl);

        try {
            console.log(encodedUrl);
            const response = await axios.get(encodedUrl); // Fetch data from the final URL
            if(response)
            {
               results.set(originalUrl, encodedUrl + ":" + " Success");
            }
        } catch (error) {
            console.log(searchStackOverflow(encodedUrl + ": " + error.message));

            results.set(originalUrl, encodedUrl + ": " + error.message);
        }
    }

    return results; // Return the results array
}

async function searchStackOverflow(query) {
    const apiUrl = `https://api.stackexchange.com/2.3/search?order=desc&sort=activity&intitle=${encodeURIComponent(query)}&site=stackoverflow`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const results = data.items;

        // Return relevant results
        if (results && results.length > 0) {
            return results.map(item => ({
                title: item.title,
                link: item.link,
                score: item.score,
            }));
        } else {
            return 'No results found.';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return 'An error occurred while fetching data.';
    }
}



module.exports = { fetchApiResults };