'use strict';
$(function(){
  moment.locale('ja');
  $('.js-load').each(function(i, elem) {
    var $obj = $(elem);
    var getUri = $obj.data('uri');
    var getData = $obj.data('params');
    var options = $obj.data('options');
    var jsonpFuncName = !empty(getData._jsonp) ? getData._jsonp : '';
    if (!getUri) return;
    var template = Handlebars.compile($(options.template).html());
    $.ajax({
      type: 'GET',
      url: getUri,
      data: getData,
      dataType: empty(getData._jsonp) ? 'json' : 'jsonp',
      jsonpCallback: empty(getData._jsonp) ? null : getData._jsonp,
      beforeSend: function(xhr, settings) {
      },
      complete: function(xhr, textStatus) {
      },
      success: function(json, status) {
        json.media_url = '';
        if (Boolean(options.disp_thumbnail)) {
          for (var i = 0; i < json.length; i++) {
            json[i].media_url = getMediaUrlFromContent(json[i].content.rendered);
          }
        }
        var html = template({posts: json, postsUri: options.posts_uri});
        $obj.append(html);
      },
      error: function(result, status) {
      }
    });
  });
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
