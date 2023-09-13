#  EHTagger_Tampermonkey(.js)

## conversation 1st
### LLM Model
GPT-4-0314, Temperature = 1.0
### system prompt
仔细阅读“文本”，并且试图和用户就”文本“进行对话，你的第一句话的主旨应该是「阅读完用户提供的”文本“以后，就用户可能的提问进行预先回答。」
### conversation
用户：*EHentaiTagger.js, 一个尚未发布在GitHub上的原始版本*，*server.js*，*访问网页后，终端上显示的内容*

用户：请介绍这个脚本的流程，并告知用户如何URL中提取数字和最后一个字符串。

助手：这个脚本的流程如下：
1. 创建一个名为“获取后续tag”的按钮，并将其插入到特定位置。
2. 读取网页上的一些元素和URL。
3. 自动执行函数，在页面加载完成后：
* a. 获取页面上的高权重标签（100+）（类名为“gt”的元素）。
* b. 处理这些元素的ID，将其添加到变量tag中，并排除某些特定标签。
* c. 修改输入框占位符文本为 “Hanashiro-Extended Tagger”。
* d. 将获得的tag内容写入到剪贴板。
* e. 发送数据到本地服务器，服务器端将会处理这些数据。
* f. 为按钮添加点击事件处理程序，确保用户点击按钮时会获取更多的标签内容并写入剪贴板。
4. 最后，提供一个简单的服务器代码（server.js）来接收发送到本地服务器的数据。

关于从URL中提取数字和最后一个字符串，您可以使用正则表达式。在脚本中的URL获取部分，可以使用以下方法：

*代码*，这段代码中，正则表达式 /\/g\/(\d+)\/([a-z0-9]+)\/$/ 用于匹配URL中的数字和最后一个字符串。匹配到的内容会存储在数组 matches 中，其中 matches[1] 是数字，matches[2] 是最后一个字符串。然后可以在代码中继续使用这两个值。

用户：我决定每次单独传一条数据库操作语句，数据库，比如说就用SQL吧，请给一个简单的使用SQL语句的示例。

助手：如果您想使用Node.js和SQL（比如SQLite或MySQL）数据库来存储数据，您可以使用以下示例。这个示例将使用SQLite作为数据库，您可以轻松地将其更改为其他数据库。首先，确保已经安装了sqlite3模块，如果没有，请运行以下命令进行安装：

```npm install sqlite3```

然后，根据收到的数据创建一个简单的表结构，例如：

```
CREATE TABLE IF NOT EXISTS doujinshi_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    romanji_title TEXT,
    kanji_title TEXT,
    tag_type TEXT,
    tag_content TEXT
);
```

以下是使用SQLite进行操作的示例：

```
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = 3000;

// 打开数据库连接
const db = new sqlite3.Database(":memory:", (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to the in-memory SQLite database.");
});

// 创建表
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS doujinshi_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            romanji_title TEXT,
            kanji_title TEXT,
            tag_type TEXT,
            tag_content TEXT
          );`);
});

app.use(cors());
app.use(express.json());

app.post("/save-data", (req, res) => {
  console.log("Data received: ", req.body);

  // 插入数据
  for (let tag of req.body.tagsToDatabaseSystem) {
    db.run(`INSERT INTO doujinshi_data (url, romanji_title, kanji_title, tag_type, tag_content) VALUES (?, ?, ?, ?, ?)`, [
      req.body.URL,
      req.body.doujinshiRomanjiTitle,
      req.body.doujinshiKanjiTitle,
      tag.type,
      tag.content,
    ]);
  }

  res.send({ status: "success" });
});

// 在程序结束时关闭数据库连接
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Closed the database connection.");
  });
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
```

在这个示例中，我们创建了一个SQLite数据库，并在其中创建了一个名为doujinshi_data的表。然后，我们将接收到的数据插入到该表格中。您可以按照MySQL或其他数据库的语法轻松地更改此示例。

用户：就目前的状况，请你为这个数据表写一个简单的使用文档。

助手：*一个douginshi_data的使用文档。*

用户：众所周知，Tampermonkey 只能对已经打开的网页进行处理，如果我想基于这个业务逻辑，输入一个URL，输出值得被存储到数据表中的数据，我应该怎么做？

助手：要在Node.js中输入一个URL并获取其HTML内容，你可以使用axios库（发送HTTP请求）和cheerio库（解析HTML并执行jQuery风格的操作）。首先，确保已经安装了这两个库，如果没有，请运行以下命令进行安装：

```npm install axios cheerio```

然后，根据您的需求，使用以下示例来创建一个简单的Node.js脚本。这个示例脚本将访问给定的URL，并解析其HTML内容以获取所需的数据：

```
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAndExtractDataFromURL(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const doujinshiRomanjiTitle = $('#gn').text(); // 罗马字ID
        const doujinshiKanjiTitle = $('#gj').text(); // 汉字ID

        const tagsArray = [];
        const elements = $('.gt');
        for (let i = 0; i < elements.length; i++) {
            const elementID = $(elements[i]).attr('id').replace(/_/g, ' ').slice(3);
            const locate = elementID.indexOf(':');

            const tagType = elementID.slice(0, locate - 3);
            const tagContent = elementID.slice(locate - 2);
            if (
                ['male', 'female', 'mixed', 'other'].includes(tagType)
            ) {
                tagsArray.push({ type: tagType, content: tagContent });
            }
        }

        // 输出获取到的值或将其存储到数据库
        console.log('Doujinshi Romanji Title:', doujinshiRomanjiTitle);
        console.log('Doujinshi Kanji Title:', doujinshiKanjiTitle);
        console.log('Tags:', tagsArray);
    } catch (error) {
        console.error('Error fetching URL:', error);
    }
}

