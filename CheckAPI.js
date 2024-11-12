const axios = require('axios');
const vscode = require('vscode');


async function fetchApiResults(fullURLS) {
    const results = new Map();

    for (const [originalUrl, finalUrl] of fullURLS) {
        const apiName = [];
        const cleanUrl = finalUrl.replace(/^f|^'|'$|^`|`$|^"|"$|"/g, '').trim();
        const cleanedUrl = cleanUrl.replace(/^\$|^\$|^'|'$|^"|"$|"/g, '').trim();
        

        const encodedUrl = encodeURI(cleanedUrl);

        try {
            const response = await fetch(encodedUrl); // Fetch data from the final URL
            if(response)
            {
                const data = await response.json();
                if(data.cod == 200 || data.status == "success")
                {
                    const markdownString = new vscode.MarkdownString();
                    markdownString.supportHtml = true; 
                    markdownString.appendMarkdown(`**API Response Details for**: ${encodedUrl}\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-green);">Success/200</span>\n`);
                    markdownString.appendText('\n');
                    results.set(originalUrl, markdownString);
                } else
                {
                    const baseUrl = encodedUrl.split("/")[2];
                    const GoogleResults = await searchGoogle(baseUrl + " " + data.message);
                    const GoogleResults_OfficialDocumentation = await searchGoogle("Search for Official API Documentation for " + baseUrl);
                    const markdownString = new vscode.MarkdownString();
                    markdownString.supportHtml = true; 
                    markdownString.appendMarkdown(`**API Response Details for**: ${encodedUrl}\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-red);">${data.cod}</span>\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**API Name**: ${baseUrl}\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Official API Link**: [Link](${GoogleResults_OfficialDocumentation[0].link})\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Message**: ${data.message}\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Recommended Fix (from ${GoogleResults[0].displayLink})**:\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Title**: ${GoogleResults[0].title}\n`);
                    markdownString.appendText('\n');
                    markdownString.appendMarkdown(`**Link**: [${GoogleResults[0].link}](${GoogleResults[0].link})\n`);
                    
                    results.set(originalUrl, markdownString);
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