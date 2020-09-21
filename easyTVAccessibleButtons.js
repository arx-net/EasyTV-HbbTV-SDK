var easyTVAccessibleButtons = {
    _lastButtonTouched: {},
    options: {
        vibrationEnabled: true,
        vibrationTime: 50,
        ttsEnabled: false,
        lang: "en-GB"
    },
    onClick: function(event) {
        this._recursiveProcessEvent(event, event.srcElement)
    },
    _recursiveProcessEvent(event, element) {
        if (element.classList.contains("acc_button")) {
            if (this.options.vibrationEnabled) {
                navigator.vibrate(this.options.vibrationTime);
            }

            if (this.options.ttsEnabled && (this._lastButtonTouched != element)) {
                this._lastButtonTouched = element;
                try {

                    console.log("Speaking: " + element.getAttribute("alt"));
                    TTS.speak({
                        text: element.getAttribute("alt"),
                        locale: this.options.lang
                    },()=>{},(_)=>{});
                } catch(e) {}
                event.stopImmediatePropagation();
            }
        } else if (element.parentElement && element.parentElement != document.body) {
            this._recursiveProcessEvent(event, element.parentElement);
        }
    }
};

document.addEventListener('click', function(event) {
    easyTVAccessibleButtons.onClick(event);
}, true);

