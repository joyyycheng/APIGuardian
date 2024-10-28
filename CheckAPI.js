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
            results.set(originalUrl, encodedUrl + ": " + error.message);
        }
    }

    return results; // Return the results array
}

module.exports = { fetchApiResults };