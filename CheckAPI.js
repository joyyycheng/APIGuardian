const axios = require('axios');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function fetchApiResults(fullURLS, extractedData, extension) {
    const results = new Map();
    let express = false;
    for (const [originalUrl, finalUrl] of fullURLS) {
        for (let i = 0; i < extractedData.length; i++) {
            for (const [fileName, fileData] of extractedData[i]) {
                for (const [varKey, varValue] of fileData.variables) {
                    if (varValue === originalUrl) {
                        if (extension === "js" && fileData.variables.has("express")) {
                            express = true;
                        }                        
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
                        let optionsParam = undefined;
                        let header = undefined;
                        let field = undefined;
                        if(extension === "js")
                        {
                            if(express == false)
                            {
                                const fetchMatch = /fetch\(([^,]+)(?:,([^)]*))?\)/.exec(callValue);
                                if (fetchMatch) {
                                    optionsParam = fetchMatch[2]?.trim();
                                }
                            } else if(express == true)
                            {

                            }

                        } else if(extension === "py")
                        {
                            const pattern = /,(.*)/s;
                            const fetchMatch = pattern.exec(callValue);
                            if (fetchMatch) {
                                optionsParam = fetchMatch[1]?.trim();
                            }
                        } else if (extension == "php")
                        {
                            if(fileData.variables.has("CURLOPT_HTTPHEADER"))
                            {
                                let headers = fileData.variables.get("CURLOPT_HTTPHEADER").trim();
                                let contentType =  fileData.variables.get(headers);
                                let header1 = contentType.replace(/array\(\s*|\s*\);/g, '').trim();
                                let inputString = header1.replace(/\)$/, '').trim();
                                let cleanString = inputString.replace(/\\\"/g, '').replace(/\r?\n|\r/g, ''); // Clean quotes and newlines
                                let keyValuePairs = cleanString.split(',');

                                // Step 2: Convert to a JSON object
                                header = keyValuePairs.reduce((acc, pair) => {
                                    let [key, value] = pair.split(':').map(item => item.trim().replace(/"/g, ''));  // Remove extra spaces and quotes
                                    acc[key] = value;  // Add to object
                                    return acc;
                                }, {});
                                // let header1 = cleanStr.split(/\s*,\s*/);
                                // header = header1.find(contentType => contentType.includes("Content-Type"));

                                let fields = fileData.variables.get("CURLOPT_POSTFIELDS").trim();
                                let cleanFields = fileData.variables.get(fields)
                                field = cleanFields.replace("<<<DATA", '').replace("\r\nDATA", '').trim();
                            }
                        }
                        

                        // Step 3: Look up values of urlParam and optionsParam in variables
                        const urlVariable =  finalUrl;
                        const optionsVariable = fileData.variables.has(optionsParam) ? fileData.variables.get(optionsParam) : optionsParam;
                        let transformedOptionsString;
                        if(optionsVariable != undefined)
                        {
                            if (optionsVariable.includes('json=') || optionsVariable.includes('data=')) {
                                // Match json= or data= followed by a block of JSON-like data
                                const match = optionsVariable.match(/(json=|data=)(\{[\s\S]*?\})/);
                                if (match) {
                                    const jsonContent = JSON.parse(match[2]); // The JSON content
                                    transformedOptionsString = {
                                        method: "POST",  // HTTP method
                                        headers: {
                                          "Content-Type": "application/json"  // Set the content type to JSON
                                        },
                                        body: JSON.stringify(jsonContent)  // Stringify the data to be sent in the body
                                      };
                                }
                            } else 
                            {
                                let result = optionsVariable
                                .replace(/(\r\n|\r|\n)/g, '')              // Remove any line breaks for easier parsing
                                .replace(/([{,]\s*)(\w+):/g, '$1"$2":')    // Add double quotes around the keys to make it valid JSON
                                .replace(/JSON\.stringify\((.*?)\)/g, (match, p1) => {
                                    const dataVariable = fileData.variables.get(p1.trim());
                                    return JSON.stringify(dataVariable); // Replace with actual data object as JSON
                                });

                                transformedOptionsString = JSON.parse(result);
                            }
                        } else if (header != undefined && field != undefined)
                        {
                            transformedOptionsString = {
                                method: "POST",  // HTTP method
                                headers: header,  // Set the content type to JSON
                                body: field // Stringify the data to be sent in the body
                            };
                        } else if(express == true)
                        {
                            transformedOptionsString = {
                                method: "POST",  // HTTP method
                                headers: {
                                  "Content-Type": "application/json"  // Set the content type to JSON
                                },
                                body: JSON.stringify({})  // Stringify the data to be sent in the body
                              };
                        }
                        

                        // Clean up the URL value for the request
                        const cleanUrl = urlVariable.replace(/^f|^'|'$|^`|`$|^"|"$|^'/g, '').trim();
                        const result = cleanUrl.replace(/^['"`]*/, '').replace(/['"`]*$/, '').trim();
                        const encodedUrl = encodeURI(result);

                        try {
                            let response = '';

                            // Perform GET or POST based on the request type
                            if (requestType === "GET") {
                                response = await fetch(encodedUrl);
                            } else if (requestType === "POST") {
                                // fetchMock.post(encodedUrl, {
                                //     status: 200,
                                //     body: { success: true, message: "Mocked response received!" }
                                // });
                                response = await fetch(encodedUrl, transformedOptionsString);
                            }

                            if (response) {
                                let data;
                                if(express == false)
                                {
                                    data = await response.json();
                                } else if(express == true)
                                {
                                    data = await response.text();
                                }
                                const markdownString = new vscode.MarkdownString();
                                markdownString.supportHtml = true;
                                markdownString.appendMarkdown(`**API Response Details for**: ${encodedUrl}\n\n`);

                                if (data.cod === 200 || data.status === "success" || data.success == "true") {
                                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-green);">Success/200</span>\n\n`);
                                    results.set(originalUrl, {
                                        markdown: markdownString,
                                        url : encodedUrl,
                                        location: fileData.filePath,
                                        status : data.cod || data.status || data.success,
                                        message: data.message,
                                    });
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
                                    vscode.window.showInformationMessage(encodedUrl + " has an error");
                                    results.set(originalUrl, {
                                        markdown: markdownString,
                                        url : encodedUrl,
                                        location: fileData.filePath,
                                        status : data.cod || data.status,
                                        message: data.message,
                                    }
                                    );
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


async function generateReport(results) {
    let tableContent = `
    # API Status Report\n\n
    --------------------------------\n
    `;


    results.forEach(result => {
        const { url, location, message, status} = result[1];
        tableContent += `
        API : ${url}\n
        Location : ${location}\n
        Status : ${status}\n
        Message : ${message}\n
        --------------------------------\n
        `;
    });

    const content = `${tableContent}\n\n**End of Report**`;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = String(now.getFullYear()).slice(-2); // Last two digits of the year
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${day}${month}${year}${hours}${minutes}${seconds}`;

    const filePath = path.join(__dirname, 'reports', `api_status_report_${timestamp}.txt`); // Saves in "reports" folder within the project directory
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Now write the file
    fs.writeFile(filePath, content, (err) => {
        if (err) console.log(err);
        console.log('API Status Report has been saved at ' + filePath);
    });
}


module.exports = { fetchApiResults, generateReport };