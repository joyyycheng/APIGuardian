# API Guardian
API Guardian is a Visual Studio Code extension designed to scan your project for APIs. Once the APIs are identified, they will be tested, and a report will be generated containing the full API, its file location, status, and a corresponding message. Developers can also hover over the APIs found in their project a pop-up messaage will appear based on the status of your API. This extension currently works for JavaScript, TypeScript, Python, CSharp and PHP. 

This project was created as Postman can be a tedious and long process when testing multiple APIs in your project. This extension can help to simplify and shorten the time taken for manual debugging and testing giving you more time for development. 

## Features
- Scan your project for APIs, below are examples of the type of API we are able to scan
    1. http://api.weatherapi.com/v1/forecast.json?key={apikey}&q={country}&days={number_of_days}
    2. https://www.onemap.gov.sg/api/common/elastic/search?searchVal={country}&returnGeom={address_details}=Y&pageNum={number}
    3. https://eventregistry.org/api/v1/minuteStreamArticles?lang=eng&recentActivityArticlesUpdatesAfterMinsAgo=240&isDuplicateFilter=skipDuplicates&apiKey={api_key}
    
- An Excel report containing this information will be generated and exported to your project.
    1. Number of APIs found in your project
    2. Number of Successfully tested APIs in your project
    3. Number of Failed tested APIs in your project
    4. Full APIs
    5. File Location of where the API was found
    6. Status of the API
    7. Message of the API

- Hover message when the developer mouse over the API found in the project
![](https://github.com/joyyycheng/CAPSTONE/blob/main/media/SuccessMessage.gif)
![](https://github.com/joyyycheng/CAPSTONE/blob/main/media/Failedmessage.gif)



