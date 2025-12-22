const ftp = require("basic-ftp");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log("Connecting to FTP...");
        await client.access({
            host: "372733.w33.wedos.net",
            user: "w372733",
            password: "Starter123!",
            secure: false
        });

        console.log("Connected! cleaning /www/otamat/dixit...");
        await client.ensureDir("/www/otamat/dixit");
        // Optional: clear directory to remove old files
        await client.clearWorkingDir();

        console.log("Uploading out/dixit to /www/otamat/dixit...");
        await client.uploadFromDir("out/dixit");

        console.log("Uploading out/_next to /www/otamat/_next (Assets)...");
        await client.ensureDir("/www/otamat/_next");
        await client.uploadFromDir("out/_next");

        console.log("Done!");
    } catch (err) {
        console.error("Deploy failed:", err);
    }
    client.close();
}

deploy();
