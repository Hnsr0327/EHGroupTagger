/*
 该文件 Classifier.js 包含一些 JavaScript 代码，设计用于处理和解析给定的类别数据，然后将其保存到数据库中。
 主要功能包括：合并现有标签、解析罗马字标题、检查数据库中的数据存在性并更新，以及保存解析数据。
*/

// 定义常量和变量
const {parentPort, workerData} = require('worker_threads');
const uniqueIDsResult = workerData.uniqueIDsResult;
const CONSTS = require("./const");
const utils = require("./utils");
const async = require("async");
const {log, getDatabaseConnection} = utils;
const connection = getDatabaseConnection();

const languageList = [
    "Chinese", "English", "Russian", "Korean",
    "French", "German", "Spanish", "Italian", "Portuguese-BR",
    "Vietnamese Tiếng Việt", "Thai ภาษาไทย",
    "Spanish/Español",
];
const specialIndicatorsList = [
    "AI Generated", "Colorized", "Decensored", "Digital",
    "Textless", "Incomplete", "Sample", "Ongoing"
];
const tagExcludedObject = [
    {"type": "reclass", "content": null},               // 画廊在被重分组之前的 tag 仍然有效
    {"type": "language", "content": null},              // 合并的画廊语言可能不同，所以所有和语言相关的都不进行合并
    {"type": "other", "content": null},
    {"type": "female", "content": "low lolicon"},       // 我们不接受“不知道是不是萝莉控”这样的标记
    {"type": "parody", "content": "original"},          // 我们的画廊标注系统不需要关心原生与否
]

/*
mergeTags 函数：
  - 输入：现有标签（existingTags）、抓取到的标签（fetchedTags）、内容 ID（contentID）
  - 功能：合并现有标签和抓取到的标签
  - 输出：处理后的标签数组（mergedTags）
*/
function mergeTags(existingTags, fetchedTags, contentID) {
    const mergedTagsPreprocessed = [...existingTags];
    fetchedTags.forEach((fetchedTag) => {
        const tagExists = mergedTagsPreprocessed.some(
            (existingTag) =>
                existingTag.type === fetchedTag.type &&
                existingTag.content === fetchedTag.content
        );
        if (!tagExists) {
            mergedTagsPreprocessed.push(fetchedTag);
        }
    });
    const mergedTags = mergedTagsPreprocessed.filter((tag) => {
        return !tagExcludedObject.some(
            (excluded) =>
                excluded.type === tag.type &&
                (!excluded.content || excluded.content === tag.content)
        );
    });

    log(CONSTS.LOG_LEVELS.INFO, `old Tags: ${existingTags.map(existingTags => JSON.stringify(existingTags)).join('\n')}`);
    log(CONSTS.LOG_LEVELS.INFO, `new Tags: ${mergedTags.map(mergedTags => JSON.stringify(mergedTags)).join('\n')}`);
    // 将处理过的标签更新到数据库中
    let connection = getDatabaseConnection();
    connection.query(
        `UPDATE uniqueContent
         SET tags = ?
         WHERE contentID = ?`,
        [JSON.stringify(mergedTags), contentID],
        (error) => {
            if (error) {
                console.error('Error updating the uniqueContent tags:', error);
            }
        }
    );
    connection.end();
    return mergedTags;
}

