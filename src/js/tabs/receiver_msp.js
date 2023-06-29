"use strict";

const css_dark = [
    '/css/dark-theme.css',
];

const CHANNEL_MIN_VALUE = 1000;
const CHANNEL_MID_VALUE = 1500;
const CHANNEL_MAX_VALUE = 2000;

const channelNames = [
    'Roll',
    'Pitch',
    'Yaw',
    'Collective',
    'Throttle',
    'Aux1',
    'Aux2',
    'Aux3',
];

const channelValues = [
    CHANNEL_MID_VALUE,
    CHANNEL_MID_VALUE,
    CHANNEL_MID_VALUE,
    CHANNEL_MID_VALUE,
    CHANNEL_MIN_VALUE,
    CHANNEL_MIN_VALUE,
    CHANNEL_MIN_VALUE,
    CHANNEL_MIN_VALUE,
];

const gimbalChannels = [
    [ 2, 3 ],
    [ 0, 1 ],
];

var gimbalElems;
var sliderElems;

var enableTX = false;

// This is a hack to get the i18n var of the parent, but the localizePage not works
const i18n = opener.i18n;

const watchers = {
    darkTheme: (val) => {
        if (val) {
            applyDarkTheme();
        } else {
            applyNormalTheme();
        }
    }
};

$(document).ready(function () {
    $('[i18n]:not(.i18n-replaced)').each(function() {
        const element = $(this);
        element.html(i18n.getMessage(element.attr('i18n')));
        element.addClass('i18n-replaced');
    });

    windowWatcherUtil.bindWatchers(window, watchers);
});

function applyDarkTheme()
{
    css_dark.forEach((el) => $('link[href="' + el + '"]').prop('disabled', false));
}

function applyNormalTheme()
{
    css_dark.forEach((el) => $('link[href="' + el + '"]').prop('disabled', true));
}

function localizeAxisNames()
{
    for (const gimbalIndex in gimbalChannels) {
        const gimbal = gimbalElems.get(gimbalIndex);
        const hChannel = gimbalChannels[gimbalIndex][0];
        const vChannel = gimbalChannels[gimbalIndex][1];
        $(".gimbal-label-horz", gimbal).text(i18n.getMessage("controlAxis" + channelNames[hChannel]));
        $(".gimbal-label-vert", gimbal).text(i18n.getMessage("controlAxis" + channelNames[vChannel]));
    }

    $(".slider-label", sliderElems.get(0)).text(i18n.getMessage("controlAxisThr"));

    for (let sliderIndex = 1; sliderIndex < 4; sliderIndex++) {
        $(".slider-label", sliderElems.get(sliderIndex)).text(i18n.getMessage("controlAxisAux" + sliderIndex));
    }
}

function transmitChannels()
{
    if (enableTX) {
        // Callback given to us by the window creator so we can have it send data over MSP for us:
        if (!window.setRawRx(channelValues)) {
            // MSP connection has gone away
            chrome.app.window.current().close();
        }
    }
}

function stickPositionToChannelValue(value)
{
    value = Math.min(Math.max(value, 0.0), 1.0);
    return Math.round(value * (CHANNEL_MAX_VALUE - CHANNEL_MIN_VALUE) + CHANNEL_MIN_VALUE);
}

function channelValueToStickPosition(value)
{
    value = Math.min(Math.max(value, CHANNEL_MIN_VALUE), CHANNEL_MAX_VALUE);
    return (value - CHANNEL_MIN_VALUE) / (CHANNEL_MAX_VALUE - CHANNEL_MIN_VALUE);
}

function updateGimbal(gimbalElem, x, y)
{
    const gimbalSize = $(gimbalElem).width();
    const stickElem = $(".control-stick", gimbalElem);

    stickElem.css('top', (1.0 - channelValueToStickPosition(y)) * gimbalSize + "px");
    stickElem.css('left', channelValueToStickPosition(x) * gimbalSize + "px");
}

function handleGimbalMouseDrag(gimbalElem, gimbalIndex, event)
{
    const gimbalOffset = gimbalElem.offset();
    const gimbalSize = gimbalElem.width();

    const xChannel = gimbalChannels[gimbalIndex][0];
    const yChannel = gimbalChannels[gimbalIndex][1];

    const yValue = stickPositionToChannelValue(1.0 - (event.pageY - gimbalOffset.top) / gimbalSize);
    const xValue = stickPositionToChannelValue((event.pageX - gimbalOffset.left) / gimbalSize);

    channelValues[xChannel] = xValue;
    channelValues[yChannel] = yValue;

    updateGimbal(gimbalElem, xValue, yValue);
}

function resetGimbal(gimbalElem, gimbalIndex)
{
    const xChannel = gimbalChannels[gimbalIndex][0];
    const yChannel = gimbalChannels[gimbalIndex][1];

    const yValue = CHANNEL_MID_VALUE;
    const xValue = CHANNEL_MID_VALUE;

    channelValues[xChannel] = xValue;
    channelValues[yChannel] = yValue;

    updateGimbal(gimbalElem, xValue, yValue);
}

function resetControls()
{
    for (const gimbalIndex in gimbalChannels) {
        const gimbalElem = gimbalElems.get(gimbalIndex);
        resetGimbal(gimbalElem, gimbalIndex);
    }
}

$(document).ready(function() {
    $(".button-enable .btn").click(function() {
        const shrinkHeight = $(".warning").height() + 25;

        $(".warning").slideUp("short", function() {
            chrome.app.window.current().innerBounds.height -= shrinkHeight;
            chrome.app.window.current().innerBounds.minHeight -= shrinkHeight;
            chrome.app.window.current().innerBounds.maxHeight -= shrinkHeight;
        });

        enableTX = true;
    });

    gimbalElems = $(".control-gimbal");
    sliderElems = $(".control-slider");

    gimbalElems.each(function(gimbalIndex) {
        const gimbalElem = $(this);
        gimbalElem.on('mousemove', function(event) {
            if (event.buttons == 1) {
                handleGimbalMouseDrag(gimbalElem, gimbalIndex, event);
            }
        });
        gimbalElem.on('click', function(event) {
            handleGimbalMouseDrag(gimbalElem, gimbalIndex, event);
        });
        gimbalElem.on('dblclick', function(event) {
            resetGimbal(gimbalElem, gimbalIndex);
        });
    });

    $(".slider", sliderElems).each(function(sliderIndex) {
        $(this)
            .noUiSlider({
                start: CHANNEL_MIN_VALUE,
                range: {
                    min: CHANNEL_MIN_VALUE,
                    max: CHANNEL_MAX_VALUE
                }
            }).on('slide change set', function(e, value) {
                value = Math.round(parseFloat(value));
                channelValues[sliderIndex + 4] = value;
                $(".tooltip", this).text(value);
            });

        $(this).append('<div class="tooltip"></div>');

        $(".tooltip", this).text(CHANNEL_MIN_VALUE);
    });

    localizeAxisNames();

    resetControls();

    setInterval(transmitChannels, 50);
});
