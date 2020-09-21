/*
 *
 *  This class provides compatibility with the EasyTV message protocol between
 *  a companion screen and a terminal HbbTV application
 *
 */
class EasyTVHbbTVCS {

    _log(msg) {
        if (this._debug) {
            console.log(msg);
        }
    }

    constructor(debug) {
        var self = this;

        if (!hbbtv) {
            this._log("hbbtv object is not avaiable from cordova-plugin-hbbtv, maybe the device is not ready yet.");
        }

        this._channel = "easytv";
        this._debug = debug;
        this._csManager = hbbtv && hbbtv.createTerminalManager();
        this._socket = new EasyTVHbbtvSocket(debug);
        this._titlePromises = [];
        this._descriptionPromises = [];
        this._durationPromises = [];
        this._actorsPromises = [];
        this.sync = null;


        this._socket.event("VOD_TITLE", function(json) {
            self._titlePromises.forEach(function(promise) {
                promise(json.title);
            });
            self._titlePromises = [];
        });

        this._socket.event("VOD_DESCRIPTION", function(json) {
            self._descriptionPromises.forEach(function(promise) {
                promise(json.description);
            });
            self._descriptionPromises = [];
        });

        this._socket.event("VOD_DURATION", function(json) {
            self._durationPromises.forEach(function(promise) {
                promise(json.duration);
            });
            self._durationPromises = [];
        });

        this._socket.event("VOD_ACTORS", function(json) {
            self._actorsPromises.forEach(function(promise) {
                promise(json.actors);
            });
            self._actorsPromises = [];
        });

    }

    setupSync(onStart, onStop) {
        this.sync = new EasyTVHbbTVSync(this, onStart, onStop);
    }

    /*
     *  Search for devices
     *
     */
    searchForDevices() {
        var self = this;
        return new Promise(function(resolve, reject) {
            self._csManager.discoverTerminals(function(terminals) {

                resolve(terminals);
            });
        });
    }
    launch(terminal) {
      console.log(terminal);
      var self = this;
      if (terminal!=null){
        var enumId = terminal.enum_id;
        var url=new URL(terminal.X_HbbTV_App2AppURL);
        console.log(url.hostname);
        console.log(url.port);

        var APP_LOCATION = "#port="+url.port+"$hostname="+url.hostname;


        var options = {
            domainName: "EasyTV", // used for <mhp:ApplicationDiscovery DomainName="$DOMAIN_NAME$">. Default is an empty String
            appName: "EasyTV", // used for <mhp:appName Language="eng">$APP_NAME$</mhp:appName>. Default is an empty String
            orgId: "net.arx.EasyTV", // used for <mhp:orgId>$ORG_ID$</mhp:orgId>. Default is an empty String
            appUrlBase: "http://public.arx.net/~ctsantas/easytv/terminalV3/index.html", // used for <mhp:URLBase>$APP_URL_BASE$</mhp:URLBase>. Default is an empty String
            appLocation: APP_LOCATION, // used for <mhp:applicationLocation>$APP_LOCATION$</mhp:applicationLocation>. Default is an empty String
        };

       console.log(terminal.X_HbbTV_App2AppURL);
       console.log(terminal);
       self._csManager.launchHbbTVApp(enumId,options,function (enumId, errorCode) {
          if(errorCode){
            console.error("An error is occurred while launching the HbbTV App. HbbTV Error Code = ", errorCode);
          }
          else {
            console.log("HbbTV App Launched successfully");
          }
        });
      }
    }

    connect(terminal, ccma = false) {
        let app2appRemoteUrl;
        if(ccma){
            app2appRemoteUrl = terminal.X_HbbTV_App2AppURL;
        }else {
            app2appRemoteUrl = terminal.X_HbbTV_App2AppURL + this._channel;
        }
        this._socket.connect(app2appRemoteUrl);
    }





    disconnect() {
        this._socket.close();
    }

    /*
     *  Extraction of information from the HbbTV application
     *
     */
    getSelectedItemTitle(lang) {
        var self = this;
        return new Promise(function(resolve, reject) {
            self._titlePromises.push(resolve);

            self._socket.send({
                action: "GET_VOD_TITLE",
                locale: lang
            });
        });
    }

