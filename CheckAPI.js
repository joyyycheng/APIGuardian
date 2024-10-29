const axios = require('axios');

async function fetchApiResults(fullURLS) {
    const results = new Map();

    for (const [originalUrl, finalUrl] of fullURLS) {
        const apiName = [];
        const cleanUrl = finalUrl.replace(/^f|^'|'$|^`|`$|^"|"$|"/g, '').trim();
        const cleanedUrl = cleanUrl.replace(/^'|'$|^"|"$|"/g, '').trim();

        const encodedUrl = encodeURI(cleanedUrl);

        try {
            console.log(encodedUrl);
            const response = await fetch(encodedUrl); // Fetch data from the final URL
            if(response)
            {
                const data = await response.json();
                if(data.cod == 200)
                {
                    const resultString = `${encodedUrl}  \nStatus: ${data.cod}`;
                    results.set(originalUrl, resultString);
                } else
                {
                    const baseUrl = encodedUrl.split("/")[2];
                    const GoogleResults = await searchGoogle(baseUrl + " " + data.message);
                    const resultString = `${encodedUrl}  \nStatus: ${data.cod}  \nMessage: ${data.message}  \nRecommended Fix from: ${GoogleResults[0].displayLink}  \nTitle: ${GoogleResults[0].title}  \nLink: ${GoogleResults[0].link}`;
                    results.set(originalUrl, resultString);
                }
                
            }
        } catch (error) {
            // searchGoogle(encodedUrl + ": " + error.message).then(results => {
            //     console.log("google: ", results);
            // });
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
        
        console.log("Stackoverflow:", data);
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

async function searchGoogle(query) {
    const apiKey = 'AIzaSyD58BpSABrGS3CxTTvi_swiBPVN41A5zS8'; // Replace with your Google API key
    const searchEngineId = 'b4f6477f271ff4970'; // Replace with your Custom Search Engine ID
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;

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
                displayLink: item.displayLink,
                title: item.title,
                link: item.link,
                snippet: item.snippet,
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