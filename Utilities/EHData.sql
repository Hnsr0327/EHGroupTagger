USE exhentaidata;

CREATE TABLE TagDetails (
  URL VARCHAR(255) PRIMARY KEY,
  UniqueID VARCHAR(255) NOT NULL,
  AntiSpiderString VARCHAR(255) NOT NULL,
  RomanjiTitle TEXT NOT NULL,
  KanjiTitle TEXT NOT NULL,
  tagsInClickboard TEXT NOT NULL,
  messageType VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE WebPageRequestCredentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  URL VARCHAR(255) NOT NULL,
  userAgent VARCHAR(255) NOT NULL,
  cookie VARCHAR(255) NOT NULL,
  apikey VARCHAR(255) NOT NULL,
  messageType VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*查询*/
SELECT * FROM TagDetails; SELECT * FROM WebPageRequestCredentials;

/*删除，工作环境不要删除，所以默认注释，省得你们不小心运行这段sql代码然后来打我
DROP TABLE TagDetails; DROP TABLE WebPageRequestCredentials;*/