    getSelectedItemDescription(lang) {
        var self = this;
        return new Promise(function(resolve, reject) {
            self._socket.send({
                action: "GET_VOD_DESCRIPTION",
                locale: lang
            });

            self._descriptionPromises.push(resolve);
        });
    }

    getSelectedItemDuration(lang) {
        var self = this;
        return new Promise(function(resolve, reject) {
            self._socket.send({
                action: "GET_VOD_DURATION",
                locale: lang
            });

            self._durationPromises.push(resolve);
        });
    }

    getSelectedItemActors(lang) {
        var self = this;
        return new Promise(function(resolve, reject) {
            self._socket.send({
                action: "GET_VOD_ACTORS",
                locale: lang
            });

            self._actorsPromises.push(resolve);
        });
    }

    /*
     *  Navigation commands
     */
    navigateLeft(count = 1) {
        this._socket.send({
            action: "NAV_LEFT",
            count: count
        });
    }

    navigateRight(count = 1) {
        this._socket.send({
            action: "NAV_RIGHT",
            count: count
        });
    }

    navigateUp(count = 1) {
        this._socket.send({
            action: "NAV_UP",
            count: count
        });
    }

    navigateDown(count = 1) {
        this._socket.send({
            action: "NAV_DOWN",
            count: count
        });
    }

    navigateEnter() {
        this._socket.send({action: "NAV_ENTER" });
    }

    selectedSeries(serie){
      this._socket.send({action: "SELECTED_SERIE",
      serie : serie });
    }
    querySeries(serie){
      console.log("easytvcs",serie);
      this._socket.send({action: "QUERY_SERIE",
      serie : serie });
    }
    onBackKeyDown(){
      this._socket.send({action: "GO_BACK" });
    }
    setTtsSpeed(value) {
        if(value !== 0 && value !== 1 && value !== 2){
            throw "Invalid TTS Speed Value: " + value;
        }
        this._socket.send({
            action: "SET_SCREEN_READER_SPEED",
            speed: value
        });
    }
    enableScreenReader(){
        this._socket.send({
            action: "SWITCH_SCREEN_READER_ON"
        })
    }
    disableScreenReader(){
        this._socket.send({
            action: "SWITCH_SCREEN_READER_OFF"
        })
    }
    sendUserModel(userModel) {
        console.log("USER MODEL: ", userModel);
        this._socket.send({action: "SET_USER_MODEL", userModel: userModel});
    }
}

/*
 *  The module about the syncing.
 *
 */

class EasyTVHbbTVSync {

    constructor(easyTVCS, onSyncStart, onSyncStopped) {
        self = this;
        this._easyTVCS = easyTVCS;

        this._onSyncStart = onSyncStart;
        this._stream_url = null;
        this._stream_title = null;
        this._player = undefined;
        this._thisPlayerReady = false;
        this._otherPlayerReady = false;

        this.isLoading = false;
        this.isPaused = false;

        this._easyTVCS._socket.event("VOD_PLAY", function(json) {
            // notify the calling code
            self._stream_url = json.stream;
            self._stream_title = json.title;

            onSyncStart();
        });

        this._easyTVCS._socket.event("VOD_CAN_PLAY", function(json) {
            self._otherPlayerReady = true;
            if (self._thisPlayerReady) {
                if (self.isPaused) {
                    self._player.play();
                }

                self._easyTVCS._socket.send({ action: "VOD_DO_PLAY" });
                self.isLoading = false;
            }
        });

        this._easyTVCS._socket.event("VOD_LOADING", function(json) {
            self.isLoading = true;
            self._otherPlayerReady = false;
            //self._thisPlayerReady = false;

            self._player.pause();
            self._player.seek(json.seek_value);
        });

        this._easyTVCS._socket.event("VOD_DO_PLAY", function(json) {
            self._otherPlayerReady = true;
            self.isLoading = false;
            if (!self.isPaused) {
                self._player.play();
            }
        });

        this._easyTVCS._socket.event("GET_USER_MODEL", function(json){
            let userModel = self._easyTVCS.getUserModel();
            console.log("USER_MODEL to be sent through the socket", userModel);
            if(userModel === null){
                self._easyTVCS.sendUserModel({})
            } else {
                self._easyTVCS.sendUserModel(userModel);
            }
        });

        /*
         *  Sent every N seconds in order to fix desync.
         *  if the time difference is more than 1 second it will
         *  start the sync process.
         */
        this._easyTVCS._socket.event("VOD_PLAYER_TIME", function(json) {
            var time_diff = Math.abs(self._player.time() - json.player_time);
            // if time difference is bigger than one second.
            self._easyTVCS._log("Sync diff: " + time_diff);

            if (time_diff > 0.5) {
                self._easyTVCS._log("Seek to " + json.player_time);
                self.isLoading = true;
                self._thisPlayerReady = false;
                self._otherPlayerReady = false;
                self._player.pause();
                self._player.seek(json.player_time);

                self._easyTVCS._socket.send({
                    action: "VOD_LOADING",
                    seek_value: json.player_time
                });
            }
        });

        this._easyTVCS._socket.event("VOD_STOP", function(json) {
            self._player.pause();
            onSyncStopped();
        });

        this._easyTVCS._socket.event("PAUSE", function(json) {
            self.isPaused = true;
            self._player.pause();
        });

        this._easyTVCS._socket.event("PLAY", function(json) {
            self.isPaused = false;
            self._player.play();
        });

        this._easyTVCS._socket.event("SEEK", function(json) {
            self._player.seek(json.seek_value);
        });
    }

