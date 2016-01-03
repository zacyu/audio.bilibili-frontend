(function() {
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
    $('#uri').val('').focus();
    $('#uri').closest('.mdl-textfield').get(0).MaterialTextfield.boundUpdateClassesHandler();
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
    if (!history.state || history.state && history.state.avid === videoInfo.avid && history.state.page === videoInfo.page) {
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
        if (typeof data.list == 'object' && data.list.length < videoInfo.page) {
          data.error = 'no such doc';
          data.code = -404;
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
        page: parseInt(matches[3]),
        valid: true
      };
      videoInfo.page = videoInfo.page > 0 && isFinite(videoInfo.page) ? videoInfo.page : 1;
      loadVideoInfo();
    }
  }

  function renderAudioBlock(taskId) {
    if (taskId !== window.currentTask) {
      return false;
    }
    window.currentTask = false;
    $('#audio-info .center').addClass('hidden');
    $('#audio-info .button-group').removeClass('hidden');
    $('#audio-info .loading').removeClass('active');
    $('#download-btn').off('click').click(function() {
      window.open(videoInfo.audio.url);
    }).find('.download').text('下载 ' + videoInfo.audio.format +
      ' 音频 (比特率: ' + videoInfo.audio.bitrate + ' kbit/s)');
    $('#reload-btn').prop('disabled', parseInt(new Date().getTime()/1000) -
      parseInt(videoInfo.audio.ts) < 153600);
  }

  function loadAudioInfo(taskId) {
    if (taskId !== window.currentTask) {
      return false;
    }
    var avid = videoInfo.avid, page = videoInfo.page, reqTimeout = 1000;
    if (videoInfo.audio) {
      renderAudioBlock(taskId);
      return false;
    }
    $('#audio-info .loading').addClass('active');
    $('#audio-info .center').removeClass('hidden');
    $('#audio-info .button-group').addClass('hidden');
    $.ajax('http://bilibili.audio/get.php', {
      method: 'GET',
      dataType: 'json',
      timeout: reqTimeout,
      data: {
        aid: avid,
        p: page
      }
    }).done(function(data) {
      if ($('#audio-info .center .mdl-progress').get(0).MaterialProgress) {
        $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
        $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(0);
        $('#audio-info .center .mdl-progress').addClass('mdl-progress__indeterminate');
      }
      $('#audio-info .center p').text('根据服务器负载, 这可能需要一段时间...');
      switch(parseInt(data.process)) {
        case 0:
          $('#audio-info .center h3').text('正在等待队列');
          $('#audio-info .center p').text('在当前转换任务之前有 ' + data.tasks + ' 个任务');
          break;
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
          if ($('#audio-info .center .mdl-progress').get(0).MaterialProgress) {
            $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
            $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(data.progress);
          }
          break;
        case 4:
          $('#audio-info .center h3').text('正在保存音频文件');
          $('#audio-info .center p').text('音频格式: ' + data.format +
            ' (' + data.quality + ' kbit/s)');
          break;
        case 5:
          if (parseInt(data.status) === 1 && data.url) {
            videoInfo.audio = {
              format: data.format,
              url: data.url,
              bitrate: data.quality,
              ts: data.time
            };
            localStorage.setItem(videoInfo.avid + '/' + videoInfo.page,
              window.LZString.compress(JSON.stringify(videoInfo)));
            renderAudioBlock(taskId);
          } else if (parseInt(data.status) === 0) {
            $('#audio-info .center h3').text('发生异常错误');
          } else {
            $('#audio-info .center h3').text('正在完成任务');
            loadAudioInfo(taskId);
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
            timeout: 2000,
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
      if (parseInt(data.status) === -1) {
        $('#audio-info .center h3').text('任务提交失败');
        $('#audio-info .center p').text('bilibili.audio 目前仅支持 10 分钟以内视频的转换');

        window.swal({
          title: '任务提交失败',
          text: 'bilibili.audio 目前仅支持 10 分钟以内视频的转换. 对于其它内容, 您可以尝试下载视频文件后手动转换.',
          type: 'error',
          confirmButtonText: '下载视频'
        }, function() {
          window.open('http://www.bilibili.download/video/av' + videoInfo.avid + '/index_' + videoInfo.page + '.html');
        });
      } else if (parseInt(data.status) === 0 && (parseInt(data.process) < 3 ||
        parseInt(data.process) === 5 || parseInt(data.retry) === 10) ||
        parseInt(data.process) === 2 &&
        parseInt(new Date().getTime()/1000) - parseInt(data.time) > 600) {
          if (parseInt(new Date().getTime()/1000) - parseInt(data.time) > 120) {
            showRetryAlert();
          } else {
            countDown = true;
            countDownAlert();
          }
      } else if (parseInt(data.process) !== 5) {
        setTimeout(function() {
          loadAudioInfo(taskId);
        }, 500);
      }
    }).error(function(e, status) {
      if (status === 'timeout') {
        if (reqTimeout < 5000) {
          reqTimeout += 500;
        }
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
      $('#part-dropdown').removeClass('hidden');
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
      $('#part-dropdown').addClass('hidden');
    }
    if (videoInfo.ts) {
      $('#refresh-btn').removeClass('hidden');
    } else {
      $('#refresh-btn').addClass('hidden');
    }
    if (videoInfo.type.match(/电影|连载|完结|电视剧|资讯|服饰|动画/)) {
      window.swal({
        title: '提取视频音频',
        text: '您当前查看的视频所在分区 (电影、电视剧、时尚等) 通常不需要提取' +
          '音频, 如果您只需要下载视频内容, 不需要通过 bilibili.audio 转换音频. ' +
          '滥用此功能将会导致您被 bilibili.audio 禁止使用. 确认要继续吗?',
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: '下载视频',
        cancelButtonText: '继续提取音频'
      }, function(confirmed) {
        if (confirmed) {
          window.open('http://www.bilibili.download/video/av' + videoInfo.avid + '/index_' + videoInfo.page + '.html');
          showQueryPage();
        } else {
          initAudio();
        }
      });
    } else {
      initAudio();
    }
  }

  function initAudio() {
    window.currentTask = generateUUID();
    loadAudioInfo(window.currentTask);
    if ($('#audio-info .center .mdl-progress').get(0).MaterialProgress) {
      $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
      $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(0);
      $('#audio-info .center .mdl-progress').addClass('mdl-progress__indeterminate');
    }
    $('#audio-info .center h3').text('正在提交任务');
    $('#audio-info .center p').text('根据服务器负载, 这可能需要一段时间...');
  }

  $(document).ready(function() {
    if (videoInfo.valid) {
      loadVideoInfo();
    } else {
      $('#query').on('mdl-componentupgraded', function() {
        setTimeout(function() {
          showQueryPage();
        }, 0);
        $('#query').off('mdl-componentupgraded');
      });
    }
    $('#uri').on('paste', checkURI).keyup(checkURI);
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
    $('#reload-btn').click(function() {
      if ($(this).prop('disabled')) {
        return false;
      }
      window.swal({
        title: '刷新服务器端存储',
        text: '刷新服务器端存储将导致原音频内容再新的转换任务完成前不可下载, ' +
          '请仅在改分段视频内容变更的时候使用该功能. 如果只是增加了新的分段, ' +
          '您只需通过页面右上角的刷新按钮刷新本地缓存即可. ' +
          '滥用此功能将会导致您被 bilibili.audio 禁止使用. 确认要继续吗?',
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }, function(confirmed) {
        if (confirmed) {
          if ($('#audio-info .center .mdl-progress').get(0).MaterialProgress) {
            $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
            $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(0);
            $('#audio-info .center .mdl-progress').addClass('mdl-progress__indeterminate');
          }
          $('#audio-info .center h3').text('正在提交任务');
          $('#audio-info .center p').text('根据服务器负载, 这可能需要一段时间...');
          $.ajax('http://bilibili.audio/get.php?aid=' + videoInfo.avid + '&p=' + videoInfo.page, {
            method: 'POST',
            dataType: 'json',
            timeout: 2000,
            data: {
              retry: 1
            }
          }).always(function() {
            if ($('#audio-info .center .mdl-progress').get(0).MaterialProgress) {
              $('#audio-info .center .mdl-progress').removeClass('mdl-progress__indeterminate');
              $('#audio-info .center .mdl-progress').get(0).MaterialProgress.setProgress(0);
              $('#audio-info .center .mdl-progress').addClass('mdl-progress__indeterminate');
            }
            delete videoInfo.audio;
            localStorage.setItem(videoInfo.avid + '/' + videoInfo.page,
              window.LZString.compress(JSON.stringify(videoInfo)));
            $('#audio-info .center h3').text('正在提交任务');
            $('#audio-info .center p').text('根据服务器负载, 这可能需要一段时间...');
            window.currentTask = generateUUID();
            loadAudioInfo(window.currentTask);
          });
        }
      });
    });
    $('#search').keyup(function(e) {
      if (e.keyCode === 13) {
        var matches = $(this).blur().val().match(/av([0-9]+)(\/)?(index_([0-9]+)\.html)?(\?.*)?$/i);
        $(this).val('').closest('.mdl-textfield').get(0).MaterialTextfield.boundUpdateClassesHandler();
        if (matches) {
          videoInfo = {
            avid: parseInt(matches[1]),
            page: parseInt(matches[4]),
            valid: true
          };
          videoInfo.page = videoInfo.page > 0 && isFinite(videoInfo.page) ? videoInfo.page : 1;
          loadVideoInfo();
        } else {
          showQueryPage();
        }
      }
    });
  });
})();