/*
parseRomanjiTitle 函数：
  - 输入：标题（title）
  - 功能：解析罗马字标题，并获得相关信息（例如：conventionName、groupName、artistName 等）
  - 输出：包含解析结果的对象
*/
function parseRomanjiTitle(title) {
    let fairName = title;
    fairName = fairName.replace(/\{.*?\}/g, "").trim();
    log(CONSTS.LOG_LEVELS.DEBUG, `${fairName}`);

    const conventionNameMatch = fairName.match(/^\((.+?)\)[ ]?/);
    let conventionName;
    if (conventionNameMatch) {
        conventionName = conventionNameMatch[1]; // capturing group index is changed to 1
        fairName = fairName.replace(conventionNameMatch ? conventionNameMatch[0] : "", "").trim();
    }
    log(CONSTS.LOG_LEVELS.DEBUG, `${fairName}`);

    const groupNameArtistMatch = fairName.match(/\[.*?\]/);
    let groupName;
    let artistName;
    if (groupNameArtistMatch) {
        const groupArtistString = groupNameArtistMatch[0].slice(1, -1);
        const artistNameMatch = groupArtistString.match(/\(.*?\)/);
        if (artistNameMatch) {
            artistName = artistNameMatch[0].slice(1, -1);
            groupName = groupArtistString.replace(artistNameMatch[0], "").trim();
        } else {
            groupName = groupArtistString;
        }
        fairName = fairName.replace(groupNameArtistMatch ? groupNameArtistMatch[0] : "", "").trim();
    }
    log(CONSTS.LOG_LEVELS.DEBUG, `${fairName}`);

    const parodyNameMatch = fairName.match(/\(.*?\)/);
    let parodyName;
    if (parodyNameMatch) {
        // Extract the parodyName from otherInfo
        parodyName = parodyNameMatch[0].slice(1, -1);
        // Remove the parodyName from fairName
        fairName = fairName.replace(parodyNameMatch[0], "").trim();
    }
    log(CONSTS.LOG_LEVELS.DEBUG, `${fairName}`);

    let language, translators, specialIndicators = [];
    const allBrackets = fairName.match(/\[.*?\]/g);
    if (allBrackets) {
        allBrackets.forEach(part => {
            let content = part.slice(1, -1).trim();
            if (languageList.includes(content)) {
                language = content;
            } else if (specialIndicatorsList.includes(content)) {
                specialIndicators.push(content);
            } else {
                translators = (translators) ? translators + '|' + content : content;
            }
            fairName = fairName.replace(part, "").trim();
        });
    }
    specialIndicators = specialIndicators.join('|');
    log(CONSTS.LOG_LEVELS.DEBUG, `${fairName}`);

    // 正则表达式用于匹配以" | "开头的部分，直到字符串结束
    fairName = fairName.replace(/\| .*$/, '').trim();
    log(CONSTS.LOG_LEVELS.DEBUG, `${fairName}`);

    return {
        conventionName,
        groupName,
        artistName,
        fairName,
        parodyName,
        language,
        translators,
        specialIndicators
    };
}

