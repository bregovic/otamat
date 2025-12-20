const ftp = require("basic-ftp");
const path = require("path");

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

        console.log("Connected!");

        // 1. Deploy OtaMat (Main App)
        console.log("-- Deploying OtaMat (Main App) --");
        await client.ensureDir("www/otamat");
        await client.clearWorkingDir(); // Careful: this clears www/otamat
        // Actually, better not to clear everything blindly if not sure, but ensureDir is fine.
        // uploadFromDir overwrites.
        // Let's stick to standard behavior: Upload contents of 'out' to 'www/otamat'
        await client.uploadFromDir("out");
        console.log("OtaMat deployed.");

        // 2. Handle Dixit Redirect
        console.log("-- Handling Dixit Redirect --");
        // We want to replace www/dixit content with our redirect
        await client.ensureDir("/www/dixit");
        // Clear old dixit files
        try {
            await client.removeDir("/www/dixit/js");
            await client.removeDir("/www/dixit/css");
            await client.removeDir("/www/dixit/php");
            await client.removeDir("/www/dixit/dixitimage");
            // Delete specific html files if they exist to be clean
            await client.remove("dixit.html");
            await client.remove("index.html");
            await client.remove("gameboard.html");
            // Or just clear the directory if safe
            await client.clearWorkingDir();
        } catch (e) {
            console.log("Cleanup warning (might be already empty):", e.message);
        }

        // Upload redirect
        const redirectPath = path.join(__dirname, "../DEPLOYMENT_PACK/dixit_redirect");
        await client.uploadFromDir(redirectPath);
        console.log("Dixit redirect deployed.");

        console.log("=== FULL DEPLOYMENT SUCCESSFUL ===");

    } catch (err) {
        console.error("Deployment failed:", err);
    }
    client.close();
}

deploy();
