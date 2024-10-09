// ==UserScript==
// @name        伪魔禁
// @description 转存到网盘时根据上个页面的信息自动补充转存路径，当前支持仓库和度盘
// @version     0.1.1
// @author      🧊🍬❄️🍐
// @namespace   cangku.moe
// @match       *://pan.baidu.com/s/*
// @match       *://cangku.moe/*
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://cdn.staticfile.org/jquery/3.6.0/jquery.min.js
// @run-at      document-start
// @license     MIT
// ==/UserScript==

(function () {
  "use strict";
  const pathPattern = "/{host}_{id}_{title}/{date}_{time}";
  // ↑ 修改此行内容即可修改补充的转存路径格式, 字段解释:
  // {host}: 上个页面的域名
  // {id}: 上个页面的url id, 一般是一串数字
  // {title}: 上个页面的标题
  // {date}: 打开网盘链接的日期
  // {time}: 打开网盘链接的时间
  const baiduHost = "pan.baidu.com";
  const cangkuHost = "cangku.moe";
  const cangkuMatch = /cangku.moe\/archives\/(\d+)/;
  const baiduMatch = /pan.baidu.com\/s\/([A-Za-z0-9]+)/;
  const illegalPathPattern1 = /(\s+)?\/(\s+)?/g;
  const illegalPathPattern2 = /[\\":*?<>|]/g;
  const createDirApi = "/api/create?";
  const transferApi = "/share/transfer?";
  const TAG = "伪魔禁";
  const createDirParm = {
    url: "&a=commit",
    body: "{path}&isdir=1&size=&block_list=[]&method=post&dataType=json&rtype=0",
  };
  var metaData = {
    host: "",
    title: "",
    id: "",
    date: "",
    time: "",
  };
  function parsePath(data) {
    let path = pathPattern;
    for (const [key, value] of Object.entries(data))
      path = path.replaceAll("{" + key + "}", value);
    return path;
  }

  function baiduLoder() {
    let baiduId = location.href.match(baiduMatch)[1];
    console.log("开始读取", "bd_" + baiduId);
    let data = GM_getValue("bd_" + baiduId);
    if (data) console.log("读取到记录", data);
    else return;

    window.beforeXMLHttpRequestOpen = function (_xhr, options) {
      createDirParm.url =
        options.url
          .replace(transferApi, createDirApi)
          .replace(/&shareid=[^&]+/, "")
          .replace(/&from=[^&]+/, "")
          .replace(/&sekey=[^&]+/, "")
          .replace(/&async=[^&]+/, "") + createDirParm.url;
    };

    window.beforeXMLHttpRequestSend = function (_xhr, body) {
      let addPath = parsePath(data)
        .trim()
        .replace(illegalPathPattern1, "/")
        .replace(illegalPathPattern2, "_");
      // 修正非法路径(空白字符开头或结尾的文件夹名，非法字符文件夹名)
      body = decodeURIComponent(body);
      console.log("修改前请求参数", body);
      let oldPath = body.match(/path=\/[^&]*/)[0];
      let newPath = oldPath + addPath;
      createDirParm.body = createDirParm.body.replace("{path}", newPath);
      body = body.replace(oldPath, newPath).replace(/&type=\d/, "");
      console.log("修改后的请求参数", body);

      // 请求创建文件夹接口
      let xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log("创建文件夹接口返回数据", xhr.responseText);
            let errno = JSON.parse(xhr.responseText).errno;
            if (errno in [0, -8])
              return _xhr.mySend(
                encodeURIComponent(body)
                  .replaceAll("%3D", "=")
                  .replaceAll("%26", "&")
              );
            alert(TAG + ":\n创建文件夹接口请求错误:" + "errno: " + errno);
          } else
            alert(TAG + ":\n创建文件夹接口请求错误:" + "http: " + xhr.status);
        }
      };
      xhr.open("POST", createDirParm.url, false);
      xhr.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded; charset=UTF-8"
      );
      xhr.mySend(
        encodeURIComponent(createDirParm.body)
          .replaceAll("%3D", "=")
          .replaceAll("%26", "&")
      );
    };

    XMLHttpRequest.prototype.myOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method,
      url,
      async,
      user,
      password
    ) {
      this._url = url;
      let options = {
        method: method,
        url: url,
        async: async,
        user: user,
        password: password,
      };
      if ("function" === typeof window.beforeXMLHttpRequestOpen)
        if (url.includes(transferApi))
          window.beforeXMLHttpRequestOpen(this, options);
      return this.myOpen.call(this, method, url, async, user, password);
    };

    XMLHttpRequest.prototype.mySend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      if ("function" === typeof window.beforeXMLHttpRequestSend)
        if (this._url.includes(transferApi))
          return window.beforeXMLHttpRequestSend(this, body);
      return this.mySend(body);
    };
  }

  function cangkuLoder() {
    document.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        let baiduId = event.target.href.match(baiduMatch);
        if (baiduId) {
          baiduId = baiduId[1];
          let date = new Date();
          metaData.date = date.toLocaleDateString().replaceAll("/", "-");
          metaData.time = date.toLocaleTimeString().replaceAll(":", "：");
          metaData.title = $(
            "#post > div > div.post-wrap > article > div.header > div.title > h1 > a"
          )
            .text()
            .trim()
            .replaceAll("/", "_");

          metaData.host = cangkuHost;
          metaData.id = this.location.href.match(cangkuMatch)[1];
          console.log("开始记录", "bd_" + baiduId, metaData);
          GM_setValue("bd_" + baiduId, metaData);
        }
      }
    });
  }

  function main() {
    if (location.host == cangkuHost) cangkuLoder();
    else if (location.host == baiduHost) baiduLoder();
  }

  jQuery(main);
})();
