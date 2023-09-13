// ==UserScript==
// @name         Exhentai Data Fetcher (Classic)
// @namespace    https://github.com/Hnsr0327/EHGroupTagger/
// @version      0.2.stable
// @description  Fetch and send necessary data to the local server
// @author       Hanashiro, GPT-4-0314
// @match        *://exhentai.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var apikey = window.apikey;
    fetch("http://localhost:3000/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            URL: window.location.href,
            userAgent: navigator.userAgent,
            cookie: document.cookie,
            apikey: apikey,
            messageType: "WebPageRequestCredentials"
        }),
    })
        .then((response) => response.json())
        .then((data) => {
        console.log("WebPageRequestCredentials Sent SUCCEED", data);
    })
        .catch((error) => {
        console.error("WebPageRequestCredentials Sent FAILED", error);
    });
})();