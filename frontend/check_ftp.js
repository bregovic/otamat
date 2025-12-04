const ftp = require("basic-ftp");

async function check() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        await client.access({
            host: "372733.w33.wedos.net",
            user: "w372733",
            password: "Starter123!",
            secure: false
        });

        console.log("Connected to FTP");

        console.log("Listing www/otamat/admin/host:");
        const list = await client.list("www/otamat/admin/host");
        console.log(list);

        console.log("Listing www/otamat/_next/static/css:");
        const cssList = await client.list("www/otamat/_next/static/css");
        console.log(cssList);

    } catch (err) {
        console.error("Check failed:", err);
    }
    client.close();
}

check();
