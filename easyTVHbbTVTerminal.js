/*
 *  All member functions and variables that start with an underscore are
 *  internal and may change without warning.
 *
 */
class EasyTVHbbTVTerminal {
    // public interface
    constructor(debug = false, syncEnabled = true) {
        var self = this;
        // Init object member variables

        this.channel = "easytv";
        this.debug = debug;
        this.syncEnabled = syncEnabled;
        this.ws = undefined;
        this.connected = false;
        this.player = undefined;

        this.csManager = oipfObjectFactory.createCSManager();
        this.app2appWsUrl = this.csManager.getApp2AppLocalBaseURL();

        this.selfPlayerReady = false;
        this.otherPlayerReady = false;
        this.isStreamPaused = false;
        this.syncInterval;
        this.stream_url = null;

        this.eventCallbacks = {}
        this.actions = {};

        // Define actions

        // Navigation Actions
        // Add delay to virtual key presses in order to ensure that the UI will handle all them individually
        this.actions.NAV_LEFT = function (json) {
            var count = json.count ? json.count : 1;

            for (var i = 0; i < count; i++) {
                setTimeout(function () {
                    self._fireKey(37)
                }, 200 * i)
            }
        };

        this.actions.NAV_RIGHT = function (json) {
            var count = json.count ? json.count : 1;
            for (var i = 0; i < count; i++) {
                setTimeout(function () {
                    self._fireKey(39)
                }, 200 * i)
            }
        };

        this.actions.NAV_UP = function (json) {
            var count = json.count ? json.count : 1;

            for (var i = 0; i < count; i++) {
                setTimeout(function () {
                    self._fireKey(38)
                }, 200 * i)
            }
        };

        this.actions.NAV_DOWN = function (json) {
            var count = json.count ? json.count : 1;

            for (var i = 0; i < count; i++) {
                setTimeout(function () {
                    self._fireKey(40)
                }, 200 * i)
            }
        };

        this.actions.NAV_ENTER = function () {
            self._fireKey(13);
        };

        this.actions.NAV_CLOSE_PLAYER = function () {
            self._invoke(self.eventCallbacks, "onStreamClose");
        };
        this.actions.SELECTED_SERIE = function(json){
           self._invoke(self.eventCallbacks,"getCurrentEpisodes",json.serie);
        };
        this.actions.QUERY_SERIE = function(json){
             console.log("inside query action",json);
              self._invoke(self.eventCallbacks,"QueryEpisodes",json);
        };
        this.actions.GO_BACK = function(){
          self._invoke(self.eventCallbacks,"goback");
        }
        // Information request
        this.actions.GET_VOD_TITLE = function (json) {
            var title = self._invoke(self.eventCallbacks, "onGetVodTitle", json.locale);
            if (title) {
                self._wsSend({
                    action: "VOD_TITLE",
                    title: title
                });
            }
        };

        this.actions.GET_VOD_DESCRIPTION = function (json) {
            var desc = self._invoke(self.eventCallbacks, "onGetVodDescription", json.locale);
            if (desc) {
                self._wsSend({
                    action: "VOD_DESCRIPTION",
                    description: desc
                });
            }
        };
        this.actions.GET_VOD_ACTORS = function (json) {
            var actors = self._invoke(self.eventCallbacks, "onGetVodActors", json.locale);
            if (actors) {
                self._wsSend({
                    action: "VOD_ACTORS",
                    actors: actors
                });
            }
        };
        this.actions.GET_VOD_DURATION = function (json) {
            var duration = self._invoke(self.eventCallbacks, "onGetVodDuration", json.locale);
            if (duration) {
                self._wsSend({
                    action: "VOD_DURATION",
                    duration: duration
                });
            }
        };

        // Stream sync
        this.actions.VOD_CAN_PLAY = function () {
            if (!self.syncEnabled) {
                return;
            }

            self.otherPlayerReady = true;
            if (self.selfPlayerReady) {
                if (!self.isStreamPaused && self.player) {
                    self.player.play();
                }
                self._invoke(self.eventCallbacks, "onStreamFinishedLoading");
                self._wsSend({ action: "VOD_DO_PLAY" });
            }
        };

        this.actions.VOD_LOADING = function (param) {
            if (!self.syncEnabled) {
                return;
            }

            self.otherPlayerReady = false;
            self._invoke(self.eventCallbacks, "onStreamLoading");
            if (self.player) {
                self.player.pause();
                self.player.seek(param.seek_value);
            }
        };

        this.actions.VOD_DO_PLAY = function () {
            if (!self.syncEnabled) {
                return;
            }

            self.otherPlayerReady = true;
            if (!self.isStreamPaused && self.player) {
                self.player.play();
            }
            self._invoke(self.eventCallbacks, "onStreamFinishedLoading");
        };

        // Stream actions
        this.actions.PLAY = function () {
            if (self.player) {
                self.player.play();
                self.isStreamPaused = false;
            }

            self._invoke(self.eventCallbacks, "onStreamPlaying");
        };

        this.actions.PAUSE = function () {
            if (self.player) {
                self.player.pause();
                self.isStreamPaused = true;
            }

            self._invoke(self.eventCallbacks, "onStreamPaused");
        };

        this.actions.SEEK = function (json) {
            if (self.player) {
                clearTimeout(self.seekTimeout)
                self.seekTimeout = setTimeout(function() {
                    self.player.seek(json.seek_value);
                }, 500);
            }
        }

        this.actions.SET_VOLUME = function (json) {
            if (self.player) {
                self.player.setVolume(json.volume);
                self.player.setMute(false);
                self._invoke(self.eventCallbacks, "onVolumeChanged");
            }
        }
        this.actions.SET_SIZE = function (json) {

                self._invoke(self.eventCallbacks, "onSizeChanged",json);
            }
        this.actions.SET_COLOR = function (json) {

                 self._invoke(self.eventCallbacks, "onColorChanged",json);
            }
        this.actions.SET_BGCOLOR = function (json) {

                 self._invoke(self.eventCallbacks, "onBGColorChanged",json);
            }
            this.actions.SET_BGCOLOR_NONE = function () {

                     self._invoke(self.eventCallbacks, "onBGColorRemove");
                }


        this.actions.SET_MUTE = function(json) {
            if (self.player) {
                self.player.setMute(json.mute);
            }
        }

        this.actions.PLAYER_CLOSE = function (json) {
            self._invoke(self.eventCallbacks, "onStreamClose");
        }
        //new method
        this.actions.VOD_PLAY = function (json) {
              var url = json.stream;
              var title= json.title;
              this.stream_url = json.stream;
              console.log(json.stream);
              this.stream_title = json.title;
              //start_video(url,title);
              self._invoke(self.eventCallbacks, "onStreamOpen", json)
        }

    }

