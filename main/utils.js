// utils.js

const CONSTS = require("./const");
const password = CONSTS.PASSWORD;

const axios = require("axios");
const cheerio = require("cheerio");
const readlineSync = require("readline-sync");
const mysql = require("mysql2");
const tunnel = require("tunnel");
const async = require("async");
const fs = require("fs");
const chalk = require("chalk");// npm i chalk@4.1.2

function log(level, message) {
    if (level <= CONSTS.TEST_LEVEL) {
        let coloredMessage;
        switch (level) {
            case CONSTS.LOG_LEVELS.ERROR:
                coloredMessage = chalk.red(`[${level}] ${message}`);
                break;
            case CONSTS.LOG_LEVELS.WARN:
                coloredMessage = chalk.yellow(`[${level}] ${message}`);
                break;
            case CONSTS.LOG_LEVELS.INFO:
                coloredMessage = chalk.magenta(`[${level}] ${message}`);
                break;
            case CONSTS.LOG_LEVELS.DEBUG:
                coloredMessage = chalk.blue(`[${level}] ${message}`);
                break;
            default:
                coloredMessage = message;
        }
        console.log(coloredMessage);
    }
}

// 延时函数，使用硬底限制和随机范围
async function delay(randomRange) {
    const baseDelay = CONSTS.HARD_MINIMUM_DELAY; // 硬底限制（基础延迟）
    const additionalDelay = Math.floor(randomRange / 2) + Math.floor(Math.random() * randomRange); // 计算随机延时范围
    const delayTime = baseDelay + additionalDelay; // 总延迟时间

    return new Promise(resolve => setTimeout(resolve, delayTime));
}

// 从指定URL获取网页内容。
const fetchData = async (url, userAgent, cookie, proxyHost, proxyPort, returnRaw = false) => {
    let axiosConfig = {
        headers: {
            'User-Agent': userAgent,
            'Cookie': cookie,
        },
        timeout: 10000,
        httpsAgent: tunnel.httpsOverHttp({
            proxy: {
                // host: proxyHost,
                // port: proxyPort,
                host: '127.0.0.1',
                port: 7890,
            },
        })
    };

    const response = await axios.get(url, axiosConfig);
    if (returnRaw) {
        return response;
    } else {
        return cheerio.load(response.data);
    }
};

const getDatabaseConnection = () => {
    return mysql.createConnection({
        host: "localhost",
        user: "root",
        password: password,
        database: "ehentaiData",
    });
};

const deleteProxy = async (id, host, port) => {
    let connection;
    connection = getDatabaseConnection();

    let deleted = false;
    await new Promise((resolve, reject) => {
        connection.query("DELETE FROM CrawlerProxy WHERE id = ?", [id], async (error, results) => {
            if (error) {
                log(CONSTS.LOG_LEVELS.ERROR, `Error deleting proxy ${host}:${port}: ${error.message}`);
                reject(error);
            } else {
                deleted = true;
                log(CONSTS.LOG_LEVELS.WARN, `Deleted invalid proxy: ${host}:${port}`);
                resolve(results);
            }
        });
    });

    connection.end(); // 记得断开数据库连接
    return deleted; // 返回删除状态
};

const testProxy = async (host, port) => {
    try {
        const response = await axios.get('https://jsonip.com', {
            proxy: {
                host: host,
                port: port,
            },
            httpsAgent: new (require('https').Agent)({rejectUnauthorized: false}),
            timeout: 5000, // 设置一个超时时间，例如 5 秒
        });

        if (response.status === 200) {
            log(CONSTS.LOG_LEVELS.DEBUG, `Proxy ${host}:${port} is valid.`);
            return true;
        } else {
            log(CONSTS.LOG_LEVELS.INFO, `Proxy ${host}:${port} is not valid (status code: ${response.status}).`);
            return false;
        }
    } catch (error) {
        log(CONSTS.LOG_LEVELS.WARN, (`Error testing proxy ${host}:${port}, error: ${error.message}`));
        console.log;
        return false;
    }
};

// getLeastUsedValidProxy 函数，暂时忽略
// 更新凭据和代理的 updated_at 字段的 updateTimestamps 函数，暂时忽略。

