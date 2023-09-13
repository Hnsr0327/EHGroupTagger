// ==UserScript==
// @name         Exhentai Data Fetcher
// @namespace    https://github.com/Hnsr0327/EHGroupTagger/
// @version      0.1.stable
// @description  Fetch and send necessary data to the local server
// @author       Hanashiro, GPT-4-0314
// @match        *://exhentai.org/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const url = window.location.href;

    const fetchData = {
        url: url,
        userAgent: navigator.userAgent,
        cookie: document.cookie
    };

    GM_xmlhttpRequest({
        method: 'POST',
        url: 'http://localhost:3000/save-data',
        data: JSON.stringify(fetchData),
        headers: {
            'Content-Type': 'application/json'
        },
        onload: function(response) {
            console.log('Data sent to the local server', fetchData);
        },
        onerror: function(error) {
            console.error('Error sending data to the local server', error);
        }
    });
})();