    startListening() {
        this._initWs();
    }

    onPlayerCanPlay() {
        if (!this.syncEnabled) {
            return;
        }

        this._log("I can play");

        this.selfPlayerReady = true;
        var started = false;

        if (!this.connected) {
            this.player.play();
            started = true;
            this._invoke(this.eventCallbacks, "onStreamFinishedLoading");
        } else if (this.connected && this.otherPlayerReady) {
            if (!this.isStreamPaused) {
                this.player.play();
                started = true;
            }
            this._invoke(this.eventCallbacks, "onStreamFinishedLoading");

            this._wsSend({ action: "VOD_DO_PLAY" });
        } else {
            this._wsSend({ action: "VOD_CAN_PLAY" });
            this.player.pause();
        }

        this._log("Can Play " + this.selfPlayerReady + " " + this.otherPlayerReady);
        return started;
    }

    onPlayerBufferEmpty() {
        if (!this.syncEnabled) {
            return;
        }

        if (!this.connected) {
            return;
        }
        this.selfPlayerReady = false;
        this.otherPlayerReady = false;

        this.player.pause();
        this._invoke(this.eventCallbacks, "onStreamLoading");

        this._log("Buffer Empty " + this.selfPlayerReady + " " + this.otherPlayerReady);

        this._wsSend({
            action: "VOD_LOADING",
            seek_value: player.time()
        });
    }

    onPlayerEnded() {
        this.player.pause();
        this._wsSend({ action: "VOD_STOP" });
        clearInterval(this.syncInterval);
    }

