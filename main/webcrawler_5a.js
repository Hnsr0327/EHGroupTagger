/**
 * webcrawler_5a.js
 *
 * much more cruder version of EHGroupTagger/webcrawler.js
 * created by GPT-4-0314, developed and fullished by Hanashiro(@Hnsr0327)
 * create date 2023-09-13
 */

const CONSTS = require("./const");

const utils = require("./utils");
const {
    fetchData,
    log,
    delay,
    getDatabaseConnection,
    getCredentials,
    testProxy,
    extractTagsAndInfo,
    saveDataToDatabase
} = utils;
const {axios, cheerio, readlineSync, mysql, tunnel, async, fs, chalk} = utils;

const {pathFinder, getMinUniqueID, saveGalleryLinksToDatabase} = require("./pathfinder");
const {crawler, getGalleryData, getPendingGalleryLinks, setGalleryLinkProcessed} = require("./crawler");
const {rewinder} = require('./rewinder');

let processed = 0;
let enqueued = 0;
let currentPosition = null;
let endPosition = null;
let galleryPercentage = 0.0;

async function halfWay() {
    let connection = getDatabaseConnection();
    let halfWayQuery = `SELECT * FROM (SELECT UniqueID, LEAD(UniqueID) OVER (ORDER BY UniqueID DESC) AS NextUniqueID, UniqueID - LEAD(UniqueID) OVER (ORDER BY UniqueID DESC) AS Difference FROM PendingGalleryLinks) AS result ORDER BY Difference DESC, UniqueID DESC LIMIT 1 OFFSET 0;`;

    const result = await new Promise((resolve, reject) => {
        connection.query(halfWayQuery, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0]);
            }
        });
    });
    connection.end();
    const uniqueID = result.UniqueID;
    const nextUniqueID = result.NextUniqueID;
    const average = Math.floor((uniqueID * 100 + nextUniqueID * 0) / 100);

    // 返回 NextUniqueID 和 average
    return {nextUniqueID, average};
}

async function updateDB() {
    let connection = getDatabaseConnection();
    let updateGalleryTypeQuery = `UPDATE PendingGalleryLinks SET galleryType = (CASE WHEN galleryUrl LIKE 'https://YOU-KNOW-WHICH.org/%' THEN 'YOU-KNOW-WHICH' WHEN galleryUrl LIKE 'https://e-hentai.org/%' THEN 'E-HENTAI' ELSE NULL END);`;
    let updateUniqueIDQuery = `UPDATE PendingGalleryLinks SET UniqueID = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(galleryUrl, '/', -3), '/', 1) AS UNSIGNED);`;

    await new Promise((resolve, reject) => {
        connection.query(updateGalleryTypeQuery, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
    await new Promise((resolve, reject) => {
        connection.query(updateUniqueIDQuery, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
    connection.end();
}

async function getProcessedCount() {
    let connection = getDatabaseConnection();
    const result = await new Promise((resolve, reject) => {
        connection.query("SELECT COUNT(*) as count FROM PendingGalleryLinks WHERE isProcessed = 1", (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0].count);
            }
        });
    });
    connection.end();
    return result;
}

async function getEnqueuedCount() {
    let connection = getDatabaseConnection();
    const result = await new Promise((resolve, reject) => {
        connection.query("SELECT COUNT(*) as count FROM PendingGalleryLinks", (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0].count);
            }
        });
    });
    connection.end();
    return result;
}

const startPathFinder = async (currentNextPosition, endPosition, isYKW, userAgent, cookie) => {
    if (CONSTS.TASK_STAGE.pathfinder) {
        await pathFinder(currentNextPosition, endPosition, isYKW, userAgent, cookie);
    }
};

const startRewinder = async () => {
    if (CONSTS.TASK_STAGE.rewinder) {
        await rewinder(); // Reset processed gallery links
    }
};

const startCrawler = async (userAgent, cookie) => {
    if (CONSTS.TASK_STAGE.crawler) {
        await crawler(userAgent, cookie);
    }
};

const main = async () => {
    setInterval(async () => {
        await updateDB();
        enqueued = await getEnqueuedCount();
        processed = await getProcessedCount();
        galleryPercentage = enqueued / CONSTS.TOTAL_GALLERIES * 100;
        log(CONSTS.LOG_LEVELS.INFO, `Processed: ${processed}, Enqueued: ${enqueued}, Position: ${currentPosition}, Gallery Percents: ${galleryPercentage.toFixed(3)} %, Max Gap: ${(currentPosition - endPosition)}`);
    }, CONSTS.LOG_INTERVAL);
    while (true) {
        try {
            if (CONSTS.FIX_ORIGIN_MODE) {
                currentPosition = CONSTS.FIX_START;
                log(CONSTS.LOG_LEVELS.WARN, `FIXED ORIGIN MODE IS ON AT ${currentPosition}`);
            } else {
                const halfWayParameters = await halfWay();
                currentPosition = halfWayParameters.average;
                endPosition = halfWayParameters.nextUniqueID;
            }

            const {userAgent, cookie} = await getCredentials();

            await startPathFinder(currentPosition, endPosition, CONSTS.ENABLE_EX_CRAWL, userAgent, cookie);
            await startRewinder();
            await startCrawler(userAgent, cookie);

            await new Promise(resolve => setTimeout(resolve, CONSTS.RESOLVE_INTERVAL));

        } catch (error) {
            console.error("Error processing tasks:", error);
        }
    }
};

main();

