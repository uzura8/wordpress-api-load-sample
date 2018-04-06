'use strict';
$(function(){
  moment.locale('ja');// moment.js で日本語を使用する場合のみ

  // 複数の非同期通信に必要な情報を保存する配列を用意する
  var loadBlocks = [];// 非同期で読み込むブロックを保存する
  var postAjaxSets = [];// 記事一覧取得 API の Ajax setting を保存する配列
  var postXHRs = [];// 記事一覧取得 API の XMLHTTPRequest を保存する配列
  var postResponses = [];// 記事一覧取得 API のレスポンスを保存する配列
  var mediaAjaxSets = [];// 添付画像一覧取得 API の Ajax setting を保存する配列
  var mediaXHRs= [];// 添付画像一覧取得 API の XMLHTTPRequest を保存する配列
  var mediaResponses = [];// 添付画像一覧取得 API のレスポンスを保存する配列

  // 添付画像一覧を取得する Ajax setting を mediaAjaxSets に追加(記事一覧取得の Ajax の callback に指定)
  var addMediaRequest = function(blockIndex, isDispThumnail, jsonpFuncName) {
    jsonpFuncName = String(jsonpFuncName || '')
    if (!isDispThumnail) return;// thumnail が不要な場合は抜ける
    return function(response, status, xhr) {// Ajax の戻り値を受ける
      response.forEach(function(post, index){
        var parentId = post.id;// 記事ID
        if (isEmpty(post._links['wp:attachment'])) return;// 添付画像の有無を確認
        var getUri = post._links['wp:attachment'][0].href;// 添付画像取得APIのURLを取得
        var uriItems = parseUrl(getUri);
        var getData = uriItems.queries.obj;
        var jsonpFuncNameMedia = !isEmpty(jsonpFuncName) ? jsonpFuncName + '_media_' + parentId : null;// jsonp の場合は function 名を指定
        getData._jsonp = jsonpFuncNameMedia;
        mediaAjaxSets.push({
          url: uriItems.uri,
          data: getData,
          dataType: jsonpFuncNameMedia ? 'jsonp' : 'json',
          jsonpCallback: getData._jsonp
        });
      });
    }
  };

  // .js-load が指定されている要素を取得
  $('.js-load').each(function(blockIndex, elem) {
    var $obj = $(elem);
    var getUri = $obj.data('uri');// 記事取得 API の url
    var getData = $obj.data('params');// 記事取得 API の get パラメータ
    var options = $obj.data('options');
    var jsonpFuncName = !isEmpty(getData._jsonp) ? getData._jsonp : '';// jsonp の場合は function 名を指定
    var isDispThumnail = Boolean(options.disp_thumbnail);
    if (!getUri) return;// 記事取得 API の url が未指定の場合は抜ける
    // あとで出力する時に必要な情報を配列に保存しておく
    loadBlocks[blockIndex] = {
      selector: '#' + $obj.attr('id'),
      'options': options,
    };
    // 記事一覧を取得する Ajax setting を postAjaxSets に追加する
    postAjaxSets[blockIndex] = {
      type: 'GET',
      url: getUri,
      data: getData,
      dataType: isEmpty(getData._jsonp) ? 'json' : 'jsonp',
      jsonpCallback: isEmpty(getData._jsonp) ? null : getData._jsonp,
      success: addMediaRequest(blockIndex, isDispThumnail, jsonpFuncName)
    };
  });

  // 記事取得 Ajax をまとめて実行
  $.each(postAjaxSets, function(blockIndex, request) {
    postXHRs[blockIndex] = $.ajax(request);// $.ajaxの戻り値を配列に格納
  });
  // 記事取得の Ajax が全て終わった時に実行される
  $.when.apply($, postXHRs).done(function () {
    // arguments からレスポンスを取り出す。それぞれ [data, textStatus, jqXHR] の配列になっている。
    for (var blockIndex = 0, n = arguments.length; blockIndex < n; blockIndex++) {
      var response = arguments[blockIndex];
      postResponses[blockIndex] = response[2].responseJSON;// 記事取得 API のレスポンス postResponses に格納
    }
    getMedias();// 記事取得 Ajax が全て完了後に実行
  });

  // 添付画像取得 Ajax をまとめて実行
  var getMedias = function() {
    $.each(mediaAjaxSets, function(i, request) {
      mediaXHRs[i] = $.ajax(request);// $.ajaxの戻り値を配列に格納
    });
    // 添付画像取得の Ajax が全て終わった時に実行される
    $.when.apply($, mediaXHRs).done(function () {
      // arguments からレスポンスを取り出す。それぞれ [data, textStatus, jqXHR] の配列になっている。
      for (var i = 0, n = arguments.length; i < n; i++) {
        var response = arguments[i];
        mediaResponses[i] = response[2].responseJSON;// 記事取得 API のレスポンス mediaResponses に格納
      }
      // 添付画像取得 Ajax が全て完了後に実行
      mergeResponses();// 記事一覧の配列に添付画像の配列をマージする
      renderPosts();// 記事を出力
    });
  };

  var mergeResponses = function() {
    $.each(postResponses, function(blockIndex, postResponse) {
      for (var i = 0, n = postResponse.length; i < n; i++) {
        postResponse[i].media = getMediaResponse(postResponse[i].id);// key を media で追加
      }
    });
  };

  // サムネイルに使用する最初の画像のみ返す
  var getMediaResponse = function(parentId) {
    for (var i = 0, n = mediaResponses.length; i < n; i++) {
      var items = mediaResponses[i];
      if (items.length === 0) continue;
      if (items[0].post === parentId) {
        return items[0];
      }
    }
  };

  // loadBlocks に保存した要素に結果を順次出力する
  var renderPosts = function() {
    $.each(loadBlocks, function(blockIndex, loadBlock) {
      renderEach(loadBlock, postResponses[blockIndex]);
    });
  };

  // Handlebars(テンプレートエンジン) でHTMLを生成・追加する
  var renderEach = function(loadBlock, postResponse) {
    var $block = $(loadBlock.selector);
    var options = loadBlock.options;
    var template = Handlebars.compile($(options.template).html());
    var html = template({posts: postResponse, postsUri: options.posts_uri});
    $block.append(html);
  };
});

// Handlebars 用ヘルパー関数: N 文字で切り詰める
Handlebars.registerHelper('strim', function(content, width) {
  var text = content.replace(/(<([^>]+)>)/ig, '');
  if (text.length > width) text = text.substr(0, width) + '...';
  return text;
});
// Handlebars 用ヘルパー関数: 指定の出力形式に日付を変換する
Handlebars.registerHelper('dateformat', function(datetime, format) {
  return moment(datetime).format(format);
});

// 汎用関数: URL を解釈し、クエリ文字列部とその他で分ける
var parseUrl = function(targetUri){
  var queryObj = {};
  var items = targetUri.split('?');
  var uriStr = items[0];
  var queryStr = items[1] ? items[1] : '';
  if (queryStr) {
    queryStr.split('&').forEach(function(v){
      var w = v.split('=');
      queryObj[w[0]] = w[1];
    });
  }
  return {
    uri: uriStr,
    queries: {
      str: queryStr,
      obj: queryObj
    }
  };
};

// 汎用関数: 空かどうかを判定する
var isEmpty = function (data) {
  if (data === null) return true;
  if (data === undefined) return true;
  if (data === false) return true;
  if (data === '') return true;
  if (data === '0') return true;
  if (data === 0) return true;
  if (typeof data === 'object' && !Object.keys(data).length) return true;
  return false;
};