const getCredentials = async () => {
    log(CONSTS.LOG_LEVELS.DEBUG, `Getting credentials from the database.`);
    let connection = getDatabaseConnection();
    const getOldestCredential = async () => {
        return await new Promise((resolve, reject) => {
            connection.query(
                `SELECT cc.*
                 FROM CrawlerCredential cc
                 ORDER BY cc.updated_at ASC LIMIT 1`,
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                }
            );
        });
    }

    const credential = await getOldestCredential();

    const userAgent = credential.userAgent;
    const cookie = credential.cookie;

    // 记得断开数据库连接
    connection.end();

    return {userAgent, cookie};
};

const extractTagsAndInfo = ($, URL) => {
    const tags = [];
    const elements = $(".gt");

    log(CONSTS.LOG_LEVELS.DEBUG, `Extracting tags and info from URL: ${URL}`);
    for (let i = 0; i < elements.length; i++) {
        const elementID = elements[i].attribs.id.replace(/_/g, " ").slice(3);
        const tagType = elementID.slice(0, elementID.indexOf(":"));
        const tagContent = elementID.slice(elementID.indexOf(":") + 1);
        if (["male", "female", "mixed", "other"].includes(tagType)) {
            tags.push({type: tagType, content: tagContent});
        }
    }

    const romanjiTitle = $("#gn").text();
    const kanjiTitle = $("#gj").text();
    const regex = /\/g\/(\d+)\/([a-z0-9]+)\/$/;
    const matches = URL.match(regex);
    const uniqueID = matches ? matches[1] : "";
    const antiSpiderString = matches ? matches[2] : "";

    return {
        tags,
        romanjiTitle,
        kanjiTitle,
        uniqueID,
        antiSpiderString,
    };
};

const saveDataToDatabase = async (data) => {
    log(CONSTS.LOG_LEVELS.DEBUG, `Saving data to database.`);
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: password,
        database: "ehentaiData",
    });

    // 保存数据到 TagDetails 数据表
    const saveTagDetails = async () => {
        const {
            url,
            uniqueID,
            antiSpiderString,
            romanjiTitle,
            kanjiTitle,
            tags,
        } = data;

        const query = `
            INSERT INTO TagDetails (URL,
                                    UniqueID,
                                    AntiSpiderString,
                                    RomanjiTitle,
                                    KanjiTitle,
                                    tagsInClickboard,
                                    tagsToDatabaseSystem,
                                    messageType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY
            UPDATE
                URL =
            VALUES (URL), UniqueID =
            VALUES (UniqueID), AntiSpiderString =
            VALUES (AntiSpiderString), RomanjiTitle =
            VALUES (RomanjiTitle), KanjiTitle =
            VALUES (KanjiTitle), tagsInClickboard =
            VALUES (tagsInClickboard), tagsToDatabaseSystem =
            VALUES (tagsToDatabaseSystem), messageType =
            VALUES (messageType), updated_at = NOW()`;

        const tagsInClickboard = tags.map(tag => `${tag.type}:${tag.content}`).join(',');

        const tagsToDatabaseSystem = JSON.stringify(tags);

        return new Promise((resolve, reject) => {
            connection.query(
                query,
                [
                    url,
                    uniqueID,
                    antiSpiderString,
                    romanjiTitle,
                    kanjiTitle,
                    tagsInClickboard,
                    tagsToDatabaseSystem,
                    "TagDetails",
                ],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
    };

    try {
        await saveTagDetails();
    } catch (error) {
        console.error("Failed to save data to TagDetails", error);
    } finally {
        connection.end();
    }
};

const taskQueue = async.queue(async (galleryUrl, callback) => {
    try {
        await getGalleryData(galleryUrl);
        processedGalleriesCount++;
        console.log(`Gallery link "${galleryUrl}" processed successfully.`);
        callback(null);   // 成功时执行回调，传递 null 作为 error 参数。
    } catch (err) {
        console.error(`Error processing gallery link "${galleryUrl}":`, err);
        callback(err);   // 失败时执行回调，传递错误信息作为 error 参数。 
    }
}, CONSTS.QUEUE_CONCURRENT_TASKS);

module.exports = {
    CONSTS,
    axios,
    cheerio,
    mysql,
    tunnel,
    readlineSync,
    async,
    fs,
    chalk,
    taskQueue,
    password,
    log,
    delay,
    fetchData,
    getDatabaseConnection,
    getCredentials,
    testProxy,
    extractTagsAndInfo,
    saveDataToDatabase,
}