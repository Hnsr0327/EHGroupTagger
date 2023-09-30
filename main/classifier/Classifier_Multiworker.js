/*
 Classifier_Multiworker.js
*/
const {Worker} = require('worker_threads');
const path = require('path');
const utils = require("./utils");
const workerPath = path.join(__dirname, 'Classifier.js');
const {log, getDatabaseConnection} = utils;

function chunkArray(arr, chunkSize) {
    let chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
}

function runWorker(workerPath, workerData) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, {workerData: workerData});
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

const main = async () => {
    const connection = getDatabaseConnection();
    connection.connect(async (error) => {
        try {
            // 获取 uniqueIDsResult
            const uniqueIDsResult = await new Promise((resolve, reject) => {
                connection.query("SELECT UniqueID FROM RawGalleryDetails WHERE category = 'Doujinshi' and linkedUniqueContent IS NULL",
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results.map((row) => row.UniqueID));
                        }
                    });
            });
            const chunkSize = Math.ceil(uniqueIDsResult.length / 8);
            const chunks = chunkArray(uniqueIDsResult, chunkSize);
            // 使用 Promise.all() 和 Array.map() 并行处理每个 chunk
            const results = await Promise.all(
                chunks.map((chunk) => runWorker(workerPath, {uniqueIDsResult: chunk}))
            );
        } catch (error) {
            console.error("Error processing data using workers:", error);
        }
    });
};

main();