    getVideoTracks() {
        return this._player.getBitrateInfoListFor('video');
    }

    setVideoTrack(id) {
        if (id == -1) {
            this._player.setAutoSwitchQualityFor('video', true);
        } else {
            this._player.setAutoSwitchQualityFor('video', false);
            this._player.setQualityFor('video', id);
        }
    }

    getCurrentVideoTrack(){
        var selected = this._player.getQualityFor('video');
        if (this._player.getAutoSwitchQualityFor('video')) {
            selected = -1;
        }
        return selected;
    }

    getAudioTracks() {
        return this._player.getTracksFor('audio');
    }

    getCurrentAudioTrack(){
        let temp = this._player.getCurrentTrackFor('audio');
        if(temp == null) return {index: -1};
        return temp;
    }

    setAudioTrack(id) {
        var track = this._player.getTracksFor('audio')[id];
        this._player.setCurrentTrack(track);
    }

    getTextTracks() {
        return this._player.getTracksFor('text');
    }

    getCurrentTextTrack() {
        return this._player.getCurrentTextTrackIndex();
    }

    setTextTrack(id) {
        this._player.setTextTrack(id);
    }

    getDuration() {
        return this._player.duration();
    }

    getPlayerTime() {
        return this._player.time();
    }
    getStreamUrl() {
        return this._stream_url;
    }

    getPlayer() {
        return this._player;
    }
    // Starts the syncing of the video between the CS and the terminal application
    startSyncing(video_element) {
        self = this;

        self._player = dashjs.MediaPlayer().create();
        self._player.getDebug().setLogToBrowserConsole(false);
        self._player.initialize(video_element, self._stream_url, true);

        self._player.on(dashjs.MediaPlayer.events["CAN_PLAY"], function () {
            console.log("On CAN_PLAY with other player ready: " + self._otherPlayerReady);
            self._thisPlayerReady = true;

            if (self._otherPlayerReady) {
                self.isLoading = false;
                if (!self.isPaused) {
                    self._player.play();
                }
                self._easyTVCS._socket.send({ action: "VOD_DO_PLAY" });
            } else {
                self._easyTVCS._socket.send({ action: "VOD_CAN_PLAY" });
                self._player.pause();
            }
        });

        self._player.on(dashjs.MediaPlayer.events["BUFFER_EMPTY"], function () {
            console.log("Buffer is empty ");
            self.isLoading = true;
            self._thisPlayerReady = false;
            self._otherPlayerReady = false;
            self._player.pause();
            self._easyTVCS._socket.send({
                action: "VOD_LOADING",
                seek_value: self._player.time()
            });
        });

        self.isPaused = false;
        self.isLoading = true;
        self._thisPlayerReady = false;
        self._otherPlayerReady = false;

        self._player.pause();
        self._player.seek(0);
    }

