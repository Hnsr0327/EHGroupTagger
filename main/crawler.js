// crawler.js
const utils = require("./utils");
const fetchData = utils.fetchData;
const taskQueue = utils.taskQueue;
const QUEUE_CONCURRENT_TASKS = 1; // 如果需要，修改异步队列的并发任务数量
const password = utils.password;

const getGalleryData = async (galleryUrl) => {
    try {
        // 从数据库获取用户代理和cookie
        const {userAgent, cookie} = await getCredentials();

        // 爬取画廊页面内容
        const $ = await fetchData(galleryUrl, userAgent, cookie);

        // 解析页面内容并提取需要的数据
        const extractedData = extractTagsAndInfo($, galleryUrl);

        // 将数据保存到数据库
        await saveDataToDatabase({...extractedData, url: galleryUrl});
    } catch (error) {
        console.error(`Error processing gallery link "${galleryUrl}":`, error);
    }
};

const getPendingGalleryLinks = async () => {
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: password,
        database: "ehentaiData",
    });

    return new Promise((resolve, reject) => {
        connection.query(
            "SELECT galleryUrl FROM PendingGalleryLinks WHERE isProcessed = FALSE",
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.map((row) => row.galleryUrl));
                }
                connection.end();
            }
        );
    });
};

const setGalleryLinkProcessed = async (galleryUrl) => {
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: password,
        database: "ehentaiData",
    });

    return new Promise((resolve, reject) => {
        connection.query(
            "UPDATE PendingGalleryLinks SET isProcessed = TRUE, processedAt = NOW() WHERE galleryUrl = ?",
            [galleryUrl],
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
                connection.end();
            }
        );
    });
};

// 定义 "Graber" 的函数
async function crawler(userAgent, cookie) {
    const taskQueue = async.queue(async function (galleryUrl, callback) {
        try {
            await getGalleryData(galleryUrl);
            processedGalleriesCount++;
        } catch (err) {
            console.error(`Error processing gallery link "${galleryUrl}":`, err);
        }
        await setGalleryLinkProcessed(galleryUrl);
        callback();
    });

    const pendingGalleryLinks = await getPendingGalleryLinks();

    pendingGalleryLinks.forEach((galleryUrl) => {
        taskQueue.push(galleryUrl);
    });

    await taskQueue.drain();
}

module.exports = {
    crawler,  // 主要功能函数
    getGalleryData,
    getPendingGalleryLinks,
    setGalleryLinkProcessed,
};
