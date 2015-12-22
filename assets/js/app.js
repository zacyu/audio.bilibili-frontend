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
  history.replaceState(videoInfo, 'av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title, '/' + videoInfo.avid + '/' + videoInfo.page);
} else {
  history.replaceState(videoInfo, title, '/');
}

window.addEventListener('popstate', function(e) {
  videoInfo = e.state;
  document.title = videoInfo.loaded ? document.title = videoInfo.title + ' - av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title : title;
  if (videoInfo.valid) {
    loadVideoInfo();
  } else {
    showQueryPage();
  }
});

function showQueryPage() {
  ajaxBusy = false;
  videoInfo = {valid: false};
  if (!history.state.valid) {
    history.replaceState(videoInfo, title, '/');
  } else {
    history.pushState(videoInfo, title, '/');
  }
  $('#query').removeClass('hidden');
  $('#video-info').addClass('hidden');
  $('#loading-holder').addClass('hidden');
  $('#uri').val('').closest('.mdl-textfield').get(0).MaterialTextfield.boundUpdateClassesHandler();
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

function loadVideoInfo() {
  if (ajaxBusy) {
    return false;
  }
  if (videoInfo.loaded) {
    renderVideoPage();
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
        document.title = videoInfo.title + ' - av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title;
        if (history.state.avid === videoInfo.avid && history.state.page === videoInfo.page) {
          history.replaceState(videoInfo, document.title, '/' + videoInfo.avid + '/' + videoInfo.page);
        } else {
          history.pushState(videoInfo, document.title, '/' + videoInfo.avid + '/' + videoInfo.page);
        }
        renderVideoPage();
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
  $('#video-info .title').text(videoInfo.title);
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
  $('#video-info .cover .play_hover').click(function() {
    window.open('http://www.bilibili.com/av' + videoInfo.avid + '/index_' + videoInfo.page + '.html');
  });
});
