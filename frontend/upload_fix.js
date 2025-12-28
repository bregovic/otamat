const ftp = require("basic-ftp");
const path = require("path");

async function uploadFix() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        await client.access({
            host: "372733.w33.wedos.net",
            user: "w372733",
            password: "Starter123!",
            secure: false
        });

        console.log("Connected. Uploading _next folder...");

        // Ensure standard folders exist
        await client.ensureDir("www/otamat/_next");
        await client.ensureDir("www/otamat/_next/static");

        // Upload _next content
        await client.uploadFromDir("out/_next", "www/otamat/_next");

        console.log("Done uploading _next.");
    } catch (err) {
        console.error("Error:", err);
    }
    client.close();
}

uploadFix();
