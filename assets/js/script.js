'use strict';
$(function(){
  moment.locale('ja');
  $(".js-load").each(function(i, elem) {
    var $obj = $(elem);
    var getUri = $obj.data('uri');
    var getData = $obj.data('options');
    var tempSelector = $obj.data('template');
    var articlesUri = $obj.data('articles_uri');
    if (!getUri || !tempSelector) return;
    var template = Handlebars.compile($(tempSelector).html());
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
        var html = template({posts: json, articles_uri: articlesUri});
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