    updateSeekLocation(position) {
        this._wsSend({
            action: "SEEK",
            seek_value: position
        });
    }
    //start video plays video from phone
    start_video(url,title){
      if (!this.syncEnabled) {
          return;
      }
      if (this.player) {
          this.player.pause();
          this.player.seek(0);
      }
      this.otherPlayerReady = false;
      this.selfPlayerReady = false;
      this._invoke(this.eventCallbacks, "onStreamLoading");
      this._wsSend({
          action: "VOD_LOADING",
          seek_value: 0
      });
      var self = this;

      if (this.syncInterval) {
          clearInterval(this.syncInterval);
      }
      if (this.connected) {
          this.syncInterval = setInterval(function () {
              if (self.otherPlayerReady && self.selfPlayerReady) {
                  self._wsSend({
                      action: "VOD_PLAYER_TIME",
                      player_time: player.time(),
                      timestamp: (+ new Date())
                  });
              }
          }, 2000);
      }
    }

    startStream(stream_url, stream_title) {
        if (!this.syncEnabled) {
            return;
        }
        if (this.player) {
            this.player.pause();
            this.player.seek(0);
        }

        this.otherPlayerReady = false;
        this.selfPlayerReady = false;
        this._invoke(this.eventCallbacks, "onStreamLoading");
        this._wsSend({
            action: "VOD_LOADING",
            seek_value: 0
        });
        this._wsSend({
            action: "VOD_PLAY",
            stream: stream_url,
            title: stream_title
        });

        var self = this;

        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.connected) {
            this.syncInterval = setInterval(function () {
                if (self.otherPlayerReady && self.selfPlayerReady) {
                    self._wsSend({
                        action: "VOD_PLAYER_TIME",
                        player_time: player.time(),
                        timestamp: (+ new Date())
                    });
                }
            }, 2000);
        }
    }

    play() {
        this.player.play();
        this._wsSend({ action: "PLAY" });
    }

    pause() {
        this.player.pause();
        this._wsSend({ action: "PAUSE" });
    }

    attachPlayer(player) {
        this.player = player;
    }

    event(event, callback) {
        this.eventCallbacks[event] = callback;
    }

    textTrackChanged() {
        this._wsSend({
            action: "TEXT_TRACK_CHANGE",
            track: player.getCurrentTextTrackIndex()
        });
    }

    // Private interface

    /*
     *  Replicates a key press
     */
    _fireKey(keyCode) {
        if (document.createEventObject) {
            var eventObj = document.createEventObject();
            eventObj.keyCode = keyCode;
            eventObj.which = keyCode;
            document.body.fireEvent("onkeydown", eventObj);
        } else if (document.createEvent) {
            var eventObj = document.createEvent("Events");
            eventObj.initEvent("keydown", true, true);
            eventObj.which = keyCode;
            eventObj.keyCode = keyCode;
            document.body.dispatchEvent(eventObj);
        }
    }

    /*
     *  Invokes function stored in hashmap with checks
     */
    _invoke(hash, key, params) {
        if (key in hash) {
            return hash[key](params);
        }
        return undefined;
    }

    _log(message) {
        if (this.debug) {
            console.log(message);
        }
    }

    /*
     *  Send js object throught the socket.
     */
    _wsSend(obj) {
        var jsonString = JSON.stringify(obj);
        this._log("OUT -> " + jsonString);
        this.ws.send(jsonString);
    }

    _initWs() {
        var self = this;

        this.connected = false;
        this.ws = new WebSocket(this.app2appWsUrl + this.channel);
        this._log("Connecting to " + this.app2appWsUrl + this.channel);

        this.ws.onopen = function (ev) {
            self._log("WebSocket Opened");
        };

        this.ws.onerror = function (ev) {
            self._log("WebSocket Error");
        };

        this.ws.onclose = function (ev) {
            self._log("WebSocket closed");
            // Restart websocket when closed. Always keep websocket open.
            setTimeout(function () {
                self._initWs();
            }, 1000);
        };

        this.ws.onmessage = function (evt) {
            self.connected = true;

            try {
                var json = JSON.parse(evt.data);
                self._log("IN <- " + evt.data);

                if (json.action in self.actions) {
                    self.actions[json.action](json);
                } else {
                    self._log("Unhandled action");
                }
            } catch (e) {
                self._log(e);
                self._log("WebSocket message:");
                self._log(evt.data);
            }
        };
    }
}

