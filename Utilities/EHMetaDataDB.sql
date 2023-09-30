USE ehentaidata;

CREATE TABLE categories
(
    categoryID   INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    categoryName VARCHAR(255) NOT NULL UNIQUE
);
INSERT INTO categories (categoryName)
VALUES ('Doujinshi'),
       ('Manga'),
       ('Artist CG'),
       ('Game CG'),
       ('Western'),
       ('Non-H'),
       ('Image Set'),
       ('Cosplay'),
       ('Asian Porn'),
       ('Misc'),
       ('Private');

DROP TABLE Doujinshi;
DROP TABLE alterUniqueContent;
DROP TABLE uniqueContent;
CREATE TABLE uniqueContent
(
    contentID  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,

    categoryID INT UNSIGNED NOT NULL,
    FOREIGN KEY (categoryID) REFERENCES categories (categoryID),

    fairName   TEXT         NOT NULL,
    tags       TEXT         NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL
);
CREATE TABLE alterUniqueContent
(
    alterContentID    INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    originalContentID INT UNSIGNED NOT NULL,
    FOREIGN KEY (originalContentID) REFERENCES uniqueContent (contentID),

    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE Doujinshi
(
    DoujinshiID       INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    contentUniqueID   INT UNSIGNED NOT NULL,
    galleryUniqueID   INT UNSIGNED NOT NULL,
    ConventionName    VARCHAR(255),
    GroupName         VARCHAR(255),
    ArtistName        VARCHAR(255),
    fairName          VARCHAR(255) NOT NULL,
    parodyName        VARCHAR(255),
    Language          VARCHAR(255),
    Translators       VARCHAR(255),
    SpecialIndicators VARCHAR(255),
    FOREIGN KEY (contentUniqueID) REFERENCES uniqueContent (contentID)
);
CREATE INDEX contentID_idx ON uniqueContent(contentID);
CREATE INDEX galleryID_idx ON Doujinshi(galleryUniqueID);



CREATE TABLE RawGalleryDetails
(
    URL                  VARCHAR(255) PRIMARY KEY,
    UniqueID             INT UNSIGNED                                                                                                                     NOT NULL,
    AntiSpiderString     VARCHAR(255)                                                                                                                     NOT NULL,

    category             ENUM ('Doujinshi', 'Manga', 'Artist CG', 'Game CG', 'Western', 'Non-H', 'Image Set', 'Cosplay', 'Asian Porn', 'Misc', 'Private') NOT NULL,
    RomanjiTitle         TEXT                                                                                                                             NOT NULL,
    KanjiTitle           TEXT                                                                                                                             NOT NULL,
    publishedTime        TIMESTAMP                                                                                                                        NOT NULL,
    galleryCount         INT UNSIGNED,
    galleryRating        INT UNSIGNED,
    galleryRatingCount   INT UNSIGNED,
    galleryPages         TEXT,

    tagsInClickboard     TEXT                                                                                                                             NOT NULL,
    tagsToDatabaseSystem TEXT                                                                                                                             NOT NULL,

    messageType          VARCHAR(255)                                                                                                                     NOT NULL,

    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT NULL,

    linkedUniqueContent  INT UNSIGNED DEFAULT NULL
);


CREATE TABLE WebPageRequestCredentials
(
    id          INT AUTO_INCREMENT PRIMARY KEY,
    URL         VARCHAR(255) NOT NULL,
    userAgent   VARCHAR(255) NOT NULL,
    cookie      VARCHAR(255) NOT NULL,
    apikey      VARCHAR(255) NOT NULL,
    messageType VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PendingGalleryLinks
(
    id          INT AUTO_INCREMENT PRIMARY KEY,
    galleryUrl  VARCHAR(255)                  NOT NULL UNIQUE,
    galleryType ENUM ('E-HENTAI', 'YOU-KNOW-WHICH') NOT NULL,
    UniqueID    INT UNSIGNED                  NOT NULL,
    isProcessed BOOLEAN   DEFAULT FALSE,
    addedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processedAt TIMESTAMP DEFAULT NULL
);
CREATE TABLE CrawlerProxy
(
    id         INT AUTO_INCREMENT PRIMARY KEY,
    host       VARCHAR(255) NOT NULL,
    port       INT          NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE CrawlerCredential
(
    id         INT AUTO_INCREMENT PRIMARY KEY,
    userAgent  VARCHAR(255) NOT NULL,
    cookie     VARCHAR(255) NOT NULL,
    apikey     VARCHAR(255) NOT NULL,
    is_used    BOOLEAN   DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE CrawlerTask
(
    id              INT AUTO_INCREMENT PRIMARY KEY,
    task_type       ENUM ('ADD_PENDING', 'RESET_PENDING', 'CRAWL')        NOT NULL,
    status          ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    credential_id   INT,
    proxy_id        INT,
    UNIQUE_ID_start INT,
    UNIQUE_ID_end   INT,
    created_at      TIMESTAMP                                                      DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP                                                      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (credential_id) REFERENCES CrawlerCredential (id),
    FOREIGN KEY (proxy_id) REFERENCES CrawlerProxy (id)
);

/*查询*/
SELECT URL,
       RomanjiTitle,
       KanjiTitle,
       publishedTime,
       galleryCount,
       galleryRatingCount,
       tagsInClickboard,
       tagsToDatabaseSystem,
       messageType,
       linkedUniqueContent
FROM RawGalleryDetails
WHERE category = 'Doujinshi';
SELECT *
FROM uniqueContent;
SELECT *
FROM Doujinshi;
SELECT *
FROM WebPageRequestCredentials;
SELECT *
FROM PendingGalleryLinks;
SELECT *
FROM CrawlerCredential;
SELECT *
FROM CrawlerProxy;


set GLOBAL max_connections=256;
show variables like '%max_connections%';

/*删除，工作环境不要删除，所以默认注释，省得你们不小心运行这段sql代码然后来打我
DROP TABLE TagDetails; DROP TABLE WebPageRequestCredentials; DROP TABLE PendingGalleryLinks;*/

/*
ALTER TABLE PendingGalleryLinks
ADD COLUMN UniqueID INT UNSIGNED;
 */


/*
    UPDATE PendingGalleryLinks
    SET galleryType =
          (CASE
             WHEN galleryUrl LIKE 'https://YOU-KNOW-WHICH.org/%' THEN 'YOU-KNOW-WHICH'
             WHEN galleryUrl LIKE 'https://e-hentai.org/%' THEN 'E-HENTAI'
             ELSE NULL
            END);
    UPDATE PendingGalleryLinks
    SET UniqueID = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(galleryUrl, '/', -3), '/', 1) AS UNSIGNED);
 */

SELECT *
FROM (SELECT UniqueID,
             LEAD(UniqueID) OVER (ORDER BY UniqueID DESC)            AS NextUniqueID,
             UniqueID - LEAD(UniqueID) OVER (ORDER BY UniqueID DESC) AS Difference
      FROM PendingGalleryLinks) AS result
ORDER BY Difference DESC, UniqueID DESC
LIMIT 550 OFFSET 0;

select table_schema                            as '数据库',
       table_name                              as '表名',
       table_rows                              as '记录数',
       truncate(data_length / 1024 / 1024, 2)  as '数据容量(MB)',
       truncate(index_length / 1024 / 1024, 2) as '索引容量(MB)'
from information_schema.tables
order by data_length desc, index_length desc;

UPDATE RawGalleryDetails SET linkedUniqueContent = NULL;



SHOW INDEX FROM RawGalleryDetails;
OPTIMIZE TABLE RawGalleryDetails;
OPTIMIZE TABLE uniqueContent;
OPTIMIZE TABLE Doujinshi;


CREATE TABLE `temp_Doujinshi` (
  `DoujinshiID` int unsigned NOT NULL AUTO_INCREMENT,
  `contentUniqueID` int unsigned NOT NULL,
  `galleryUniqueID` int unsigned NOT NULL,
  `ConventionName` varchar(255) DEFAULT NULL,
  `GroupName` varchar(255) DEFAULT NULL,
  `ArtistName` varchar(255) DEFAULT NULL,
  `fairName` varchar(255) NOT NULL,
  `parodyName` varchar(255) DEFAULT NULL,
  `Language` varchar(255) DEFAULT NULL,
  `Translators` varchar(255) DEFAULT NULL,
  `SpecialIndicators` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`DoujinshiID`),
  KEY `contentUniqueID` (`contentUniqueID`),
  CONSTRAINT `doujinshi_ibfk_1` FOREIGN KEY (`contentUniqueID`) REFERENCES `uniqueContent` (`contentID`)
) ENGINE=InnoDB AUTO_INCREMENT=33066 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO temp_Doujinshi
SELECT * FROM Doujinshi;

DROP TABLE Doujinshi;

CREATE TABLE `Doujinshi` (
  `DoujinshiID` int unsigned NOT NULL AUTO_INCREMENT,
  `contentUniqueID` int unsigned NOT NULL,
  `galleryUniqueID` int unsigned NOT NULL,
  `ConventionName` varchar(255) DEFAULT NULL,
  `GroupName` varchar(255) DEFAULT NULL,
  `ArtistName` varchar(255) DEFAULT NULL,
  `fairName` varchar(255) NOT NULL,
  `parodyName` varchar(255) DEFAULT NULL,
  `Language` varchar(255) DEFAULT NULL,
  `Translators` varchar(255) DEFAULT NULL,
  `SpecialIndicators` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`DoujinshiID`),
  KEY `contentUniqueID` (`contentUniqueID`),
  CONSTRAINT `doujinshi_ibfk_1` FOREIGN KEY (`contentUniqueID`) REFERENCES `uniqueContent` (`contentID`)
) ENGINE=InnoDB AUTO_INCREMENT=33066 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO Doujinshi
SELECT * FROM temp_Doujinshi;

DROP TABLE temp_Doujinshi;

ANALYZE TABLE Doujinshi;
