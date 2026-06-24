You can test it out without installing here: http://sparkgroup.aakashgangji.vip/

# Spark Homes Repair Estimator

Welcome to the Spark Homes Repair Estimator project. This is a Progressive Web App (PWA) developed mainly for contractors and repair professionals to easily calculate estimates, attach site photos, and export final reports directly from their mobile devices or laptops.

Please find below the details regarding my approach, the libraries utilized, and the steps to run the project locally.

## Approach

The primary objective was to build a highly responsive app that works perfectly even in offline mode (without active internet connectivity). For the same, I adopted the following architecture:

- **Mobile-First PWA:** I have designed the UI keeping mobile users in mind so it gives a native app-like experience. It also scales perfectly for web/desktop screens.
- **Vanilla JavaScript:** I have intentionally avoided heavy frontend frameworks like React or Angular. By using pure HTML, CSS, and JS, I ensured that the codebase remains lightweight and does not require any complex build processes.
- **Offline Storage:** Since field workers face network issues, I have integrated IndexedDB for storing all the project data, unit line items, and captured photos locally on the user's device.
- **Service Workers:** I have implemented service workers for caching the core assets. Once the app is loaded for the first time, it will continue to work seamlessly offline.

## Libraries Used

I have leveraged a few open-source libraries via CDN to handle specific functionalities:
- **Tailwind CSS:** For rapid UI designing and responsive styling.
- **FontAwesome:** For displaying clean icons across the app.
- **LocalForage:** For handling the IndexedDB offline storage in an optimized way.
- **jsPDF & jsPDF-AutoTable:** For generating the PDF summary reports dynamically on the client side.
- **JSZip:** For compressing the CSVs, PDF, and Photos into a single downloadable ZIP archive.
- **OpenStreetMap API:** Used for the geolocation and address autocomplete feature.

## How to Run it Locally

Kindly follow the below steps to get the app up and running on your local machine.

### For Web App (Laptop/PC)
1. Clone or download this project folder to your local system.
2. Since the app uses Service Workers and external APIs, running it directly by double-clicking `index.html` will cause browser security (CORS) issues. It needs to be hosted on a local web server.
3. If you are using **VS Code**, kindly install the "Live Server" extension, right-click on `index.html` and click on "Open with Live Server".
4. Alternatively, if you have Node.js installed, simply open your terminal in the project folder and run the command: `npx serve .`
5. The application will open in your browser automatically.

### For Mobile App Testing
To test the application on your actual mobile phone:
1. **Quick Offline Test:** You can simply download the GitHub repository as a ZIP file, extract it directly on your mobile phone (using your Files app), and tap on `index.html` to open it in your browser without any server setup.
2. **Network Server Method:** Ensure both your mobile device and your laptop are connected to the same Wi-Fi network. Find your laptop's local IPv4 address (e.g., `192.168.1.15`) and open it in your mobile browser with the correct port (e.g., `http://192.168.1.15:3000`).
3. **Important:** Certain features like the GPS Location Fetcher require a secure HTTPS connection. If you try to access it via a local HTTP IP address or local file, the mobile browser will strictly block the location permission.
4. To test the GPS feature and the "Add to Home Screen" installation properly, it is recommended to either use an online hosted link (like the one provided at the top) or use tunneling tools like **ngrok** (`ngrok http 3000`) to create a secure HTTPS URL for your local server.
