const ftp = require("basic-ftp");
const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)
    arrayOfFiles = arrayOfFiles || []

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file))
        }
    })

    return arrayOfFiles
}

async function uploadPayloads() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        await client.access({
            host: "372733.w33.wedos.net",
            user: "w372733",
            password: "Starter123!",
            secure: false
        });

        console.log("Connected. Uploading text payloads...");

        const allFiles = getAllFiles("out", []);

        for (const filePath of allFiles) {
            if (filePath.includes(".txt")) {
                const relativePath = path.relative("out", filePath).replace(/\\/g, "/");
                // The filePath usually starts with "out/", so relative path is cleaner

                const remotePath = "www/otamat/" + relativePath;
                const remoteDir = path.dirname(remotePath);

                try {
                    await client.ensureDir(remoteDir);
                    await client.uploadFrom(filePath, remotePath);
                    console.log(`Uploaded ${relativePath}`);
                } catch (e) {
                    console.error(`Failed ${relativePath}:`, e.message);
                }
            }
        }

        console.log("Done uploading payloads.");
    } catch (err) {
        console.error("Error:", err);
    }
    client.close();
}

uploadPayloads();