    startSyncingNC(video_element) {
        self = this;

        self._player = dashjs.MediaPlayer().create();
        self._player.getDebug().setLogToBrowserConsole(false);
        self._player.initialize(video_element, self._stream_url, true);

        self.isPaused = false;
        self.isLoading = false;
        self._thisPlayerReady = true;
        self._otherPlayerReady = false;

    }

    play() {
        this.isPaused = false;
        this._player.play();
        this._easyTVCS._socket.send({ action: "PLAY" });
    }

    start_video(url,title){

        this._stream_url = url;
        this._stream_title = title;

         this._easyTVCS._socket.send({
             action: "VOD_PLAY",
             stream: url,
             title: title
         });

        self._easyTVCS._socket.send({ action: "VOD_CAN_PLAY" });

        this._onSyncStart();
    }

    start_videoNC(url,title){
      this._stream_url=url;
      this._stream_title=title;
      this.isPaused = false;
      this.isLoading = false;
      this._thisPlayerReady = true;
      this._onSyncStart();
    }

    pause() {
        this.isPaused = true;
        this._player.pause();
        this._easyTVCS._socket.send({ action: "PAUSE" });
    }

    seek(position) {
        console.log("Sending seek");
        this._player.seek(position);
        this._easyTVCS._socket.send({
            action: "SEEK",
            seek_value: position
        });
    }

    close() {
        this._player.pause();
        this._easyTVCS._socket.send({ action: "PLAYER_CLOSE" });
    }

    muteTV(muted) {
        this._easyTVCS._socket.send({ action: "SET_MUTE", mute: muted });
    }

    setTVVolume(volume) {
        this._easyTVCS._socket.send({
            "action": "SET_VOLUME",
            "volume": volume
        });
    }
    setTVSize(size) {
        this._easyTVCS._socket.send({
            "action": "SET_SIZE",
            "size": size
        });
    }
    setColorSubs(color){
      this._easyTVCS._socket.send({
          "action": "SET_COLOR",
          "color": color
      });
    }
    setBGColorSubs(bgcolor){
      this._easyTVCS._socket.send({
          "action": "SET_BGCOLOR",
          "bgcolor": bgcolor
      });
    }
     RemoveBgColor(){
      this._easyTVCS._socket.send({
          "action": "SET_BGCOLOR_NONE"

      });
    }

}


/*
 *  A wrapper for websockets used by the library
 *
 */
class EasyTVHbbtvSocket {
    constructor(debug = true) {
        this.ws = undefined;
        this.closed = true;
        this.debug = debug;
        this.actions = {};
    }

    connect(url) {
        var self = this;

        if (this.ws && !this.closed) {
            /*
             * The following lines will cause the socket to be reopened
             * using the new url.
             */

            this.url = url;
            this.ws.close();
            return;
        }

        this.closed = false;

        self._log("WS to " + url);
        this.ws = new WebSocket(url);

        this.ws.onopen = function(evt) {
            self._log("WS opened");
            this.send({action: "CS Connected"});
        }

        this.ws.onerror = function(evt) {
            self._log("WS error");

            if (!self.closed) {
                setTimeout(function() {
                    self.connect(self.url);
                }, 1000);
            }
        }

        this.ws.onclose = function(evt) {
            self._log("WS closed");

            if (!self.closed) {
                setTimeout(function() {
                    self.connect(self.url);
                }, 1000);
            }
        }

        this.ws.onmessage = function(evt) {
            try {
                var json = JSON.parse(evt.data);
                self._log("IN <- " + evt.data);

                if (json.action in self.actions) {
                    console.log("Call for action : " + json.action)
                    self.actions[json.action](json);
                } else {
                    self._log("Unhandled action");
                }
            } catch (e) {
                console.log("Error " + e.message)
                console.log(e.stack);
                self._log("WebSocket message " + evt.data);
            }
        }
    }

    send(obj) {
        if(!this.closed){
        var json_string = JSON.stringify(obj);
        this._log("SEND json: " + json_string);
        this.ws.send(json_string);
        }
    }

    close() {
        this.closed = true;
        this.ws.close();
    }

    event(name, callback) {
        this.actions[name] = callback;
    }

    _log(msg){
        if (this.debug) {
            console.log(msg);
        }
    }
}

