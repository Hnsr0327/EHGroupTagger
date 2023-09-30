// rewinder.js
const utils = require("./utils");
const log = utils.log;
const password = utils.password;

// 定义 "Rewinder" 的函数
async function rewinder() {
    const resetGalleryLinkStatus = async () => {
        // Connect to DB
        const connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: password,
            database: "ehentaiData",
        });

        // Reset all the link which isProcessed = TRUE and older than 30 days to FALSE isProcessed and NULL processedAt
        const query = `
            UPDATE PendingGalleryLinks
            SET isProcessed = FALSE,
                processedAt = NULL
            WHERE isProcessed = TRUE
              AND processedAt <= NOW() - INTERVAL 30 DAY`;
        return new Promise((resolve, reject) => {
            connection.query(query, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
                connection.end();
            });
        });
    };
    try {
        await resetGalleryLinkStatus();
        log(LOG_LEVELS.INFO, "Processed gallery links older than 30 days have been reset to pending.");
    } catch (error) {
        console.error("Failed to reset processed gallery links older than 30 days:", error);
    }
}

module.exports = rewinder;