# EHGroupTagger

EHGroupTagger 是一个解决方案，旨在实现 E-Hentai 网站的自动化 tagging 工作。
通过使用该工具，用户可以汇集同一份同人志的不同 tagging ，自动 upvote 这些 tagging，从而提高标签的准确性和完整性，并减少人工干预。

## 它目前所实现的业务逻辑：
1. 从 E-Hentai 网站获取同人志页面上的高权重标签。
2. 将获取到的标签数据发送到本地服务器进行处理。
3. 汇集同一份同人志中的不同 tagging，并将其自动 upvote。
4. 用户可以手动获取更多的标签，并将它们添加到剪贴板中。

## 以下是可能需要补充的业务逻辑：
1. 将汇集的 tagging 与已有的标签库进行对比，找出缺失或需要更新的标签。
2. 对于需要更新的标签，自动生成新的 tagging，并替换旧的标签。
3. 同步更新的标签和 upvoted 标签到 E-Hentai 网站。
4. 对于新增同人志，自动提取相关信息，如作者、语言、分类等，生成初始 tagging。

## 安装与使用
1. 安装 Node.js 并运行 server.js 以启动本地服务器。
2. 将 EHentai Tagger 和 Exhentai Data Fetcher 用户脚本安装到支持用户脚本的浏览器扩展中（如Tampermonkey）。
3. 浏览 E-Hentai 网站，用户脚本将自动获取、处理标签数据，并与本地服务器进行交互。

## 贡献与反馈
欢迎提交 issue 以帮助我们不断完善 EHGroupTagger。您的反馈对我们非常重要。