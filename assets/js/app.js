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

window.addEventListener('popstate', function(e) {
  videoInfo = e.state;
  document.title = videoInfo.loaded ? document.title = getVideoTitle() + ' - av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title : title;
  if (videoInfo.valid) {
    loadVideoInfo();
  } else {
    showQueryPage();
  }
});

// http://stackoverflow.com/a/8809472/1907337
function generateUUID(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += window.performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function showQueryPage() {
  ajaxBusy = false;
  window.currentTask = false;
  if ($('.sweet-alert').is('.visible')) {
      window.swal.close();
  }
  videoInfo = {valid: false};
  if (!history.state || !history.state.valid) {
    history.replaceState(videoInfo, title, '/');
  } else {
    history.pushState(videoInfo, title, '/');
  }
  document.title = title;
  $('#query').removeClass('hidden');
  $('#video-info').addClass('hidden');
  $('#loading-holder').addClass('hidden');
  var uMTF = $('#uri').val('').focus().closest('.mdl-textfield').get(0).MaterialTextfield;
  if (uMTF) {
      uMTF.boundUpdateClassesHandler();
  }
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
  var videoTitle = getVideoTitle(),
      documentTitle = videoTitle ? videoTitle + ' - av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title : 'av' + videoInfo.avid + 'p' + videoInfo.page + ' - ' + title;
  if (history.state && history.state.avid === videoInfo.avid && history.state.page === videoInfo.page) {
    history.replaceState(videoInfo, documentTitle, '/' + videoInfo.avid + '/' + videoInfo.page);
  } else {
    history.pushState(videoInfo, documentTitle, '/' + videoInfo.avid + '/' + videoInfo.page);
  }
  document.title = documentTitle;
  if (videoTitle) {
      renderVideoPage();
  }
}

function loadVideoInfo() {
  if (ajaxBusy) {
    return false;
  }
  window.currentTask = false;
  if ($('.sweet-alert').is('.visible')) {
      window.swal.close();
  }
  setPageState();
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

function renderAudioBlock(taskId) {
  if (taskId !== window.currentTask) {
    return false;
  }
  window.currentTask = false;
  console.log(videoInfo.audio);
  // TODO: show download link
}

function loadAudioInfo(taskId) {
  if (taskId !== window.currentTask) {
    return false;
  }
  var avid = videoInfo.avid, page = videoInfo.page;
  if (videoInfo.audio) {
    renderAudioBlock(taskId);
    return false;
  }
  $.ajax('http://bilibili.audio/get.php', {
    method: 'GET',
    dataType: 'json',
    timeout: 5000,
    data: {
      aid: avid,
      p: page
    }
  }).done(function(data) {
    $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
    $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(0);
    $('#audio-info .center .mdl-progress').addClass('mdl-progress__indeterminate');
    $('#audio-info .center p').text('根据服务器负载, 这可能需要一段时间...');
    switch(parseInt(data.process)) {
      case 1:
        $('#audio-info .center h3').text('正在解析视频信息');
        break;
      case 2:
        $('#audio-info .center h3').text('正在获取视频信息');
        break;
      case 3:
        data.progress = data.progress ? parseFloat(data.progress) : 0;
        if (data.progress > 100) {
          data.progress = 100;
        }
        $('#audio-info .center h3').text('正在下载视频文件');
        $('#audio-info .center p').text('音频格式: ' + data.format +
          ' (' + data.quality + ' kbit/s)' + ' 当前进度: ' + data.progress + '%');
        $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
        $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(data.progress);
        break;
      case 4:
        $('#audio-info .center h3').text('正在保存音频文件');
        $('#audio-info .center p').text('音频格式: ' + data.format +
          ' (' + data.quality + ' kbit/s)');
        break;
      case 5:
        if (parseInt(data.status)) {
          videoInfo.audio = data;
          localStorage.setItem(videoInfo.avid + '/' + videoInfo.page,
            window.LZString.compress(JSON.stringify(videoInfo)));
          renderAudioBlock(taskId);
          break;
        } else {
          $('#audio-info .center h3').text('发生异常错误');
        }
        break;
      default:
        window.console.error('Failed to get audio info for task ' +
          window.currentTask + ' (av' + avid + 'p' + page + ')!');
        window.setTimeout(function() {
          loadAudioInfo(taskId);
        }, 1000);
        break;
    }
    var showRetryAlert = function() {
      if (taskId !== window.currentTask) {
        return false;
      }
      window.swal({
        title: '音频文件提取/转换失败',
        text: '点击「重试」重新提交任务',
        type: 'error',
        showCancelButton: true,
        confirmButtonText: '重试',
        cancelButtonText: '取消',
      }, function(confirmed) {
        if (!confirmed) {
          return false;
        }
        $.ajax('http://bilibili.audio/get.php?aid=' + avid + '&p=' + page, {
          method: 'POST',
          dataType: 'json',
          timeout: 1000,
          data: {
            retry: 1
          }
        }).always(function() {
          loadAudioInfo(taskId);
        });
      });
    }, countDownAlert = function() {
      if (!countDown || taskId !== window.currentTask) {
        return false;
      }
      window.swal({
        title: '音频文件提取/转换失败',
        text: '请等待 ' + (120 + parseInt(data.time) - parseInt(new Date().getTime()/1000)) +
          ' 秒后重试...',
        type: 'error',
        showCancelButton: true,
        showConfirmButton: false,
        cancelButtonText: '取消'
      }, function() {
        countDown = false;
      });
      if (parseInt(new Date().getTime()/1000) - parseInt(data.time) <= 120) {
        setTimeout(function() {
          countDownAlert();
        }, 1000);
      } else {
        showRetryAlert();
      }
    }, countDown = false;
    if (parseInt(data.status) === 0 && (parseInt(data.process) < 3 ||
      parseInt(data.process) === 5 || parseInt(data.retry) === 10)) {
        if (parseInt(new Date().getTime()/1000) - parseInt(data.time) > 120) {
          showRetryAlert();
        } else {
          countDown = true;
          countDownAlert();
        }
    } else if (parseInt(data.status) !== 5) {
      setTimeout(function() {
        loadAudioInfo(taskId);
      }, 500);
    }
  }).error(function(e, status) {
    if (status === 'timeout') {
      loadAudioInfo(taskId);
    } else {
      window.setTimeout(function() {
        loadAudioInfo(taskId);
      }, 1000);
    }
  });
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
  window.currentTask = generateUUID();
  loadAudioInfo(window.currentTask);
  $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
  $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(0);
  $('#audio-info .center .mdl-progress').addClass('mdl-progress__indeterminate');
  $('#audio-info .center h3').text('正在提交任务');
  $('#audio-info .center p').text('根据服务器负载, 这可能需要一段时间...');
}

$(document).ready(function() {
  if (videoInfo.valid) {
    loadVideoInfo();
  } else {
    showQueryPage();
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
