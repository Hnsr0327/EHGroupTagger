const CONSTS = require("./const");
const utils = require("./utils");
const async = require("async");
const {log, getDatabaseConnection} = utils;
const connection = getDatabaseConnection();

const simpleTypesMap = {
    artist: 'a',
    character: 'c',
    cosplayer: 'cos',
    female: 'f',
    group: 'g',
    language: 'l',
    male: 'm',
    mixed: 'x',
    other: 'o',
    parody: 'p',
    reclass: 'r'
};

function splitTags(tagsString, maxLength = 200) {
    const tagsArray = tagsString.split(',');
    const groupOne = [];
    const groupTwo = [];

    const groupOneTypes = ['a', 'c', 'g', 'p', 'l'];

    for (const tag of tagsArray) {
        const tagType = tag.split(':')[0];
        if (groupOneTypes.includes(tagType)) {
            groupOne.push(tag);
        } else {
            groupTwo.push(tag);
        }
    }

    const splitGroup = (group) => {
        const splitTags = [];
        let currentTags = '';

        for (const tag of group) {
            if (currentTags.length + tag.length + 1 > maxLength) {
                splitTags.push(currentTags);
                currentTags = tag;
            } else {
                currentTags += (currentTags ? ',' : '') + tag;
            }
        }

        if (currentTags) {
            splitTags.push(currentTags);
        }

        return splitTags.join('\n');
    };

    return [splitGroup(groupOne), splitGroup(groupTwo)];
}

const checkContentAndDoujinshiExists = (fairName, uniqueID) =>
    new Promise((resolve, reject) => {
        // 使用 JOIN 将 uniqueContent 和 Doujinshi 表连接在一起
        let query;
        let queryParams;
        if (uniqueID) {
            query = `
                SELECT uc.*, d.galleryUniqueID as doujinshiUniqueID
                FROM uniqueContent uc
                         LEFT JOIN Doujinshi d ON uc.contentID = d.contentUniqueID AND d.contentUniqueID = ?
                WHERE d.contentUniqueID = ?;
            `;
            queryParams = [uniqueID, uniqueID];
        } else {
            query = `
                SELECT uc.*, d.galleryUniqueID as doujinshiUniqueID
                FROM uniqueContent uc
                         LEFT JOIN Doujinshi d ON uc.contentID = d.contentUniqueID AND d.galleryUniqueID = ?
                WHERE uc.fairName = ?;
            `;
            queryParams = [uniqueID, fairName];
        }

        connection.query(query, queryParams, (error, results) => {
            if (error) {
                reject(error);
            } else {
                const uniqueContentExists = results.length > 0;
                const doujinshiExists = uniqueContentExists && !!results[0]?.doujinshiUniqueID;
                const contentID = uniqueContentExists ? results[0]?.contentID : null;
                resolve([uniqueContentExists, contentID, doujinshiExists, results[0]]);
            }
        });
    });
function formatTags(tags) {
    return tags
        .map((tag) => `${simpleTypesMap[tag.type] || tag.type}:${tag.content}`)
        .join(',');
}


function encodeSearchString(searchString) {
    return encodeURIComponent(searchString).replace(/'/g, '%27');
}

async function getDataByFairName(fairName) {
    // 使用 checkContentAndDoujinshiExists 函数从 uniqueContent 获取数据
    const [uniqueContentExists, contentID, doujinshiExists, uniqueContent] = await checkContentAndDoujinshiExists(
        fairName,
        null // uniqueID 参数在此场景下不需要，可以传递 null
    );

    if (uniqueContentExists) {
        // 处理 uniqueContent 数据，例如提取标签
        const tags = JSON.parse(uniqueContent.tags);
        const tagsString = formatTags(tags);
        const [groupOneTags, groupTwoTags] = splitTags(tagsString);
        console.log(groupOneTags);
        console.log(groupTwoTags);
        const searchUrl = `https://e-hentai.org/?f_search=${encodeSearchString(fairName)}`;
        console.log(searchUrl);

    } else {
        console.log('No data found for the given fairName');
    }
}


async function getDataByUniqueID(uniqueID) {
    // 使用 checkContentAndDoujinshiExists 函数从 uniqueContent 获取数据
    const [uniqueContentExists, contentID, doujinshiExists, uniqueContent] = await checkContentAndDoujinshiExists(
        null,
        uniqueID
    );

    if (uniqueContentExists) {
        // 处理 uniqueContent 数据，例如提取标签
        const tags = JSON.parse(uniqueContent.tags);
        const tagsString = formatTags(tags);
        const [groupOneTags, groupTwoTags] = splitTags(tagsString);
        console.log(groupOneTags);
        console.log(groupTwoTags);
        const searchUrl = `https://e-hentai.org/?f_search=${encodeSearchString(uniqueContent.fairName)}`;
        console.log(searchUrl);
        // ...其他处理逻辑
    } else {
        console.log('No data found for the given UniqueID');
    }
}

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let uniqueID = 666;

function prompt() {
    rl.question('按下回车键查询下一个UniqueID: ', async () => {
        await getDataByUniqueID(uniqueID);
        uniqueID++; // 增加uniqueID以查询下一个
        prompt(); // 重新提示用户按下回车键
    });
}

prompt(); // 开始提示用户按下回车键




