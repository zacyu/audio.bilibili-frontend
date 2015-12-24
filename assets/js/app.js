var title = '哔哩哔哩音频 - bilibili.audio',
    videoInfo = {}, ajaxBusy = false;
videoInfo.param = location.pathname.slice(1).split('/');
if (/^\/video\/av([0-9]+)\/(index_([0-9]+)\.html)?(\?.*)?$/.test(location.pathname)) {
  var matches = /^\/video\/av([0-9]+)\/(index_([0-9]+)\.html)?(\?.*)?$/.exec(location.pathname);
  videoInfo.avid = parseInt(matches[1]);
  videoInfo.page = parseInt(matches[3]);
  videoInfo.page = videoInfo.page > 0 && isFinite(videoInfo.page) ? videoInfo.page : 1;
  videoInfo.valid = true;
} else if (videoInfo.param.length !== 2) {
  videoInfo.valid = false;
} else {
  videoInfo.avid = parseInt(videoInfo.param[0]);
  videoInfo.page = parseInt(videoInfo.param[1]);
  if (isNaN(videoInfo.avid) || isNaN(videoInfo.page) || !isFinite(videoInfo.avid) || !isFinite(videoInfo.page)) {
    videoInfo.valid = false;
  } else {
    videoInfo.valid = true;
  }
}
if (videoInfo.valid) {
  document.title = 'av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title;
  history.replaceState(videoInfo, document.title, '/' + videoInfo.avid + '/' + videoInfo.page);
}

window.addEventListener('popstate', function(e) {
  videoInfo = e.state;
  document.title = videoInfo.loaded ? document.title = getVideoTitle() + ' - av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title : title;
  if (videoInfo.valid) {
    loadVideoInfo();
  } else {
    showQueryPage();
  }
});

function showQueryPage() {
  ajaxBusy = false;
  videoInfo = {valid: false};
  document.title = title;
  if (!history.state || !history.state.valid) {
    history.replaceState(videoInfo, title, '/');
  } else {
    history.pushState(videoInfo, title, '/');
  }
  $('#query').removeClass('hidden');
  $('#video-info').addClass('hidden');
  $('#loading-holder').addClass('hidden');
  $('#uri').val('').focus().closest('.mdl-textfield').get(0).MaterialTextfield.boundUpdateClassesHandler();
}

function getVideoTitle() {
  if (!videoInfo.loaded) {
    return null;
  }
  if (videoInfo.list.length > 1 && videoInfo.list.length >= videoInfo.page) {
    var title = videoInfo.title + '(' + videoInfo.page + ')';
    if (videoInfo.list[videoInfo.page - 1].part.length) {
      title += ' - ' + videoInfo.list[videoInfo.page - 1].part;
    }
    return title;
  } else {
    return videoInfo.title;
  }
}

function loadVideoInfoErrorHandler(errorText) {
  ajaxBusy = false;
  window.swal({
    title: '视频信息读取失败',
    text: '错误信息: ' + errorText,
    type: 'error',
    showCancelButton: true,
    confirmButtonText: '返回',
    cancelButtonText: '重试'
  }, function(confirmed) {
    if (confirmed) {
      if (history.length > 2) {
        history.back();
      } else {
        showQueryPage();
      }
    } else {
      loadVideoInfo();
    }
  });
}

function setPageState() {
  document.title = getVideoTitle() + ' - av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title;
  if (history.state.avid === videoInfo.avid && history.state.page === videoInfo.page) {
    history.replaceState(videoInfo, document.title, '/' + videoInfo.avid + '/' + videoInfo.page);
  } else {
    history.pushState(videoInfo, document.title, '/' + videoInfo.avid + '/' + videoInfo.page);
  }
  renderVideoPage();
}

