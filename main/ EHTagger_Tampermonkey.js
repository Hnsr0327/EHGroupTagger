// ==UserScript==
// @name         EHentai Tagger
// @namespace    https://github.com/Hnsr0327/EHGroupTagger
// @version      0.0.alpha
// @description  no description now
// @author       Hanashiro, GPT-4-0314
// @match        *://exhentai.org/*
// @match        *://e-hentai.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=exhentai.org
// @grant        unsafeWindow
// ==/UserScript==

// 创建名为 ”获取后续tag" 的按钮元素，并且设置元素的特性，将它放在特定位置。
let triple=document.createElement("button");
triple.innerText="获取后续tag";
triple.style.background="#757575";
triple.style.color="#fff";
var parentDiv = document.getElementById('gj').parentNode;
var sp2 = document.getElementById("gj");
parentDiv.insertBefore(triple, sp2);

// 读取多个元素和网页的URL
var doujinshiRomanjiTitle = document.getElementById('gn'); // 罗马字ID
var doujinshiKanjiTitle = document.getElementById('gj'); // 汉字ID
var URL = window.location.href; // 当前URL
var regex = /\/g\/(\d+)\/([a-z0-9]+)\/$/;
var matches = URL.match(regex);
if (matches) {
    var galleryUniqueNumbering = matches[1];
    var antiSpiderString = matches[2];
}

// 打开网页后的自执行函数
(function(){
    'use strict';
    // 网页 Tagging
    var tag = "";
    var tagsArray = [];
    // 获取页面上所有包含高权重标签（100+）的元素（class为”gt”）
    var elements = document.getElementsByClassName('gt');
    // 处理这些元素的ID，以便将其添加到变量tag中。在这个过程中，判断一些特定标签并排除
    var locate = elements[0].id.indexOf(":");
    var elementID = elements[0].id.replace(/_/g, " ").slice(3);
    for(var i = 1; i < elements.length; i++){
        locate = elements[i].id.indexOf(":");
        elementID = elements[i].id.replace(/_/g, " ").slice(3);
        let tagType = elementID.slice(0, locate-3);
        let tagContent = elementID.slice(locate-2);
        if(tag != ""){
            tag = tag + ",";
        }
        if("male" == elementID.slice(0, locate-3) || "female" == elementID.slice(0, locate-3) || "mixed" == elementID.slice(0, locate-3) || "other" == elementID.slice(0, locate-3)){
            //tag = tag + elementID.slice(0, locate-2) + "\"" + elementID.slice(locate-2) + "\"" ;
            tag = tag + elementID ;
            tagsArray.push({type: tagType, content: tagContent});
        }
    }

    // 获取输入框元素，修改占位符文本为”Hanashiro-Extended Tagger”
    var element = document.getElementById("newtagfield");
    //element.removeAttribute('maxLength');
    //element.maxLength = "200";
    element.placeholder = "Hanashiro-Extended Tagger";
    // 将获得的 tag 内容写入剪贴板。
    navigator.clipboard.writeText(tag);
    // 发送到本地的服务器端，服务器端后续将会处理这些。
    fetch("http://localhost:3000/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            URL: URL,
            uniqueNumber: galleryUniqueNumbering,
            antiSpiderString: antiSpiderString,
            doujinshiRomanjiTitle: doujinshiRomanjiTitle.textContent,
            doujinshiKanjiTitle: doujinshiKanjiTitle.textContent,
            tagsToDatabaseSystem: tagsArray,
            tagsInClickboard: tag,
            messageType: "TagDetails"
        }),
    })
        .then((response) => response.json())
        .then((data) => {
        console.log("TagDetails Sent SUCCEED", data);
    })
        .catch((error) => {
        console.error("TagDetails Sent FAILED", error);
    });

    // 按钮添加点击事件处理程序，确保当用户点击按钮时会获取更多的标签内容并写入剪贴板。
    triple.onclick=function(){
        locate = tag.indexOf(",", 180);
        tag = tag.slice(locate+1);
        navigator.clipboard.writeText(tag);
    };
})();

