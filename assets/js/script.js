'use strict';
$(function(){
  moment.locale('ja');
  var loadBlocks = [];
  var postRequests = [];
  var postXHRList = [];
  var postResponses = [];
  var mediaRequests = [];
  var mediaXHRList= [];
  var mediaResponses = [];

  var addRequestMedia = function(blockIndex, isDispThumnail, jsonpFuncName) {
    if (!isDispThumnail) return;
    return function(items, status, xhr) {
      items.forEach(function(item, index){
        item.media_url = '';
        var parentId = item.id;
        if (empty(item._links['wp:attachment'])) return;
        var getUri = item._links['wp:attachment'][0].href;
        var uriItems = parseUrl(getUri);
        var getData = uriItems.queries.obj;
        var jsonpFuncNameMedia = !empty(jsonpFuncName) ? jsonpFuncName + '_media_' + parentId : null;
        getData._jsonp = jsonpFuncNameMedia;
        mediaRequests.push({
          url: uriItems.uri,
          data: getData,
          dataType: jsonpFuncNameMedia ? 'jsonp' : 'json',
          jsonpCallback: getData._jsonp
        });
      });
    }
  }

  $('.js-load').each(function(blockIndex, elem) {
    var $obj = $(elem);
    var getUri = $obj.data('uri');
    var getData = $obj.data('params');
    var options = $obj.data('options');
    var jsonpFuncName = !empty(getData._jsonp) ? getData._jsonp : '';
    var isDispThumnail = Boolean(options.disp_thumbnail);
    if (!getUri) return;
    loadBlocks[blockIndex] = {
      obj: $obj,
      selector: '#' + $obj.attr('id'),
      'options': options,
    };
    postRequests[blockIndex] = {
      type: 'GET',
      url: getUri,
      data: getData,
      dataType: empty(getData._jsonp) ? 'json' : 'jsonp',
      jsonpCallback: empty(getData._jsonp) ? null : getData._jsonp,
      success: addRequestMedia(blockIndex, isDispThumnail, jsonpFuncName)
    };
  });

  $.each(postRequests, function(blockIndex, request) {
    postXHRList[blockIndex] = $.ajax(request);// $.ajaxの戻り値を配列に格納
  });
  $.when.apply($, postXHRList).done(function () {
      // arguments から取り出す。それぞれ[data, textStatus, jqXHR] の配列になっている。
    for (var blockIndex = 0; blockIndex < arguments.length; blockIndex++) {
      var response = arguments[blockIndex];
      postResponses[blockIndex] = response[2].responseJSON;
    }
    getMedias();
  });

  var getMedias = function() {
    $.each(mediaRequests, function(i, request) {
      mediaXHRList[i] = $.ajax(request);// $.ajaxの戻り値を配列に格納
    });
    $.when.apply($, mediaXHRList).done(function () {
      // arguments から取り出す。それぞれ[data, textStatus, jqXHR] の配列になっている。
      for (var i = 0; i < arguments.length; i++) {
        var response = arguments[i];
        mediaResponses[i] = response[2].responseJSON;
      }
      mergeResponses();
      renderPosts();
    });
  }

  var mergeResponses = function() {
    $.each(postResponses, function(blockIndex, postResponse) {
      for (var i = 0, n = postResponse.length; i < n; i++) {
        postResponse[i].media = getMediaResponse(postResponse[i].id);
      }
    });
  }

  var renderPosts = function() {
    $.each(loadBlocks, function(blockIndex, loadBlock) {
      renderEach(loadBlock, postResponses[blockIndex]);
    });
  }

  var renderEach = function(loadBlock, postResponse) {
    var options = loadBlock.options;
    var template = Handlebars.compile($(options.template).html());
    var html = template({posts: postResponse, postsUri: options.posts_uri});
    loadBlock.obj.append(html);
  }

  var getMediaResponse = function(parentId) {
    for (var i = 0, n = mediaResponses.length; i < n; i++) {
      var items = mediaResponses[i];
      if (items.length === 0) continue;
      if (items[0].post === parentId) {
        return items[0];
      }
    }
  }
});

Handlebars.registerHelper('strim', function(content, width) {
  var text = content.replace(/(<([^>]+)>)/ig, '');
  if (text.length > width) text = text.substr(0, width) + '...';
  return text;
});

Handlebars.registerHelper('dateformat', function(datetime, format) {
  return moment(datetime).format(format);
});

var getMediaUrlFromContent = function (content) {
  if (content.length === 0) return '';
  var returnImg;
  $(content).find('img').each(function(i, elem) {
    if (!empty(returnImg)) return;
    if (elem.className.match(/wp-image-/)) returnImg = elem.src;
  });
  if (empty(returnImg)) return '';
  return returnImg;
}

var parseUrl = function(targetUri){
  var queryObj = {};
  var items = targetUri.split("?");
  var uriiStr = items[0];
  var queryStr = items[1] ? items[1] : '';
  if (queryStr) {
    queryStr.split("&").forEach(function(v){
      var w = v.split("=");
      queryObj[w[0]] = w[1];
    });
  }
  return {
    uri: uriiStr,
    queries: {
      str: queryStr,
      obj: queryObj
    }
  };
};

var empty = function (data) {
  if (data === null) return true;
  if (data === undefined) return true;
  if (data === false) return true;
  if (data === '') return true;
  if (data === 0) return true;
  if (data === '0') return true;
  if (data === {}) return true;
  return false;
}
