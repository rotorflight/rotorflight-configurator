'use strict';

TABS.rates = {
    isDirty: false,
    activeSubtab: null,
    currentRateProfile: null,
    currentRatesType: null,
    previousRatesType: null,
    RATES_TYPE: {
        NONE:        0,
        BETAFLIGHT:  1,
        RACEFLIGHT:  2,
        KISS:        3,
        ACTUAL:      4,
        QUICKRATES:  5,
    },
    RATES_TYPE_NAMES: [
        'None',
        'Betaflight',
        'Raceflight',
        'KISS',
        'Actual',
        'QuickRates',
    ],
    RATES_TYPE_IMAGES: [
        'none.svg',
        'betaflight.svg',
        'raceflight.svg',
        'kiss.svg',
        'actual.svg',
        'quickrates.svg',
    ],
    TAB_NAMES: [
        'rateProfile1',
        'rateProfile2',
        'rateProfile3',
        'rateProfile4',
        'rateProfile5',
        'rateProfile6',
    ],
    RATE_PROFILE_MASK: 128,
};

TABS.rates.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/rates.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_RC_TUNING))
            .then(() => MSP.promise(MSPCodes.MSP_RC_DEADBAND))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_RC_TUNING, mspHelper.crunch(MSPCodes.MSP_SET_RC_TUNING)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (callback) callback();
            });
    }

    function data_to_form() {

        self.currentRatesType = FC.RC_TUNING.rates_type;
        self.previousRatesType = FC.RC_TUNING.rates_type;

        self.currentRateProfile = FC.CONFIG.rateProfile;

        self.activeSubtab = self.TAB_NAMES[self.currentRateProfile];

        $('.tab-rates .tab-container .tab').removeClass('active');
        $('.tab-rates .tab-container .' + self.activeSubtab).addClass('active');

        const ratesTypeListElement = $('.rates_type select[id="ratesType"]');
        self.RATES_TYPE_NAMES.forEach(function(element, index) {
            ratesTypeListElement.append(`<option value="${index}">${element}</option>`);
        });
        ratesTypeListElement.val(self.currentRatesType);

        const ratesSmoothnessInputElement = $('.rates_smoothness input[id="ratesSmoothness"]');
        ratesSmoothnessInputElement.val(FC.RC_TUNING.rates_smoothness);

        self.changeRatesLogo();
        self.initRatesSystem();
    }

    function form_to_data() {

        // Rates type
        FC.RC_TUNING.rates_type = parseInt($('.rates_type select[id="ratesType"]').val());

        // Rates smoothness
        FC.RC_TUNING.rates_smoothness = parseInt($('.rates_smoothness input[id="ratesSmoothness"]').val());

        // catch RC_tuning changes
        const roll_pitch_rate_e = $('.rates_setup input[name="roll_pitch_rate"]');
        const pitch_rate_e = $('.rates_setup input[name="pitch_rate"]');
        const roll_rate_e = $('.rates_setup input[name="roll_rate"]');
        const yaw_rate_e = $('.rates_setup input[name="yaw_rate"]');
        const collective_rate_e = $('.rates_setup input[name="collective_rate"]');
        const rc_rate_pitch_e = $('.rates_setup input[name="rc_rate_pitch"]');
        const rc_rate_e = $('.rates_setup input[name="rc_rate"]');
        const rc_rate_yaw_e = $('.rates_setup input[name="rc_rate_yaw"]');
        const rc_rate_collective_e = $('.rates_setup input[name="rc_rate_collective"]');
        const rc_pitch_expo_e = $('.rates_setup input[name="rc_pitch_expo"]');
        const rc_expo_e = $('.rates_setup input[name="rc_expo"]');
        const rc_yaw_expo_e = $('.rates_setup input[name="rc_yaw_expo"]');
        const rc_collective_expo_e = $('.rates_setup input[name="rc_collective_expo"]');

        FC.RC_TUNING.roll_pitch_rate = parseFloat(roll_pitch_rate_e.val());
        FC.RC_TUNING.RC_RATE = parseFloat(rc_rate_e.val());
        FC.RC_TUNING.roll_rate = parseFloat(roll_rate_e.val());
        FC.RC_TUNING.pitch_rate = parseFloat(pitch_rate_e.val());
        FC.RC_TUNING.yaw_rate = parseFloat(yaw_rate_e.val());
        FC.RC_TUNING.collective_rate = parseFloat(collective_rate_e.val());
        FC.RC_TUNING.RC_EXPO = parseFloat(rc_expo_e.val());
        FC.RC_TUNING.RC_YAW_EXPO = parseFloat(rc_yaw_expo_e.val());
        FC.RC_TUNING.rcYawRate = parseFloat(rc_rate_yaw_e.val());
        FC.RC_TUNING.rcPitchRate = parseFloat(rc_rate_pitch_e.val());
        FC.RC_TUNING.RC_PITCH_EXPO = parseFloat(rc_pitch_expo_e.val());
        FC.RC_TUNING.rcCollectiveRate = parseFloat(rc_rate_collective_e.val());
        FC.RC_TUNING.RC_COLLECTIVE_EXPO = parseFloat(rc_collective_expo_e.val());

        switch (self.currentRatesType) {
            case self.RATES_TYPE.RACEFLIGHT:
                FC.RC_TUNING.pitch_rate         /= 100;
                FC.RC_TUNING.roll_rate          /= 100;
                FC.RC_TUNING.yaw_rate           /= 100;
                FC.RC_TUNING.collective_rate    /= 100;
                FC.RC_TUNING.rcPitchRate        /= 1000;
                FC.RC_TUNING.RC_RATE            /= 1000;
                FC.RC_TUNING.rcYawRate          /= 1000;
                FC.RC_TUNING.rcCollectiveRate   /= 12;
                FC.RC_TUNING.RC_PITCH_EXPO      /= 100;
                FC.RC_TUNING.RC_EXPO            /= 100;
                FC.RC_TUNING.RC_YAW_EXPO        /= 100;
                FC.RC_TUNING.RC_COLLECTIVE_EXPO /= 100;
                break;

            case self.RATES_TYPE.ACTUAL:
                FC.RC_TUNING.pitch_rate         /= 1000;
                FC.RC_TUNING.roll_rate          /= 1000;
                FC.RC_TUNING.yaw_rate           /= 1000;
                FC.RC_TUNING.collective_rate    /= 12;
                FC.RC_TUNING.rcPitchRate        /= 1000;
                FC.RC_TUNING.RC_RATE            /= 1000;
                FC.RC_TUNING.rcYawRate          /= 1000;
                FC.RC_TUNING.rcCollectiveRate   /= 12;
                break;

            case self.RATES_TYPE.QUICKRATES:
                FC.RC_TUNING.pitch_rate         /= 1000;
                FC.RC_TUNING.roll_rate          /= 1000;
                FC.RC_TUNING.yaw_rate           /= 1000;
                FC.RC_TUNING.collective_rate    /= 1000;
                break;

            default: // BetaFlight
                break;
        }
    }

    function drawAxes(curveContext, width, height) {
        curveContext.strokeStyle = '#000000';
        curveContext.lineWidth = 4;

        // Horizontal
        curveContext.beginPath();
        curveContext.moveTo(0, height / 2);
        curveContext.lineTo(width, height / 2);
        curveContext.stroke();

        // Vertical
        curveContext.beginPath();
        curveContext.moveTo(width / 2, 0);
        curveContext.lineTo(width / 2, height);
        curveContext.stroke();
    }

    self.rateCurve = new RateCurve2();

    function printMaxAngularVel(rate, rcRate, rcExpo, useSuperExpo, deadband, limit, maxAngularVelElement, isCollective) {
        const maxAngularVel = self.rateCurve.getMaxAngularVel(self.currentRatesType, rate, rcRate, rcExpo, useSuperExpo, deadband, limit);
        maxAngularVelElement.text(isCollective ? self.convertToCollective(maxAngularVel) : maxAngularVel.toFixed(0));
        return maxAngularVel;
    }

    function drawCurve(rate, rcRate, rcExpo, useSuperExpo, deadband, limit, maxAngularVel, colour, yOffset, context) {
        context.save();
        context.strokeStyle = colour;
        context.translate(0, yOffset);
        self.rateCurve.draw(self.currentRatesType, rate, rcRate, rcExpo, useSuperExpo, deadband, limit, maxAngularVel, context);
        context.restore();
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks
        data_to_form();

        // Hide the buttons toolbar
        $('.tab-rates').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-rates').removeClass('toolbar_hidden');
                $('#copyProfile').addClass('disabled');
            }
        }

        function activateRateProfile(profile) {
            FC.CONFIG.rateProfile = profile;
            MSP.promise(MSPCodes.MSP_SELECT_SETTING, [profile + self.RATE_PROFILE_MASK]).
                then(function () {
                    GUI.log(i18n.getMessage('rateSetupActivateProfile', [profile + 1]));
                    GUI.tab_switch_reload();
                });
        }

        self.TAB_NAMES.forEach(function(element, index) {
            $('.tab-rates .tab-container .' + element).on('click', () => GUI.tab_switch_allowed(() => activateRateProfile(index)));
        });

        // Getting the DOM elements for curve display
        const rcCurveElement = $('.rate_curve canvas#rate_curve_layer0').get(0);
        const curveContext = rcCurveElement.getContext("2d");
        let updateNeeded = true;
        let maxAngularVel;

        // make these variables global scope so that they can be accessed by the updateRates function.
        self.maxAngularVelRollElement    = $('.rates_setup .maxAngularVelRoll');
        self.maxAngularVelPitchElement   = $('.rates_setup .maxAngularVelPitch');
        self.maxAngularVelYawElement     = $('.rates_setup .maxAngularVelYaw');
        self.maxCollectiveAngleElement   = $('.rates_setup .maxCollectiveAngle');

        rcCurveElement.width = 1000;
        rcCurveElement.height = 1000;

        function updateRates (event) {

            function checkInput(element) {
                let value = parseFloat(element.val());
                if (value < parseFloat(element.prop('min')) || value > parseFloat(element.prop('max'))) {
                    value = undefined;
                }
                return value;
            }

            setTimeout(function () { // let global validation trigger and adjust the values first
                if (event) {
                    const targetElement = $(event.target);
                    let targetValue = checkInput(targetElement);

                    if (self.currentRates.hasOwnProperty(targetElement.attr('name')) && targetValue !== undefined) {
                        const stepValue = parseFloat(targetElement.prop('step'));
                        if (stepValue != null) {
                            targetValue = Math.round(targetValue / stepValue) * stepValue;
                        }
                        self.currentRates[targetElement.attr('name')] = targetValue;
                        updateNeeded = true;
                    }

                    if (targetElement.attr('id') === 'ratesType') {
                        self.changeRatesType(targetValue);
                        updateNeeded = true;
                    }

                } else {
                    updateNeeded = true;
                }

                if (updateNeeded) {
                    const curveHeight = rcCurveElement.height;
                    const curveWidth = rcCurveElement.width;
                    const lineScale = curveContext.canvas.width / curveContext.canvas.clientWidth;

                    curveContext.clearRect(0, 0, curveWidth, curveHeight);

                    maxAngularVel = Math.max(
                        printMaxAngularVel(self.currentRates.roll_rate, self.currentRates.rc_rate, self.currentRates.rc_expo, self.currentRates.superexpo, self.currentRates.deadband, self.currentRates.roll_rate_limit, self.maxAngularVelRollElement),
                        printMaxAngularVel(self.currentRates.pitch_rate, self.currentRates.rc_rate_pitch, self.currentRates.rc_pitch_expo, self.currentRates.superexpo, self.currentRates.deadband, self.currentRates.pitch_rate_limit, self.maxAngularVelPitchElement),
                        printMaxAngularVel(self.currentRates.yaw_rate, self.currentRates.rc_rate_yaw, self.currentRates.rc_yaw_expo, self.currentRates.superexpo, self.currentRates.yawDeadband, self.currentRates.yaw_rate_limit, self.maxAngularVelYawElement));

                    // make maxAngularVel multiple of 200deg/s so that the auto-scale doesn't keep changing for small changes of the maximum curve
                    maxAngularVel = self.rateCurve.setMaxAngularVel(maxAngularVel);

                    drawAxes(curveContext, curveWidth, curveHeight);

                    curveContext.lineWidth = 2 * lineScale;
                    drawCurve(self.currentRates.roll_rate, self.currentRates.rc_rate, self.currentRates.rc_expo, self.currentRates.superexpo, self.currentRates.deadband, self.currentRates.roll_rate_limit, maxAngularVel, '#ff0000', -6, curveContext);
                    drawCurve(self.currentRates.pitch_rate, self.currentRates.rc_rate_pitch, self.currentRates.rc_pitch_expo, self.currentRates.superexpo, self.currentRates.deadband, self.currentRates.pitch_rate_limit, maxAngularVel, '#00ff00', -2, curveContext);
                    drawCurve(self.currentRates.yaw_rate, self.currentRates.rc_rate_yaw, self.currentRates.rc_yaw_expo, self.currentRates.superexpo, self.currentRates.yawDeadband, self.currentRates.yaw_rate_limit, maxAngularVel, '#0000ff', 2, curveContext);

                    self.maxCollectiveAngle = printMaxAngularVel(self.currentRates.collective_rate, self.currentRates.rc_rate_collective, self.currentRates.rc_collective_expo, self.currentRates.superexpo, 0, self.currentRates.collective_rate_limit, self.maxCollectiveAngleElement, true);
                    drawCurve(self.currentRates.collective_rate, self.currentRates.rc_rate_collective, self.currentRates.rc_collective_expo, self.currentRates.superexpo, 0, self.currentRates.collective_rate_limit, self.maxCollectiveAngle, '#ffbb00', 6, curveContext);

                    self.updateRatesLabels();

                    updateNeeded = false;
                }
            }, 0);
        }

        $('.rates_change').on('input change', updateRates).trigger('input');

        const dialogResetProfile = $('.dialogResetProfile')[0];

        $('#resetProfile').click(function() {
            dialogResetProfile.showModal();
        });

        $('.dialogResetProfile-cancelbtn').click(function() {
            dialogResetProfile.close();
        });

        $('.dialogResetProfile-confirmbtn').click(function() {
            dialogResetProfile.close();
            self.previousRatesType = null;
            self.changeRatesLogo();
            self.initRatesSystem();
            setDirty();
        });

        const dialogCopyProfile = $('.dialogCopyProfile')[0];
        const selectRateProfile = $('.selectRateProfile');

        $.each(self.TAB_NAMES, function(key, value) {
            if (key != self.currentRateProfile) {
                const tabIndex = key + 1;
                selectRateProfile.append(new Option(i18n.getMessage(`rateSetupSubTab${tabIndex}`), key));
            }
        });

        $('#copyProfile').click(function() {
            if (!self.isDirty) {
                dialogCopyProfile.showModal();
            }
        });

        $('.dialogCopyProfile-cancelbtn').click(function() {
            dialogCopyProfile.close();
        });

        $('.dialogCopyProfile-confirmbtn').click(function() {
            FC.COPY_PROFILE.type = 1;
            FC.COPY_PROFILE.dstProfile = parseInt(selectRateProfile.val());
            FC.COPY_PROFILE.srcProfile = FC.CONFIG.rateProfile;

            MSP.send_message(MSPCodes.MSP_COPY_PROFILE, mspHelper.crunch(MSPCodes.MSP_COPY_PROFILE), false, function () {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                    GUI.log(i18n.getMessage('eepromSaved'));
                    dialogCopyProfile.close();
                });
            });
        });

        const dialogProfileChange = $('.dialogProfileChange')[0];

        $('.dialogProfileChangeConfirmBtn').click(function() {
            dialogProfileChange.close();
            GUI.tab_switch_reload();
            GUI.log(i18n.getMessage('rateSetupActivateProfile', [FC.CONFIG.rateProfile + 1]));
        });

        self.save = function (callback) {
            form_to_data();
            save_data(callback);
        };

        self.revert = function (callback) {
            callback();
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        $('.subtab-rates').change(function () {
            setDirty();
        });

        self.initRatesPreview();
        self.renderModel();

        function get_status_data() {
            MSP.send_message(MSPCodes.MSP_STATUS, false, false, function() {
                if (self.currentRateProfile != FC.CONFIG.rateProfile && !dialogProfileChange.hasAttribute('open')) {
                    if (self.isDirty) {
                        dialogProfileChange.showModal();
                    } else {
                        GUI.tab_switch_reload();
                        GUI.log(i18n.getMessage('rateSetupActivateProfile', [FC.CONFIG.rateProfile + 1]));
                    }
                }
            });
        }

        function get_receiver_data() {
            MSP.send_message(MSPCodes.MSP_RC, false, false);
        }

        GUI.interval_add('receiver_pull', get_receiver_data, 100, true);
        GUI.interval_add('status_pull', get_status_data, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.rates.convertToCollective = function (rate) {
    const self = this;

    switch (self.currentRatesType) {
        case self.RATES_TYPE.NONE:
        case self.RATES_TYPE.BETAFLIGHT:
        case self.RATES_TYPE.KISS:
        case self.RATES_TYPE.QUICKRATES:
            rate /= 83.33;
            break;
        case self.RATES_TYPE.RACEFLIGHT:
        case self.RATES_TYPE.ACTUAL:
        default:
            break;
    }

    return rate.toFixed(1);
};

TABS.rates.initRatesPreview = function () {
    this.keepRendering = true;

    this.model = new Model($('.rates_preview'), $('.rates_preview canvas'));

    $('.tab-rates .tab-container .tab').on('click', $.proxy(this.model.resize, this.model));
    $('.tab-rates .tab-container .tab').on('click', $.proxy(this.updateRatesLabels, this));

    $(window).on('resize', $.proxy(this.model.resize, this.model));
    $(window).on('resize', $.proxy(this.updateRatesLabels, this));
};

TABS.rates.renderModel = function () {
    if (this.keepRendering) {
        requestAnimationFrame(this.renderModel.bind(this));
    }
    if (!this.clock) {
        this.clock = new THREE.Clock();
    }

    if (FC.RC.channels[0] && FC.RC.channels[1] && FC.RC.channels[2]) {
        const delta = this.clock.getDelta();

        const roll = delta * this.rateCurve.rcCommandRawToDegreesPerSecond(
            FC.RC.channels[0],
            this.currentRatesType,
            this.currentRates.roll_rate,
            this.currentRates.rc_rate,
            this.currentRates.rc_expo,
            this.currentRates.superexpo,
            this.currentRates.deadband,
            this.currentRates.roll_rate_limit
        );
        const pitch = delta * this.rateCurve.rcCommandRawToDegreesPerSecond(
            FC.RC.channels[1],
            this.currentRatesType,
            this.currentRates.pitch_rate,
            this.currentRates.rc_rate_pitch,
            this.currentRates.rc_pitch_expo,
            this.currentRates.superexpo,
            this.currentRates.deadband,
            this.currentRates.pitch_rate_limit
        );
        const yaw = delta * this.rateCurve.rcCommandRawToDegreesPerSecond(
            FC.RC.channels[2],
            this.currentRatesType,
            this.currentRates.yaw_rate,
            this.currentRates.rc_rate_yaw,
            this.currentRates.rc_yaw_expo,
            this.currentRates.superexpo,
            this.currentRates.yawDeadband,
            this.currentRates.yaw_rate_limit
        );

        this.model.rotateBy(-degToRad(pitch), -degToRad(yaw), -degToRad(roll));

        if (this.checkRC()) {
            this.updateRatesLabels();
        }
    }
};

TABS.rates.cleanup = function (callback) {
    const self = this;

    if (self.model) {
        $(window).off('resize', $.proxy(self.model.resize, self.model));
        self.model.dispose();
    }

    $(window).off('resize', $.proxy(this.updateRatesLabels, this));

    self.keepRendering = false;
    self.isDirty = false;

    if (callback) callback();
};

TABS.rates.checkRC = function() {
    // Function monitors for change in the primary axes rc received data and returns true if a change is detected.

    if (!this.oldRC) {
        this.oldRC = [ FC.RC.channels[0], FC.RC.channels[1], FC.RC.channels[2] ];
    }

    // Monitor FC.RC.channels and detect change of value;
    let rateCurveUpdateRequired = false;
    for (let i = 0; i < this.oldRC.length; i++) { // has the value changed ?
        if (this.oldRC[i] !== FC.RC.channels[i]) {
            this.oldRC[i] = FC.RC.channels[i];
            rateCurveUpdateRequired = true;     // yes, then an update of the values displayed on the rate curve graph is required
        }
    }
    return rateCurveUpdateRequired;
};

TABS.rates.updateRatesLabels = function() {
    const self = this;

    if (self.rateCurve.maxAngularVel) {

        const drawAxisLabel = function(context, axisLabel, x, y, align, color) {
            context.fillStyle = color || '#000000' ;
            context.textAlign = align || 'center';
            context.fillText(axisLabel, x, y);
        };

        const drawBalloonLabel = function(context, axisLabel, x, y, align, colors, dirty) {

            /**
             * curveContext is the canvas to draw on
             * axisLabel is the string to display in the center of the balloon
             * x, y are the coordinates of the point of the balloon
             * align is whether the balloon appears to the left (align 'right') or right (align left) of the x,y coordinates
             * colors is an object defining color, border and text are the fill color, border color and text color of the balloon
             */

            const DEFAULT_OFFSET        = 125; // in canvas scale; this is the horizontal length of the pointer
            const DEFAULT_RADIUS        = 10; // in canvas scale, this is the radius around the balloon
            const DEFAULT_MARGIN        = 5;  // in canvas scale, this is the margin around the balloon when it overlaps

            const fontSize = parseInt(context.font);

            // calculate the width and height required for the balloon
            const width = (context.measureText(axisLabel).width * 1.2);
            const height = fontSize * 1.5; // the balloon is bigger than the text height
            const pointerY = y; // always point to the required Y
            // coordinate, even if we move the balloon itself to keep it on the canvas

            // setup balloon background
            context.fillStyle   = colors.color   || '#ffffff' ;
            context.strokeStyle = colors.border  || '#000000' ;

            // correct x position to account for window scaling
            x *= context.canvas.clientWidth/context.canvas.clientHeight;

            // adjust the coordinates for determine where the balloon background should be drawn
            x += ((align=='right') ? -(width + DEFAULT_OFFSET) : 0) + ((align=='left') ? DEFAULT_OFFSET : 0);
            y -= (height / 2); if (y < 0) y = 0; else if (y > context.height) y = context.height; // prevent balloon from going out of canvas

            // check that the balloon does not already overlap
            for (let i = 0; i < dirty.length; i++) {
                if ((x >= dirty[i].left && x <= dirty[i].right) || (x + width >= dirty[i].left && x + width <= dirty[i].right)) { // does it overlap horizontally
                    if ((y >= dirty[i].top && y<= dirty[i].bottom) || (y + height >= dirty[i].top && y + height <= dirty[i].bottom )) { // this overlaps another balloon
                        // snap above or snap below
                        if (y <= (dirty[i].bottom - dirty[i].top) / 2 && (dirty[i].top - height) > 0) {
                            y = dirty[i].top - height;
                        } else { // snap down
                            y = dirty[i].bottom;
                        }
                    }
                }
            }

            // Add the draw area to the dirty array
            dirty.push({left:x, right:x+width, top:y-DEFAULT_MARGIN, bottom:y+height+DEFAULT_MARGIN});

            const pointerLength =  (height - 2 * DEFAULT_RADIUS ) / 6;

            context.beginPath();
            context.moveTo(x + DEFAULT_RADIUS, y);
            context.lineTo(x + width - DEFAULT_RADIUS, y);
            context.quadraticCurveTo(x + width, y, x + width, y + DEFAULT_RADIUS);

            if (align === 'right') { // point is to the right
                context.lineTo(x + width, y + DEFAULT_RADIUS + pointerLength);
                context.lineTo(x + width + DEFAULT_OFFSET, pointerY);  // point
                context.lineTo(x + width, y + height - DEFAULT_RADIUS - pointerLength);
            }
            context.lineTo(x + width, y + height - DEFAULT_RADIUS);

            context.quadraticCurveTo(x + width, y + height, x + width - DEFAULT_RADIUS, y + height);
            context.lineTo(x + DEFAULT_RADIUS, y + height);
            context.quadraticCurveTo(x, y + height, x, y + height - DEFAULT_RADIUS);

            if (align === 'left') { // point is to the left
                context.lineTo(x, y + height - DEFAULT_RADIUS - pointerLength);
                context.lineTo(x - DEFAULT_OFFSET, pointerY); // point
                context.lineTo(x, y + DEFAULT_RADIUS - pointerLength);
            }
            context.lineTo(x, y + DEFAULT_RADIUS);

            context.quadraticCurveTo(x, y, x + DEFAULT_RADIUS, y);
            context.closePath();

            context.fill();
            context.stroke();

            drawAxisLabel(context, axisLabel, x + (width/2), y + (height + fontSize)/2 - 4, 'center', colors.text);
        };

        const BALLOON_COLORS = {
            roll    : {color: 'rgba(255,128,128,0.4)', border: 'rgba(255,128,128,0.6)', text: '#000000'},
            pitch   : {color: 'rgba(128,255,128,0.4)', border: 'rgba(128,255,128,0.6)', text: '#000000'},
            yaw     : {color: 'rgba(128,128,255,0.4)', border: 'rgba(128,128,255,0.6)', text: '#000000'},
            collective : {color: 'rgba(255,187,0,0.4)', border: 'rgba(255,187,0,0.6)', text: '#000000'}
        };

        const rcStickElement = $('.rate_curve canvas#rate_curve_layer1').get(0);
        if (rcStickElement) {
            rcStickElement.width = 1000;
            rcStickElement.height = 1000;

            const stickContext = rcStickElement.getContext("2d");

            stickContext.save();

            const maxAngularVelRoll   = self.maxAngularVelRollElement.text();
            const maxAngularVelPitch  = self.maxAngularVelPitchElement.text();
            const maxAngularVelYaw    = self.maxAngularVelYawElement.text();
            const maxCollectiveAngleText = self.maxCollectiveAngleElement.text();
            const curveHeight         = rcStickElement.height;
            const curveWidth          = rcStickElement.width;
            const maxAngularVel       = self.rateCurve.maxAngularVel;
            const windowScale         = (400 / stickContext.canvas.clientHeight);
            const rateScale           = (curveHeight / 2) / maxAngularVel;
            const lineScale           = stickContext.canvas.width / stickContext.canvas.clientWidth;
            const textScale           = stickContext.canvas.clientHeight / stickContext.canvas.clientWidth;

            let currentValues         = [];
            let balloonsDirty         = [];

            stickContext.clearRect(0, 0, curveWidth, curveHeight);

            // calculate the fontSize based upon window scaling
            if (windowScale <= 1) {
                stickContext.font = "24pt Verdana, Arial, sans-serif";
            } else {
                stickContext.font = (24 * windowScale) + "pt Verdana, Arial, sans-serif";
            }

            const drawStickPositions = FC.RC.channels[0] && FC.RC.channels[1] && FC.RC.channels[2] && FC.RC.channels[3];

            if (drawStickPositions) {
                currentValues.push(self.rateCurve.drawStickPosition(FC.RC.channels[0], self.currentRatesType, self.currentRates.roll_rate, self.currentRates.rc_rate, self.currentRates.rc_expo, self.currentRates.superexpo, self.currentRates.deadband, self.currentRates.roll_rate_limit, maxAngularVel, stickContext, '#FF8080'));
                currentValues.push(self.rateCurve.drawStickPosition(FC.RC.channels[1], self.currentRatesType, self.currentRates.pitch_rate, self.currentRates.rc_rate_pitch, self.currentRates.rc_pitch_expo, self.currentRates.superexpo, self.currentRates.deadband, self.currentRates.pitch_rate_limit, maxAngularVel, stickContext, '#80FF80'));
                currentValues.push(self.rateCurve.drawStickPosition(FC.RC.channels[2], self.currentRatesType, self.currentRates.yaw_rate, self.currentRates.rc_rate_yaw, self.currentRates.rc_yaw_expo, self.currentRates.superexpo, self.currentRates.yawDeadband, self.currentRates.yaw_rate_limit, maxAngularVel, stickContext, '#8080FF'));
                currentValues.push(self.rateCurve.drawStickPosition(FC.RC.channels[3], self.currentRatesType, self.currentRates.collective_rate, self.currentRates.rc_rate_collective, self.currentRates.rc_collective_expo, self.currentRates.superexpo, 0, self.currentRates.collective_rate_limit, self.maxCollectiveAngle, stickContext, '#FFBB00'));
            } else {
                currentValues = [];
            }

            stickContext.lineWidth = lineScale;

            // use a custom scale so that the text does not appear stretched
            stickContext.scale(textScale, 1);

            // add the maximum range label
            drawAxisLabel(stickContext, maxAngularVel.toFixed(0) + ' deg/s', ((curveWidth / 2) - 10) / textScale, parseInt(stickContext.font)*1.2, 'right');

            // and then the balloon labels.
            balloonsDirty = []; // reset the dirty balloon draw area (for overlap detection)
            // create an array of balloons to draw
            const balloons = [
                {value: maxAngularVelRoll, balloon: function() {drawBalloonLabel(stickContext, maxAngularVelRoll + ' deg/s',  curveWidth, rateScale * (maxAngularVel - parseInt(maxAngularVelRoll)),  'right', BALLOON_COLORS.roll, balloonsDirty);}},
                {value: maxAngularVelPitch, balloon: function() {drawBalloonLabel(stickContext, maxAngularVelPitch + ' deg/s', curveWidth, rateScale * (maxAngularVel - parseInt(maxAngularVelPitch)), 'right', BALLOON_COLORS.pitch, balloonsDirty);}},
                {value: maxAngularVelYaw, balloon: function() {drawBalloonLabel(stickContext, maxAngularVelYaw + ' deg/s',   curveWidth, rateScale * (maxAngularVel - parseInt(maxAngularVelYaw)),   'right', BALLOON_COLORS.yaw, balloonsDirty);}},
                {value: 10000, balloon: function() {drawBalloonLabel(stickContext, maxCollectiveAngleText + ' deg', curveWidth, 0,   'right', BALLOON_COLORS.collective, balloonsDirty);}}
            ];

            // and sort them in descending order so the largest value is at the top always
            balloons.sort(function(a,b) {return (b.value - a.value);});

            // add the current rc values
            if (drawStickPositions) {
                balloons.push(
                    {value: currentValues[3], balloon: function() {drawBalloonLabel(stickContext, self.convertToCollective(currentValues[3]) + ' deg', 10, 50,  'none', BALLOON_COLORS.collective, balloonsDirty);}},
                    {value: currentValues[0], balloon: function() {drawBalloonLabel(stickContext, currentValues[0].toFixed(0) + ' deg/s', 10, 150, 'none', BALLOON_COLORS.roll, balloonsDirty);}},
                    {value: currentValues[1], balloon: function() {drawBalloonLabel(stickContext, currentValues[1].toFixed(0) + ' deg/s', 10, 250, 'none', BALLOON_COLORS.pitch, balloonsDirty);}},
                    {value: currentValues[2], balloon: function() {drawBalloonLabel(stickContext, currentValues[2].toFixed(0) + ' deg/s', 10, 350,  'none', BALLOON_COLORS.yaw, balloonsDirty);}}
                );
            }
            // then display them on the chart
            for (const balloon of balloons) {
                balloon.balloon();
            }

            stickContext.restore();
        }
    }
};

TABS.rates.changeRatesType = function(rateTypeID) {
    const self = this;

    const dialogRatesType = $('.dialogRatesType')[0];

    if (!dialogRatesType.hasAttribute('open')) {

        dialogRatesType.showModal();

        $('.dialogRatesType-cancelbtn').click(function() {
            $('.rates_type select[id="ratesType"]').val(self.currentRatesType);
            self.previousRatesType = self.currentRatesType;
            dialogRatesType.close();
        });

        $('.dialogRatesType-confirmbtn').click(function() {
            self.currentRatesType = rateTypeID;
            self.changeRatesLogo();
            self.initRatesSystem();
            dialogRatesType.close();
        });
    }
};

TABS.rates.initRatesSystem = function() {
    const self = this;

    let rcRateDef, rcRateMax, rcRateMin, rcRateStep, rcRateDec;
    let rateDef, rateMax, rateStep, rateDec;
    let expoDef, expoMax, expoStep, expoDec;
    let rcColDef, rcColMax, rcColMin, rcColStep, rcColDec;
    let colDef, colMax, colStep, colDec;

    let rcRateLabel, rateLabel, rcExpoLabel;

    const rateMin = 0;
    const expoMin = 0;
    const colMin = 0;

    switch (self.currentRatesType) {

        case self.RATES_TYPE.RACEFLIGHT:
            rcRateLabel = "rateSetupRcRateRaceflight";
            rateLabel   = "rateSetupRateRaceflight";
            rcExpoLabel = "rateSetupRcExpoRaceflight";

            rcRateDec   = 0;
            rcRateDef   = 360;
            rcRateMax   = 1000;
            rcRateMin   = 10;
            rcRateStep  = 10;
            rateDec     = 0;
            rateDef     = 0;
            rateMax     = 255;
            rateStep    = 1;
            rcColDec    = 1;
            rcColDef    = 12;
            rcColMax    = 20;
            rcColMin    = 0;
            rcColStep   = 0.1;
            colDec      = 0;
            colDef      = 0;
            colMax      = 255;
            colStep     = 1;
            expoDec     = 0;
            expoDef     = 0;
            expoMax     = 100;
            expoStep    = 1;

            break;

        case self.RATES_TYPE.KISS:
            rcRateLabel = "rateSetupRcRate";
            rateLabel   = "rateSetupRcRateRaceflight";
            rcExpoLabel = "rateSetupRcExpoKISS";

            rcRateDec   = 2;
            rcRateDef   = 1.80;
            rcRateMax   = 2.55;
            rcRateMin   = 0.01;
            rcRateStep  = 0.01;
            rateDec     = 2;
            rateDef     = 0.00;
            rateMax     = 0.99;
            rateStep    = 0.01;
            rcColDec    = 2;
            rcColDef    = 2.55;
            rcColMax    = 2.55;
            rcColMin    = 0.01;
            rcColStep   = 0.01;
            colDec      = 2;
            colDef      = 0.49;
            colMax      = 0.99;
            colStep     = 0.01;
            expoDec     = 2;
            expoDef     = 0.00;
            expoMax     = 1.00;
            expoStep    = 0.01;

            break;

        case self.RATES_TYPE.ACTUAL:
            rcRateLabel = "rateSetupRcRateActual";
            rateLabel   = "rateSetupRateQuickRates";
            rcExpoLabel = "rateSetupRcExpoRaceflight";

            rcRateDec   = 0;
            rcRateDef   = 360;
            rcRateMax   = 1000;
            rcRateMin   = 10;
            rcRateStep  = 10;
            rateDec     = 0;
            rateDef     = 360;
            rateMax     = 1000;
            rateStep    = 10;
            rcColDec    = 1;
            rcColDef    = 12;
            rcColMax    = 20;
            rcColMin    = 0;
            rcColStep   = 0.1;
            colDec      = 1;
            colDef      = 12;
            colMax      = 20;
            colStep     = 0.1;
            expoDec     = 2;
            expoDef     = 0.00;
            expoMax     = 1.00;
            expoStep    = 0.01;

            break;

        case self.RATES_TYPE.QUICKRATES:
            rcRateLabel = "rateSetupRcRate";
            rateLabel   = "rateSetupRateQuickRates";
            rcExpoLabel = "rateSetupRcExpoRaceflight";

            rcRateDec   = 2;
            rcRateDef   = 1.80;
            rcRateMax   = 2.55;
            rcRateMin   = 0.01;
            rcRateStep  = 0.01;
            rateDec     = 0;
            rateDef     = 360;
            rateMax     = 1000;
            rateStep    = 10;
            rcColDec    = 2;
            rcColDef    = 2.55;
            rcColMax    = 2.55;
            rcColMin    = 0.01;
            rcColStep   = 0.01;
            colDec      = 0;
            colDef      = 1000;
            colMax      = 1000;
            colStep     = 10;
            expoDec     = 2;
            expoDef     = 0.00;
            expoMax     = 1.00;
            expoStep    = 0.01;

            break;

        case self.RATES_TYPE.BETAFLIGHT:
            rcRateLabel = "rateSetupRcRate";
            rateLabel   = "rateSetupRate";
            rcExpoLabel = "rateSetupRcExpo";

            rcRateDec   = 2;
            rcRateDef   = 1.80;
            rcRateMax   = 2.55;
            rcRateMin   = 0.01;
            rcRateStep  = 0.01;
            rateDec     = 2;
            rateDef     = 0.00;
            rateMax     = 0.99;
            rateStep    = 0.01;
            rcColDec    = 2;
            rcColDef    = 2.19;
            rcColMax    = 2.55;
            rcColMin    = 0.01;
            rcColStep   = 0.01;
            colDec      = 2;
            colDef      = 0.01;
            colMax      = 0.99;
            colStep     = 0.01;
            expoDec     = 2;
            expoDef     = 0.00;
            expoMax     = 1.00;
            expoStep    = 0.01;

            break;

        default:
                rcRateLabel = "rateSetupRcRate";
                rateLabel   = "rateSetupRate";
                rcExpoLabel = "rateSetupRcExpo";

                rcRateDec   = 0;
                rcRateDef   = 0;
                rcRateMax   = 0;
                rcRateMin   = 0;
                rcRateStep  = 0;
                rateDec     = 0;
                rateDef     = 0;
                rateMax     = 0;
                rateStep    = 0;
                rcColDec    = 0;
                rcColDef    = 0;
                rcColMax    = 0;
                rcColMin    = 0;
                rcColStep   = 0;
                colDec      = 0;
                colDef      = 0;
                colMax      = 0;
                colStep     = 0;
                expoDec     = 0;
                expoDef     = 0;
                expoMax     = 0;
                expoStep    = 0;

                break;
        }

    self.currentRates = {
        roll_rate:         FC.RC_TUNING.roll_rate,
        pitch_rate:        FC.RC_TUNING.pitch_rate,
        yaw_rate:          FC.RC_TUNING.yaw_rate,
        collective_rate:   FC.RC_TUNING.collective_rate,
        rc_rate:           FC.RC_TUNING.RC_RATE,
        rc_rate_yaw:       FC.RC_TUNING.rcYawRate,
        rc_expo:           FC.RC_TUNING.RC_EXPO,
        rc_yaw_expo:       FC.RC_TUNING.RC_YAW_EXPO,
        rc_rate_pitch:     FC.RC_TUNING.rcPitchRate,
        rc_pitch_expo:     FC.RC_TUNING.RC_PITCH_EXPO,
        rc_rate_collective: FC.RC_TUNING.rcCollectiveRate,
        rc_collective_expo: FC.RC_TUNING.RC_COLLECTIVE_EXPO,
        roll_rate_limit:   FC.RC_TUNING.roll_rate_limit,
        pitch_rate_limit:  FC.RC_TUNING.pitch_rate_limit,
        yaw_rate_limit:    FC.RC_TUNING.yaw_rate_limit,
        collective_rate_limit: FC.RC_TUNING.collective_rate_limit,
        deadband:          FC.RC_DEADBAND_CONFIG.deadband,
        yawDeadband:       FC.RC_DEADBAND_CONFIG.yaw_deadband,
        superexpo:         true
    };

    switch (self.currentRatesType) {

        case self.RATES_TYPE.RACEFLIGHT:
            self.currentRates.roll_rate          *= 100;
            self.currentRates.pitch_rate         *= 100;
            self.currentRates.yaw_rate           *= 100;
            self.currentRates.collective_rate    *= 100;
            self.currentRates.rc_rate            *= 1000;
            self.currentRates.rc_rate_yaw        *= 1000;
            self.currentRates.rc_rate_collective *= 12;
            self.currentRates.rc_rate_pitch      *= 1000;
            self.currentRates.rc_expo            *= 100;
            self.currentRates.rc_yaw_expo        *= 100;
            self.currentRates.rc_collective_expo *= 100;
            self.currentRates.rc_pitch_expo      *= 100;
            break;

        case self.RATES_TYPE.ACTUAL:
            self.currentRates.roll_rate          *= 1000;
            self.currentRates.pitch_rate         *= 1000;
            self.currentRates.yaw_rate           *= 1000;
            self.currentRates.collective_rate    *= 12;
            self.currentRates.rc_rate            *= 1000;
            self.currentRates.rc_rate_yaw        *= 1000;
            self.currentRates.rc_rate_collective *= 12;
            self.currentRates.rc_rate_pitch      *= 1000;
            break;

        case self.RATES_TYPE.QUICKRATES:
            self.currentRates.roll_rate          *= 1000;
            self.currentRates.pitch_rate         *= 1000;
            self.currentRates.yaw_rate           *= 1000;
            self.currentRates.collective_rate    *= 1000;
            break;

        default:
            break;
    }

    // Set defaults if type changed
    if (self.currentRatesType !== self.previousRatesType) {
        self.currentRates.roll_rate     = rateDef;
        self.currentRates.pitch_rate    = rateDef;
        self.currentRates.yaw_rate      = rateDef;
        self.currentRates.collective_rate = colDef;
        self.currentRates.rc_rate       = rcRateDef;
        self.currentRates.rc_rate_yaw   = rcRateDef;
        self.currentRates.rc_rate_pitch = rcRateDef;
        self.currentRates.rc_rate_collective = rcColDef;
        self.currentRates.rc_expo       = expoDef;
        self.currentRates.rc_yaw_expo   = expoDef;
        self.currentRates.rc_pitch_expo = expoDef;
        self.currentRates.rc_collective_expo = expoDef;
    }

    const rcRateLabel_e = $('.rates_setup .rates_titlebar .rc_rate');
    const rateLabel_e = $('.rates_setup .rates_titlebar .rate');
    const rcExpoLabel_e = $('.rates_setup .rates_titlebar .rc_expo');

    rcRateLabel_e.text(i18n.getMessage(rcRateLabel));
    rateLabel_e.text(i18n.getMessage(rateLabel));
    rcExpoLabel_e.text(i18n.getMessage(rcExpoLabel));

    const pitch_rate_e = $('.rates_setup input[name="pitch_rate"]');
    const roll_rate_e = $('.rates_setup input[name="roll_rate"]');
    const yaw_rate_e = $('.rates_setup input[name="yaw_rate"]');
    const collective_rate_e = $('.rates_setup input[name="collective_rate"]');
    const rc_rate_pitch_e = $('.rates_setup input[name="rc_rate_pitch"]');
    const rc_rate_e = $('.rates_setup input[name="rc_rate"]');
    const rc_rate_yaw_e = $('.rates_setup input[name="rc_rate_yaw"]');
    const rc_rate_collective_e = $('.rates_setup input[name="rc_rate_collective"]');
    const rc_expo_e = $('.rates_setup input[name="rc_expo"]');
    const rc_pitch_expo_e = $('.rates_setup input[name="rc_pitch_expo"]');
    const rc_yaw_expo_e = $('.rates_setup input[name="rc_yaw_expo"]');
    const rc_collective_expo_e = $('.rates_setup input[name="rc_collective_expo"]');

    pitch_rate_e.val(self.currentRates.pitch_rate.toFixed(rateDec));
    roll_rate_e.val(self.currentRates.roll_rate.toFixed(rateDec));
    yaw_rate_e.val(self.currentRates.yaw_rate.toFixed(rateDec));
    collective_rate_e.val(self.currentRates.collective_rate.toFixed(colDec));
    rc_rate_pitch_e.val(self.currentRates.rc_rate_pitch.toFixed(rcRateDec));
    rc_rate_e.val(self.currentRates.rc_rate.toFixed(rcRateDec));
    rc_rate_yaw_e.val(self.currentRates.rc_rate_yaw.toFixed(rcRateDec));
    rc_rate_collective_e.val(self.currentRates.rc_rate_collective.toFixed(rcColDec));
    rc_pitch_expo_e.val(self.currentRates.rc_pitch_expo.toFixed(expoDec));
    rc_expo_e.val(self.currentRates.rc_expo.toFixed(expoDec));
    rc_yaw_expo_e.val(self.currentRates.rc_yaw_expo.toFixed(expoDec));
    rc_collective_expo_e.val(self.currentRates.rc_collective_expo.toFixed(expoDec));

    const rc_rate_input_c = $('.rates_setup input[class="rc_rate_input"]');
    const rate_input_c = $('.rates_setup input[class="rate_input"]');
    const expo_input_c = $('.rates_setup input[class="expo_input"]');

    rc_rate_input_c.attr({"max":rcRateMax, "min":rcRateMin, "step":rcRateStep}).change();
    rate_input_c.attr({"max":rateMax, "min":rateMin, "step":rateStep}).change();
    expo_input_c.attr({"max":expoMax, "min":expoMin, "step":expoStep}).change();

    const rc_collective_input_c = $('.rates_setup input[class="rc_collective_input"]');
    rc_collective_input_c.attr({"max":rcColMax, "min":rcColMin, "step":rcColStep}).change();
    const collective_input_c = $('.rates_setup input[class="collective_input"]');
    collective_input_c.attr({"max":colMax, "min":colMin, "step":colStep}).change();

    self.previousRatesType = self.currentRatesType;
};

TABS.rates.changeRatesLogo = function() {
    const self = this;

    const image = self.RATES_TYPE_IMAGES[self.currentRatesType];
    $('.rates_type img[id="ratesLogo"]').attr("src", "./images/rate_logos/" + image);
};