const url = 'https://exhentai.org/g/xxxxxxx/xxxxxxxxxx/'; // 更换为您想访问的URL
fetchAndExtractDataFromURL(url);
```

这个脚本将发送一个HTTP GET请求以访问提供的URL，并将响应解析为HTML。然后，它使用cheerio库提取所需的数据（罗马字标题，汉字标题和标签数组）并将它们打印到控制台。您可以将这些值存储到数据库中，如前面的示例所示。

请确保将示例URL替换为您要抓取的实际网址。记住，频繁爬取同一网站可能会导致您的IP被封禁。在实际操作中，请确保遵守网站的robots.txt规则并限制请求的频率。

用户：但是，众所周知，exhentai.org具有相当严苛的管理限制，我需要一个给定的token和一系列正确的运行环境才能进行访问，我将确保我运行程序的时候遵循目标网站的爬取规则和频率限制。请告诉我如何使用您提供的工具进行 exhentai.org 的网页访问。

助手：要克服访问exhentai.org所需的限制，您需要在HTTP请求中设置一些自定义头。特别是，您需要携带”Cookie”，其中包含您的访问凭据，以及其他一些典型的请求头。阅读exhentai.org文档，了解如何正确设置头。但请注意，分享您的私人访问凭据可能导致您的账户面临安全风险。要在axios中发送带有自定义头的请求，您可以按如下方式修改上一示例中的axios.get:

```
const headers = {
    'Cookie': 'ipb_member_id=YOUR_IPB_MEMBER_ID; ipb_pass_hash=YOUR_IPB_PASS_HASH',
    'User-Agent': '[REDACTED]',
    'Referer': 'https://exhentai.org/',
};

const response = await axios.get(url, { headers });
```

请将YOUR_IPB_MEMBER_ID和YOUR_IPB_PASS_HASH替换为您实际的访问凭据，这些凭据可以从您在exhentai.org登录时获取到的Cookie中提取。为避免滥用，建议您进行适当的频率限制，并遵守目标站点的爬虫规则。要确保您遵循网站的所有规则和限制在访问exhentai.org时，请仔细阅读该网站的相关文档。这里仅提供一个例子，实际情况可能需要根据您的需求进行调整。

用户：我现在正在访问某个Exhentai.org的具体页面，我现在需要能够获取我这个浏览器的运行环境数据，然后我打算通过 Tampermonkey 脚本将我的请求头、访问凭据等数据传送到本地数据库，接下来通过运行程序来适度的访问网页（同样的，我将确保我运行程序的时候遵循目标网站的爬取规则和频率限制），请告诉我如何使用 Tampermonkey 脚本来实现这一点。

助手：要使用Tampermonkey脚本从浏览器中获取请求头和访问凭据等信息，您可以使用以下方案。此示例脚本收集必要的数据并将其发送到本地服务器：

*EH_UserFetcher.js 0.1.stable 版本*

此脚本使用GM_xmlhttpRequest函数向您的本地服务器发送收集到的数据。请确保将@match指令设置为适用于exhentai.org的适当规则。

现在，您已经使用Tampermonkey脚本获取了浏览器的运行环境数据。接下来，使用我们之前提供的Node.js程序，收集这些数据并在服务器端存储这些数据，之后，您可以使用这些数据通过Node.js服务器代理运行更新后的axios请求，以获取exhentai.org页面。在更改axios.get调用时，请确保包含从fetchData收到的请求头，访问凭据等信息。

以下是一个简化示例：

```
const headers = {
    'Cookie': fetchedData.cookie,
    'User-Agent': fetchedData.userAgent,
    'Referer': fetchedData.url,
};

const response = await axios.get(fetchedData.url, { headers });
```

请注意，任何涉及提取、存储和使用个人凭据的操作都有一定的安全风险。要保护这些信息，请确保采取所有必要的安全措施。

用户：*提供了一个终端输出结果：*
```
Data received:  {
  url: 'https://exhentai.org/g/[REDACTED]/[REDACTED]/‘,
  userAgent: '[REDACTED]',
  cookie: 'ipb_member_id=[REDACTED]; ipb_pass_hash=[REDACTED]; igneous=[REDACTED]; sk=[REDACTED]; star=[REDACTED]; hath_perks=[REDACTED]-[REDACTED]'
}
```

助手：现在你已经成功地从Tampermonkey脚本中获取了url、userAgent和cookie。接下来，你可以将这些信息存储到本地数据库中，然后在之前提供的Node.js示例中使用它们。以下是如何将这些信息用于axios的示例：

```
const url = fetchedData.url;
const headers = {
    'Cookie': fetchedData.cookie,
    'User-Agent': fetchedData.userAgent,
    'Referer': fetchedData.url,
};

const response = await axios.get(url, { headers });
```

有了这些信息，您现在可以使用axios库进行带有正确请求头和访问凭据的网页访问。请确保在访问过程中遵循网站的爬取规则和频率限制，尊重网站的使用规定。

请注意，提交和存储个人访问凭据（用户名和密码）可能导致安全风险。在处理这些数据时要格外小心，确保采取适当的安全措施以保护数据和私人信息。