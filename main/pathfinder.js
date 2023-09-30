// pathFinder.js
const utils = require("./utils");

const {fetchData, log, delay, password, getCredentials, testProxy, extractTagsAndInfo, saveDataToDatabase} = utils;
const {axios, cheerio, readlineSync, mysql, tunnel, async, fs, chalk} = utils;
const {CONSTS} = utils;

const getMinUniqueID = async () => {
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: password,
        database: "ehentaiData",
    });

    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT MIN(FLOOR(substring_index(substring_index(galleryUrl, '/g/', -1), '/', 1))) AS minId
             FROM PendingGalleryLinks;`,
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0].minId);
                }
                connection.end();
            }
        );
    });
};

const extractGalleryLinksAndNextPage = ($) => {
    const galleryLinks = [];
    let nextPageUrl = null;

    let Navigator = $('option[selected]').attr('value');
    const Navigator2Selector = {
        m: "td.gl3m.glname > a",
        p: "td.gl3m.glname > a",
        l: "td.gl3c.glname > a"
    }
    let selection = Navigator2Selector[Navigator];

    // 提取画廊链接
    $(selection).each((_, element) => {
        const galleryUrl = $(element).attr("href");
        galleryLinks.push(galleryUrl);
    });

    // 获取下一页链接
    const nextPageElement = $("#unext");
    if (!nextPageElement.hasClass("ptds")) { // 确保下一页按钮是活动的
        // 如果下一页按钮可用，则从属性href中提取next值
        const href = nextPageElement.attr("href");
        const nextMatches = href.match(/next=(\d+)/);
        if (nextMatches) {
            nextPageValue = nextMatches[1];
        }
    } else {
        nextPageValue = null;
    }

    currentNextPosition = nextPageValue;

    return {galleryLinks, currentNextPosition};
};

const saveGalleryLinksToDatabase = async (galleryLinks) => {
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: password,
        database: "ehentaiData",
    });

    if (galleryLinks.length === 0) {
        return;
    }

    const placeholders = galleryLinks.map(() => "(?)").join(",");
    const query = `INSERT
    IGNORE INTO PendingGalleryLinks (galleryUrl) VALUES
    ${placeholders};`;

    return new Promise((resolve, reject) => {
        connection.query(query, galleryLinks, (error, results) => {
            if (error) {
                reject(error);
            } else {
                enqueuedCount = galleryLinks.length;
                resolve(results);
            }
            connection.end();
        });
    });
};

// 定义 "Pathfinder" 的函数
/**
 * pathFinder() 根据指定的参数抓取 E-Hentai 或 YOU-KNOW-WHICH 网站的链接，
 * 将这些链接保存到 PendingGalleryLinks 表中。
 * @param currentNextPosition
 * @param endPosition
 * @param {boolean} isYKW
 * 为 true 时，抓取 YOU-KNOW-WHICH 网站；
 * 为 false 时，抓取 E-Hentai 网站。
 * @param userAgent
 * @param cookie
 */
async function pathFinder(currentNextPosition, endPosition, isYKW, userAgent, cookie) {
    "use strict";
    let nextPageValue;
    let enqueuedCount = 0;

    // 根据 isYKW 参数选择目标网站
    const URL = isYKW ? "https://YOU-KNOW-WHICH.org/" : "https://e-hentai.org/";

    // 设置初始查询位置
    const initialNext = currentNextPosition ? currentNextPosition : "";
    let currentPageUrl = isYKW
        ? `https://YOU-KNOW-WHICH.org/?next=${initialNext}&f_srdd=4`
        : `https://e-hentai.org/?next=${initialNext}&f_srdd=4`;
    if (CONSTS.TEST_LEVEL >= 4) {
        log(CONSTS.LOG_LEVELS.DEBUG, `Starting pathFinder for ${currentPageUrl}`);
        log(CONSTS.LOG_LEVELS.DEBUG, `userAgent: ${userAgent} and cookie ${cookie}`);
    } else {
        log(CONSTS.LOG_LEVELS.INFO, `Starting pathFinder for ${currentPageUrl}`);
    }

    // 初始化页面计数器和最大页面数
    let pageCount = 0;

    // 当前页面有效时，抓取链接
    while (currentPageUrl && pageCount < CONSTS.PATHFINDER_MAX_PAGE) {

        // 抓取当前页面内容
        const $ = await fetchData(currentPageUrl, userAgent, cookie);
        log(CONSTS.LOG_LEVELS.DEBUG, `Fetching page with URL: ${currentPageUrl}`);

        // 提取画廊链接和下一页的位置，将画廊链接保存到数据库
        const {galleryLinks, currentNextPosition} = extractGalleryLinksAndNextPage($);
        await saveGalleryLinksToDatabase(galleryLinks);

        // 更新页面计数器和当前位置
        pageCount += 1;
        nextPageValue = currentNextPosition;

        // 根据一定条件，设置新的页面 URL
        if (nextPageValue) {
            currentPageUrl = `${URL}?next=${nextPageValue}`;
            log(CONSTS.LOG_LEVELS.DEBUG, `Processed page ${pageCount} with ${galleryLinks.length} links found. Next page URL: ${currentPageUrl}`);
            if (parseInt(nextPageValue) <= endPosition) {
                break;
            }
        } else {
            currentPageUrl = null;
        }

        // 当前页面抓取完成后，等待指定的时间间隔再抓取下一页
        await delay(CONSTS.DELAY_BETWEEN_PAGES);
    }
}

module.exports = {
    pathFinder,  // 主要功能函数
    getMinUniqueID,
    extractGalleryLinksAndNextPage,
    saveGalleryLinksToDatabase,
};
