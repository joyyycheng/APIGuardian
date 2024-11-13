const axios = require('axios');
const vscode = require('vscode');


async function fetchApiResults(fullURLS, extractedData) {
    const results = new Map();

    for (const [originalUrl, finalUrl] of fullURLS) {
        for (let i = 0; i < extractedData.length; i++) {
            for (const [fileName, fileData] of extractedData[i]) {
                for (const [varKey, varValue] of fileData.variables) {
                    if (varValue === originalUrl) {

                        let requestType = '';
                        for (const [typeKey, typeValue] of fileData.type) {
                            if (typeKey === varKey) {
                                requestType = typeValue;
                                break;
                            }
                        }

                        let callValue = '';
                        for (const [callKey, callValueCandidate] of fileData.calls) {
                            if (callKey === varKey) {
                                callValue = callValueCandidate;
                                break;
                            }
                        }

                        // Step 2: Parse callValue to find fetch parameters (url and options)
                        let urlParam = '';
                        let optionsParam = '';
                        const fetchMatch = /fetch\(([^,]+)(?:,([^)]*))?\)/.exec(callValue);
                        if (fetchMatch) {
                            optionsParam = fetchMatch[2]?.trim();
                        }

                        // Step 3: Look up values of urlParam and optionsParam in variables
                        const urlVariable =  finalUrl;
                        const optionsVariable = optionsParam ? fileData.variables.get(optionsParam) : undefined;
                        let transformedOptionsString = '';
                        if(optionsVariable != undefined)
                        {
                            transformedOptionsString = optionsVariable
                            .replace(/(\r\n|\r|\n)/g, '')              // Remove any line breaks for easier parsing
                            .replace(/([{,]\s*)(\w+):/g, '$1"$2":')    // Add double quotes around the keys to make it valid JSON
                            .replace(/JSON\.stringify\((.*?)\)/g, (match, p1) => {
                                const dataVariable = fileData.variables.get(p1.trim());
                                return JSON.stringify(dataVariable); // Replace with actual data object as JSON
                            });
                        }
                        

                        // Clean up the URL value for the request
                        const cleanUrl = urlVariable.replace(/^f|^'|'$|^`|`$|^"|"$|"/g, '').trim();
                        const encodedUrl = encodeURI(cleanUrl);

                        try {
                            let response = '';

                            // Perform GET or POST based on the request type
                            if (requestType === "GET") {
                                response = await fetch(encodedUrl);
                            } else if (requestType === "POST") {
                                const options = JSON.parse(transformedOptionsString);
                                response = await fetch(encodedUrl, options);
                            }

                            if (response) {
                                const data = await response.json();
                                const markdownString = new vscode.MarkdownString();
                                markdownString.supportHtml = true;
                                markdownString.appendMarkdown(`**API Response Details for**: ${encodedUrl}\n\n`);

                                if (data.cod === 200 || data.status === "success" || data.success == "true") {
                                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-green);">Success/200</span>\n\n`);
                                    results.set(originalUrl, markdownString);
                                } else {
                                    const baseUrl = encodedUrl.split("/")[2];
                                    const GoogleResults = await searchGoogle(baseUrl + " " + data.message);
                                    const GoogleResults_OfficialDocumentation = await searchGoogle("Search for Official API Documentation for " + baseUrl);
                                    
                                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-red);">${data.cod}</span>\n\n`);
                                    markdownString.appendMarkdown(`**API Name**: ${baseUrl}\n\n`);
                                    markdownString.appendMarkdown(`**Official API Link**: [Link](${GoogleResults_OfficialDocumentation[0].link})\n\n`);
                                    markdownString.appendMarkdown(`**Message**: ${data.message}\n\n`);
                                    markdownString.appendMarkdown(`**Recommended Fix (from ${GoogleResults[0].displayLink})**:\n\n`);
                                    markdownString.appendMarkdown(`**Title**: ${GoogleResults[0].title}\n\n`);
                                    markdownString.appendMarkdown(`**Link**: [${GoogleResults[0].link}](${GoogleResults[0].link})\n\n`);
                                    
                                    results.set(originalUrl, markdownString);
                                }
                            }
                        } catch (error) {
                            console.error("Fetch error:", error.message);
                            results.set(originalUrl, encodedUrl + ": " + error.message);
                        }
                    }
                }
            }
        }
    }

    return results;
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