function loadVideoInfo() {
  if (ajaxBusy) {
    return false;
  }
  var cache = localStorage.getItem(videoInfo.avid + '/' + videoInfo.page);
  if (cache) {
    try {
      cache = JSON.parse(window.LZString.decompress(cache));
      if (parseInt(new Date().getTime()/1000) - cache.ts < 86400) {
        videoInfo = cache;
      }
    } catch (error) {
      window.console.error('Failed to read cache.', error);
      localStorage.removeItem(videoInfo.avid + '/' + videoInfo.page);
    }
  }
  if (videoInfo.loaded) {
    setPageState();
    return false;
  }
  ajaxBusy = true;
  $('#query').addClass('hidden');
  $('#video-info').addClass('hidden');
  $('#loading-holder').removeClass('hidden');
  $.getJSON('http://api.bilibili.com/view?type=jsonp&appkey=95acd7f6cc3392f3&id=' +
    videoInfo.avid + '&page=' + videoInfo.page + '&batch=true&callback=?',
    function(data) {
      if (!ajaxBusy) {
        return false;
      }
      ajaxBusy = false;
      if (!data.error) {
        videoInfo = $.extend(videoInfo, {
          title: data.title,
          desc: data.description,
          cover: data.pic,
          type: data.typename,
          tags: data.tag.split(','),
          list: data.list,
          author: data.author,
          date: data.created_at,
          play: data.play,
          favorites: data.favorites,
          loaded: true
        });
        localStorage.setItem(videoInfo.avid + '/' + videoInfo.page,
          window.LZString.compress(JSON.stringify($.extend(videoInfo,
            {ts: parseInt(new Date().getTime()/1000)}))));
        setPageState();
      } else {
        loadVideoInfoErrorHandler(data.code + ' (' + data.error + ')');
      }
  }).error(function(e) {
    loadVideoInfoErrorHandler(e.status + ' (' + e.statusText + ')');
  });
}

function checkURI() {
  if ($('#uri').val().length && $('#uri').get(0).validity.valid) {
    var matches = /\/video\/av([0-9]+)\/(index_([0-9]+)\.html)?(\?.*)?$/.exec($('#uri').val());
    videoInfo = {
      avid: parseInt(matches[1]),
      page: parseInt(matches[3])
    };
    videoInfo.page = videoInfo.page > 0 && isFinite(videoInfo.page) ? videoInfo.page : 1;
    videoInfo.valid = true;
    loadVideoInfo();
  }
}

function renderVideoPage() {
  $('#video-info').removeClass('hidden');
  $('#query').addClass('hidden');
  $('#loading-holder').addClass('hidden');
  $('#video-info .cover').css('background-image', 'url(' + videoInfo.cover + ')');
  $('#video-info .title').text(getVideoTitle());
  $('#video-info .author').text(videoInfo.author);
  $('#video-info .type').text(videoInfo.type);
  $('#video-info .date').text(videoInfo.date);
  $('#video-info .play').text(videoInfo.play);
  $('#video-info .favorites').text(videoInfo.favorites);
  $('#video-info .desc').text(videoInfo.desc);
  $('#video-info .tags').empty();
  for (var i in videoInfo.tags) {
    $('#video-info .tags').append($('<span class="tag">').text(videoInfo.tags[i]).prop('outerHTML') + ' ');
  }
  $('#part-dropdown .mdl-menu__container').remove();
  if (videoInfo.list.length > 1) {
    $('#part-dropdown').show();
    var dropdown = $('<ul class="mdl-menu mdl-menu--bottom-right mdl-js-menu mdl-js-ripple-effect" for="part-btn"></ul>'),
        clickOnPart = function() {
      if ($(this).data('page') !== videoInfo.page) {
        videoInfo = {
          avid: videoInfo.avid,
          page: $(this).data('page'),
          valid: true
        };
        loadVideoInfo();
      }
    };
    for (var i in videoInfo.list) {
      var partName = (parseInt(i) + 1) + '、' + (videoInfo.list[i].part.length ? videoInfo.list[i].part : '分段' + (parseInt(i) + 1)),
          part = $('<li class="mdl-menu__item"></li>').text(partName).click(clickOnPart).data('page', parseInt(i) + 1);
      if (parseInt(i) + 1 === videoInfo.page) {
        part.attr('disabled', true);
      }
      dropdown.append(part);
    }
    $('#part-dropdown').append(dropdown);
    window.componentHandler.upgradeElements(dropdown.toArray());
  } else {
    $('#part-dropdown').hide();
  }
  if (videoInfo.ts) {
    $('#refresh-btn').show();
  } else {
    $('#refresh-btn').hide();
  }
  // TODO: check conversion status
}

$(document).ready(function() {
  if (videoInfo.valid) {
    loadVideoInfo();
  }
  $('#uri').on('paste', checkURI).keyup('paste', checkURI);
  $('.mdl-layout-title').click(function() {
    showQueryPage();
  });
  $('#video-info .cover .play_hover i').click(function() {
    window.open('http://www.bilibili.com/av' + videoInfo.avid + '/index_' + videoInfo.page + '.html');
  });
  $('#refresh-btn').click(function() {
    if (!videoInfo.valid) {
      return false;
    }
    localStorage.removeItem(videoInfo.avid + '/' + videoInfo.page);
    videoInfo = {
      avid: videoInfo.avid,
      page: videoInfo.page,
      valid: true
    };
    loadVideoInfo();
  });
});