const checkContentAndDoujinshiExists = (fairName, uniqueID) =>
    new Promise((resolve, reject) => {
        // 使用 JOIN 将 uniqueContent 和 Doujinshi 表连接在一起
        const query = `
            SELECT uc.*, d.galleryUniqueID as doujinshiUniqueID
            FROM uniqueContent uc
                     LEFT JOIN Doujinshi d ON uc.contentID = d.contentUniqueID AND d.galleryUniqueID = ?
            WHERE uc.fairName = ?;
        `;
        connection.query(query, [uniqueID, fairName], (error, results) => {
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


/*
insertIntoUniqueContent 函数：
  - 输入：解析类别内容（parsed），标签数组（tags）和回调函数（callback）
  - 功能：将解析的数据插入到 uniqueContent 数据表
  - 输出：数据插入结果
*/

function insertIntoUniqueContent(parsed, tags) {
    return new Promise((resolve, reject) => {
        const categoryName = parsed.categoryName;
        const fairName = parsed.fairName;
        const tagsInDatabase = JSON.stringify(tags);

        connection.query(`SELECT categoryID
                          FROM categories
                          WHERE categoryName = ?`, [categoryName], (error, results) => {
            if (error) {
                console.error("Error fetching the categoryId:", error);
                reject(error);
                return;
            }

            if (results.length === 0) {
                console.log("No categoryId found for the provided categoryName.");
                reject(new Error("No categoryId found."));
                return;
            }

            const categoryID = results[0].categoryID;
            const insertQuery = `INSERT INTO uniqueContent (categoryID, fairName, tags)
                                 VALUES (?, ?, ?)`;
            const insertValues = [categoryID, fairName, tagsInDatabase];

            connection.query(insertQuery, insertValues, (error, results) => {
                if (error) {
                    console.error("Error inserting data into uniqueContent:", error);
                    reject(error);
                    return;
                }
                resolve(results.insertId);
            });
        });
    });
}

/*
saveParsedDataToDatabase 函数：
  - 输入：内容ID（contentID），解析类别内容（parsed），标签数组（tags）和回调函数（callback）
  - 功能：将解析的数据保存到数据库中
  - 输出：数据操作结果
*/
function saveParsedDataToDatabase(contentID, parsed, tags) {
    return new Promise((resolve, reject) => {
        const galleryUniqueID = parsed.UniqueID;
        const conventionName = parsed.conventionName;
        const groupName = parsed.groupName;
        const artistName = parsed.artistName;
        const fairName = parsed.fairName;
        const parodyName = parsed.parodyName;
        const language = parsed.language;
        const translators = parsed.translators;
        const specialIndicators = parsed.specialIndicators.length > 0 ? parsed.specialIndicators : null;
        connection.query(`INSERT INTO Doujinshi (contentUniqueID, galleryUniqueID, ConventionName, GroupName,
                                                 ArtistName, fairName, parodyName, Language, Translators,
                                                 SpecialIndicators)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [contentID, galleryUniqueID, conventionName, groupName, artistName, fairName, parodyName, language, translators, specialIndicators],
            (error, results) => {
                if (error) {
                    console.error("Error saving parsed data to the database:", error);
                    reject(error);
                } else {
                    resolve(results);
                }
            }
        );
    });
}

function linkRawGalleryDetails(connection, uniqueID, contentID) {
    return new Promise((resolve, reject) => {
        connection.query(
            'UPDATE RawGalleryDetails SET linkedUniqueContent = ? WHERE UniqueID = ?',
            [contentID, uniqueID],
            (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }
        );
    });
}

const getRecord = (connection, uniqueID) =>
    new Promise((resolve, reject) => {
        connection.query('SELECT * FROM RawGalleryDetails WHERE UniqueID = ?', [uniqueID], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0]);
            }
        });
    });

/*
main 函数：
从数据库中获取唯一ID并处理它们。它包括以下步骤：

1. 建立数据库连接。
2. 从数据库的 RawGalleryDetails 表中获取每个 UniqueID 对应的记录。
3. 对每个记录的罗马字标题进行解析，以获取关联信息（如 conventionName、groupName、artistName 等）。
4. 检查获取的数据是否已经存在于 uniqueContent 和 Doujinshi 两个数据库表中。
5. 根据以上检查结果，执行相应操作：
	• 若 uniqueContent 和 Doujinshi 表中均无数据，则插入新记录。
	• 若仅存在唯一内容（uniqueContent）但无相应子项（Doujinshi），则合并标签，并在子项中插入新记录。
	• 若 uniqueContent 和 Doujinshi 表中均已存在数据，则尝试合并标签。
6. 当所有唯一ID处理完成后，关闭数据库连接。
*/
const main = async () => {
    const connection = getDatabaseConnection();
    connection.connect(async () => {
        try {
            for (const uniqueID of uniqueIDsResult) {
                const record = await getRecord(connection, uniqueID);
                const parsedCategoryContent = parseRomanjiTitle(record.RomanjiTitle);
                const fetchedTags = JSON.parse(record.tagsToDatabaseSystem);
                parsedCategoryContent.categoryName = record.category;
                parsedCategoryContent.UniqueID = record.UniqueID;

                let [uniqueContentExists, contentID, doujinshiExists, uniqueContent] =
                    await checkContentAndDoujinshiExists(parsedCategoryContent.fairName, uniqueID);

                if (!uniqueContentExists) {
                    contentID = await insertIntoUniqueContent(parsedCategoryContent, fetchedTags);
                }
                if (!doujinshiExists) {
                    await saveParsedDataToDatabase(contentID, parsedCategoryContent, fetchedTags);
                }
                if (uniqueContentExists) {
                    mergeTags(JSON.parse(uniqueContent.tags), fetchedTags, contentID);
                }
                if (!record.linkedUniqueContent) {
                    await linkRawGalleryDetails(connection, uniqueID, contentID);
                }
            }
        } catch (error) {
            console.error('Error processing uniqueIDs:', error);
        } finally {
            connection.end();
        }
    });
};

main();
