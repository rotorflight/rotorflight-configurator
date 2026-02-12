import * as noUiSlider from 'nouislider';
import wNumb from 'wnumb';
import semver from 'semver';
import { API_VERSION_12_9 } from '../configurator.svelte.js';

const tab = {
    tabName: 'servos',
    isDirty: false,
    needReboot: false,

    MAX_SERVOS: 8,
    MAX_SERVOS_12_9: 26,
    BUS_SERVO_OFFSET: 8,
    OVERRIDE_OFF: 2001,

    FLAG_REVERSE: 1,
    FLAG_GEOCOR: 2,
};

tab.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_SERIAL_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SERVO_CONFIGURATIONS))
            .then(() => MSP.promise(MSPCodes.MSP_SERVO_OVERRIDE))
            .then(() => MSP.promise(MSPCodes.MSP_SERVO))
            .then(() => {
                // Load bus servo config for API 12.9+
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)) {
                    return MSP.promise(MSPCodes.MSP_BUS_SERVO_CONFIG);
                }
                return Promise.resolve();
            })
            .then(callback);
    }

    function save_data(callback) {
        mspHelper.sendServoConfigurations(function () {
            MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (self.needReboot) {
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                    GUI.log(i18n.getMessage('deviceRebooting'));
                    reinitialiseConnection(callback);
                } else {
                    callback?.();
                }
            });
        });
    }

    function load_html() {
        $('#content').load("/src/tabs/servos.html", process_html);
    }

    function process_html() {

        // Preserve initial config
        self.prevConfig = self.cloneConfig(FC.SERVO_CONFIG);

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks

        // Hide the buttons toolbar
        $('.tab-servos').addClass('toolbar_hidden');

        self.isDirty = false;

        // Check for API 12.9+ for extended servo support
        const supportsBusServos = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9);
        const maxServos = supportsBusServos ? self.MAX_SERVOS_12_9 : self.MAX_SERVOS;

        // Check if FBUS or SBUS is enabled
        const hasFbusOrSbus = FC.SERIAL_CONFIG.ports.some(port => 
            port.functions.includes('FBUS_OUT') || port.functions.includes('SBUS_OUT')
        );

        // Hide the separate bus servo hint (will be shown in spacer row instead)
        $('.busServoHint').hide();

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-servos').removeClass('toolbar_hidden');
            }
        }

        function setReboot(reboot) {
            self.needReboot = reboot;
            $('.content_toolbar .save_btn').toggle(!reboot);
            $('.content_toolbar .reboot_btn').toggle(reboot);
        }

        $('.servoValueWarning').hide();
        $('.servoRateRebootNote').hide();

        function process_warnings() {

            let unusualScale = false;
            let unusualRate = false;
            let unusualLimit = false;
            let unusualGeoCor = false;

            const SERVOS = FC.SERVO_CONFIG;

            for (let index = 0; index < FC.CONFIG.servoCount; index++) {
                const servo = SERVOS[index];
                if (servo.mid > 860) {
                    if (servo.rate > 433)
                        unusualRate = true;
                    // Unusual: value > 600 ± 25%
                    if (servo.min < -750 || servo.min > -300 || servo.max >  750 || servo.max <  300)
                        unusualLimit = true;
                    if (servo.rneg < 300 || servo.rneg > 750 || servo.rpos < 300 || servo.rpos > 750)
                        unusualScale = true;
                } else {
                    if (servo.rate > 600)
                        unusualRate = true;
                    // Unusual: value > 300 ± 25%
                    if (servo.min < -375 || servo.min > -150 || servo.max > 375 || servo.max <  150)
                        unusualLimit = true;
                    if (servo.rneg < 150 || servo.rneg > 375 || servo.rpos < 150 || servo.rpos > 375)
                        unusualScale = true;
                }
            }

            if (FC.CONFIG.servoCount == 2) {
                // Fixed pitch heli with 2 servos
                if ((SERVOS[0].flags & self.FLAG_GEOCOR) != (SERVOS[1].flags & self.FLAG_GEOCOR))
                    unusualGeoCor = true;
                if (SERVOS[0].rate != SERVOS[1].rate)
                    unusualRate = true;
            } else if (FC.CONFIG.servoCount >= 3) {
                // Collective pitch with 3 or more servos
                if (((SERVOS[0].flags & self.FLAG_GEOCOR) != (SERVOS[1].flags & self.FLAG_GEOCOR)) ||
                    ((SERVOS[1].flags & self.FLAG_GEOCOR) != (SERVOS[2].flags & self.FLAG_GEOCOR)) ||
                    ((SERVOS[0].flags & self.FLAG_GEOCOR) != (SERVOS[2].flags & self.FLAG_GEOCOR)))
                    unusualGeoCor = true;
                if ((SERVOS[0].rate != SERVOS[1].rate) ||
                    (SERVOS[1].rate != SERVOS[2].rate) ||
                    (SERVOS[0].rate != SERVOS[2].rate))
                    unusualRate = true;
            }

            $('.servo-unusual-limits-warning').toggle(unusualLimit);
            $('.servo-unusual-scales-warning').toggle(unusualScale);
            $('.servo-unusual-rates-warning').toggle(unusualRate);
            $('.servo-unusual-geometry-correction').toggle(unusualGeoCor);

            $('.servoValueWarning').toggle(unusualLimit || unusualScale || unusualRate || unusualGeoCor);
        }

        function process_override(servoIndex, isBusServo) {

            const servoOverride = $('#tab-servos-templates .servoOverrideTemplate tr').clone();
            const servoEnable = servoOverride.find('.servoOverrideEnable input');
            const servoInput  = servoOverride.find('.servoOverrideInput input');

            servoOverride.attr('class', `servoOverride${servoIndex}`);
            servoOverride.data('arrayIndex', servoIndex);
            servoOverride.data('isBusServo', isBusServo);
            
            // Display numbering: bus servos show as #1-#18, PWM servos show as #1-#N
            let displayIndex;
            if (isBusServo) {
                const busServoNumber = servoIndex - pwmServoCount;
                displayIndex = busServoNumber + 1;
            } else {
                displayIndex = servoIndex + 1;
            }
            servoOverride.find('.servoOverrideIndex').text(`#${displayIndex}`);

            const servoSlider = noUiSlider.create(servoOverride.find('.servoOverrideSlider').get(0), {
                exactInput: true,
                range: {
                    'min': -90,
                    'max':  90,
                },
                start: 0,
                step: 5,
                behaviour: 'snap-drag',
                pips: {
                    mode: 'values',
                    values: [ -80, -60, -40, -20, 0, 20, 40, 60, 80, ],
                    density: 100 / ((80 + 80) / 5),
                    stepped: true,
                    format: wNumb({ decimals: 0 }),
                },
            });

            function toggleServoSlider(enable) {
                if (enable) servoSlider.enable();
                else servoSlider.disable();
            }

            servoSlider.on('slide', function (values) {
                servoInput.val(parseInt(values[0]));
            });

            servoSlider.on('change', function () {
                servoInput.trigger('change');
            });

            servoInput.on('change', function () {
                const value = getIntegerValue(this);
                servoSlider.set(value, true, true);
                const arrayIdx = servoOverride.data('arrayIndex');
                const isBus = servoOverride.data('isBusServo');
                // Calculate MSP index: bus servos use indices 8-25, PWM servos use 0-N
                const mspIndex = isBus ? (self.BUS_SERVO_OFFSET + (arrayIdx - pwmServoCount)) : arrayIdx;
                
                if (isBus) {
                    FC.SERVO_OVERRIDE[mspIndex] = Math.round(value * 500 / 90);
                } else {
                    FC.SERVO_OVERRIDE[mspIndex] = Math.round(value * 1000 / 50);
                }
                mspHelper.sendServoOverride(mspIndex);
            });

            servoEnable.on('change', function () {
                const check = $(this).prop('checked');
                const value = check ? 0 : self.OVERRIDE_OFF;

                servoInput.val(0);
                servoSlider.set(0);
                servoInput.prop('disabled', !check);
                toggleServoSlider(check);

                const arrayIdx = servoOverride.data('arrayIndex');
                const isBus = servoOverride.data('isBusServo');
                // Calculate MSP index: bus servos use indices 8-25, PWM servos use 0-N
                const mspIndex = isBus ? (self.BUS_SERVO_OFFSET + (arrayIdx - pwmServoCount)) : arrayIdx;
                FC.SERVO_OVERRIDE[mspIndex] = value;
                mspHelper.sendServoOverride(mspIndex);
            });

            // Read from correct MSP index: bus servos use indices 8-25, PWM servos use 0-N
            const mspIndex = isBusServo ? (self.BUS_SERVO_OFFSET + (servoIndex - pwmServoCount)) : servoIndex;
            const value = FC.SERVO_OVERRIDE[mspIndex];
            const check = (value >= -2000 && value <= 2000);
            
            // Convert MSP value to display value
            let displayValue;
            if (isBusServo) {
                // Bus servos: map 1000 to 2000 → -90° to +90°
                // Formula: (value - 1500) * 90 / 500
                displayValue = check ? Math.round(value * 90 / 500) : 0;
            } else {
                // PWM servos: map -1800 to +1800 → -90° to +90°
                displayValue = check ? Math.round(value * 50 / 1000) : 0;
            }

            servoInput.val(displayValue);
            servoSlider.set(displayValue);

            servoInput.prop('disabled', !check);
            servoEnable.prop('checked', check);
            toggleServoSlider(check);

            $('.servoOverride tbody').append(servoOverride);
        }

        function process_config(servoIndex, isBusServo) {

            const servoConfig = $('#tab-servos-templates .servoConfigTemplate tr').clone();

            const SERVO = FC.SERVO_CONFIG[servoIndex];

            const revs = !!(SERVO.flags & self.FLAG_REVERSE);
            const geocor = !!(SERVO.flags & self.FLAG_GEOCOR);

            servoConfig.attr('class', `servoConfig${servoIndex}`);
            servoConfig.data('index', servoIndex);
            servoConfig.data('isBusServo', isBusServo);

            // Display numbering: bus servos show as #1-#18, PWM servos show as #1-#N
            let displayIndex;
            if (isBusServo) {
                // Bus servo: calculate which bus servo this is (0-17) then display as #1-#18
                const busServoNumber = servoIndex - pwmServoCount;
                displayIndex = busServoNumber + 1;
            } else {
                // PWM servo: display as #1, #2, etc.
                displayIndex = servoIndex + 1;
            }
            servoConfig.find('#index').text(`#${displayIndex}`);
            servoConfig.find('#mid').val(SERVO.mid);
            servoConfig.find('#min').val(SERVO.min);
            servoConfig.find('#max').val(SERVO.max);
            servoConfig.find('#rneg').val(SERVO.rneg);
            servoConfig.find('#rpos').val(SERVO.rpos);
            servoConfig.find('#rate').val(SERVO.rate);
            servoConfig.find('#speed').val(SERVO.speed);
            servoConfig.find('#reversed').prop('checked', revs);
            
            // For bus servos, set input constraints and show source
            if (isBusServo) {
                servoConfig.find('#mid').attr('min', 1000).attr('max', 2000);
                servoConfig.find('#min').attr('min', -500).attr('max', -1);
                servoConfig.find('#max').attr('min', 1).attr('max', 500);
                
                // Hide rate, show source
                servoConfig.find('.servoRateColumn').hide();
                servoConfig.find('.servoSourceColumn').show();
                
                // Display source: bus servo index in array corresponds to BUS_SERVO_CONFIG index
                const busServoIndex = servoIndex - pwmServoCount;
                const sourceType = FC.BUS_SERVO_CONFIG[busServoIndex] || 0;
                const sourceText = sourceType === 1 ? 'RX' : 'Mixer';
                servoConfig.find('#source').text(sourceText);
                
                // Hide geometry correction checkbox for RX source bus servos
                if (sourceType === 1) {
                    // Don't set geocor checkbox, leave cell empty
                    servoConfig.find('#geocor').remove();
                } else {
                    // Only set geocor for Mixer source bus servos
                    servoConfig.find('#geocor').prop('checked', geocor);
                }
            } else {
                // PWM servos: set geocor normally
                servoConfig.find('#geocor').prop('checked', geocor);
                // Show rate, hide source
                servoConfig.find('.servoRateColumn').show();
                servoConfig.find('.servoSourceColumn').hide();
            }

            servoConfig.find('input').change(function () {
                const actualIndex = servoConfig.data('index');
                update_servo_config(actualIndex);
                process_warnings();
                setDirty();
                mspHelper.sendServoConfig(actualIndex);
            });

            servoConfig.find('#rate').change(function () {
                $('.servoRateRebootNote').show();
                $(this).addClass('attention');
                setReboot(true);
            });

            $('.servoConfig tbody').append(servoConfig);
        }

        function update_servo_config(servoIndex) {

            const servo = $(`.tab-servos .servoConfig${servoIndex}`);

            let mid = getIntegerValue($('#mid',servo));
            let min = getIntegerValue($('#min',servo));
            let max = getIntegerValue($('#max',servo));

            // Check if this is a bus servo from the stored data attribute
            const isBusServo = servo.data('isBusServo') === true;
            if (isBusServo) {
                // For bus servos:
                // - mid is the center pulse width (1000-2000 µs)
                // - min is the negative offset from mid (should be < 0)
                // - max is the positive offset from mid (should be > 0)
                
                // Clamp mid to 1000-2000 range (but keep it > 1000 and < 2000)
                mid = Math.max(1001, Math.min(1999, mid));
                
                min = Math.min(-1, min); 
                min = Math.max(-500, min);               
                max = Math.max(1, max);
                max = Math.min(500, max);                
                // Update the input fields with corrected values
                $('#mid', servo).val(mid);
                $('#min', servo).val(min);
                $('#max', servo).val(max);
            }

            FC.SERVO_CONFIG[servoIndex].mid = mid;
            FC.SERVO_CONFIG[servoIndex].min = min;
            FC.SERVO_CONFIG[servoIndex].max = max;
            FC.SERVO_CONFIG[servoIndex].rneg = getIntegerValue($('#rneg',servo));
            FC.SERVO_CONFIG[servoIndex].rpos = getIntegerValue($('#rpos',servo));
            FC.SERVO_CONFIG[servoIndex].rate = getIntegerValue($('#rate',servo));
            FC.SERVO_CONFIG[servoIndex].speed = getIntegerValue($('#speed',servo));
            FC.SERVO_CONFIG[servoIndex].flags = $('#reversed',servo).prop('checked') ? self.FLAG_REVERSE : 0;
            // Only update geocor flag if the checkbox exists (not removed for RX source bus servos)
            const geocorCheckbox = $('#geocor',servo);
            if (geocorCheckbox.length > 0) {
                FC.SERVO_CONFIG[servoIndex].flags |= geocorCheckbox.prop('checked') ? self.FLAG_GEOCOR : 0;
            } else {
                // Preserve existing geocor flag if checkbox doesn't exist
                FC.SERVO_CONFIG[servoIndex].flags |= (FC.SERVO_CONFIG[servoIndex].flags & self.FLAG_GEOCOR);
            }
        }

        function update_servo_bars() {

            let rangeMin, rangeMax;

            // Update servo bars for all servos in the config array
            for (let i = 0; i < FC.SERVO_CONFIG.length; i++) {
                const servoValue = FC.SERVO_DATA[i];

                if (!FC.SERVO_CONFIG[i]) continue;

                // Check if this is a bus servo (comes after PWM servos in the array)
                const isBusServo = supportsBusServos && hasFbusOrSbus && i >= pwmServoCount;

                if (isBusServo) {
                    // Bus servos use 1000-2000 µs range
                    rangeMin = 1000;
                    rangeMax = 2000;
                } else if (FC.SERVO_CONFIG[i].mid <= 860) {
                    // 760us pulse servos
                    rangeMin = 375;
                    rangeMax = 1145;
                } else if (FC.SERVO_CONFIG[i].mid <= 1060) {
                    // 960us
                    rangeMin = 460;
                    rangeMax = 1460;
                } else {
                    // 1520us
                    rangeMin = 750;
                    rangeMax = 2250;
                }

                const range  = rangeMax - rangeMin;
                const percnt = 100 * (servoValue - rangeMin) / range;
                const length = percnt.clamp(0, 100);
                const margin = 100 - length;

                const servoMeter = $(`.tab-servos .servoConfig${i} .meter`);

                $('.meter-fill', servoMeter).css({
                    'width'        : `${length}%`,
                    'margin-right' : `${margin}%`,
                });
                $('.meter-label', servoMeter).text(servoValue);
            }
        }

        function update_servos() {
            MSP.send_message(MSPCodes.MSP_SERVO, false, false, update_servo_bars);
        }

        // Determine which servos to display
        // When bus servos are enabled, firmware sends: PWM servos (0 to N-1) then bus servos (N to N+17)
        // We need to display them with proper numbering
        let pwmServoCount = 0;
        let busServoCount = 0;
        
        if (supportsBusServos && hasFbusOrSbus) {
            // Firmware always sends 18 bus servos when enabled
            const BUS_SERVO_CHANNELS = 18;
            // PWM servos are first in the array, bus servos come after
            // FC.SERVO_CONFIG.length = total servos received = PWM count + 18
            busServoCount = BUS_SERVO_CHANNELS;
            pwmServoCount = Math.max(0, FC.SERVO_CONFIG.length - busServoCount);
        }

        // Process PWM servos (indices 0 to pwmServoCount-1)
        for (let index = 0; index < pwmServoCount; index++) {
            process_config(index, false);
            process_override(index, false);
            // PWM servos use direct index
            FC.CONFIG.servoOverrideEnabled |= (FC.SERVO_OVERRIDE[index] >= -2000 && FC.SERVO_OVERRIDE[index] <= 2000);
        }
        
        // Add spacer between PWM servos and bus servos
        if (supportsBusServos && hasFbusOrSbus && pwmServoCount > 0 && busServoCount > 0) {
                const spacerRow = $('<tr class="servo-spacer"><td colspan="11"><div>Bus Servos (FBUS/SBUS)</div><div>Servos controlled via digital bus protocol</div></td></tr>');
                $('.servoConfig tbody').append(spacerRow);
                
                // Add repeated header row for bus servos
                const headerRow = $('.servoConfig thead tr.trhead').clone();
                headerRow.removeClass('trhead').addClass('bus-servo-header');
                // Show source column, hide rate column in the header
                headerRow.find('.servoRateColumn').hide();
                headerRow.find('.servoSourceColumn').show();
                // Change "PWM Signal" to "BUS-Signal" for bus servos
                headerRow.find('th[i18n="servoSignal"]').text('BUS-Signal');
                $('.servoConfig tbody').append(headerRow);
                
                const overrideSpacerRow = $('<tr class="servo-override-spacer"><td colspan="4"><div>Bus Servos</div></td></tr>');
                $('.servoOverride tbody').append(overrideSpacerRow);
                
                // Add repeated header row for bus servo overrides
                const overrideHeaderRow = $('.servoOverride thead tr.trhead').clone();
                overrideHeaderRow.removeClass('trhead').addClass('bus-servo-override-header');
                $('.servoOverride tbody').append(overrideHeaderRow);
            
            // Process bus servos (they come after PWM servos in FC.SERVO_CONFIG)
            // Only display first 16 bus servos (indices 0-15), skip the last 2
            const displayBusServoCount = Math.min(busServoCount, 16);
            for (let i = 0; i < displayBusServoCount; i++) {
                const arrayIndex = pwmServoCount + i;  // Index in FC.SERVO_CONFIG array
                process_config(arrayIndex, true);
                process_override(arrayIndex, true);
                // Bus servos use MSP indices 8-25
                const mspIndex = self.BUS_SERVO_OFFSET + i;
                FC.CONFIG.servoOverrideEnabled |= (FC.SERVO_OVERRIDE[mspIndex] >= -2000 && FC.SERVO_OVERRIDE[mspIndex] <= 2000);
            }
        } else if (!supportsBusServos || !hasFbusOrSbus) {
            // Legacy mode: process remaining servos normally
            const servoEndIndex = Math.min(FC.CONFIG.servoCount, maxServos);
            for (let index = pwmServoCount; index < servoEndIndex; index++) {
                process_config(index, false);
                process_override(index, false);
                FC.CONFIG.servoOverrideEnabled |= (FC.SERVO_OVERRIDE[index] >= -2000 && FC.SERVO_OVERRIDE[index] <= 2000);
            }
        }

        process_warnings();
        setReboot(false);

        const enableServoOverrideSwitch = $('#servoEnableOverrideSwitch');
        enableServoOverrideSwitch.prop('checked', FC.CONFIG.servoOverrideEnabled);

        enableServoOverrideSwitch.change(function () {
            const checked = enableServoOverrideSwitch.prop('checked');
            FC.CONFIG.servoOverrideEnabled = checked;
            $('.tab-servos .override').toggle(checked);
            $('.servoOverrideEnable input').prop('checked', checked).change();
        });

        $('.tab-servos .override').toggle(!!FC.CONFIG.servoOverrideEnabled);

        self.save = function(callback) {
            // Update all servo configs that are displayed
            // Iterate through actual DOM elements and read their stored index
            // This handles cases where display indices don't match array indices
            $('.tab-servos .servoConfig tbody tr[class^="servoConfig"]').each(function() {
                const servoElement = $(this);
                const actualIndex = servoElement.data('index');
                if (actualIndex !== undefined) {
                    update_servo_config(actualIndex);
                }
            });
            save_data(callback);
        };

        self.revert = function (callback) {
            FC.SERVO_CONFIG = self.prevConfig;
            mspHelper.sendServoConfigurations(callback);
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.reboot').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        GUI.interval_add('servo_pull', update_servos, 100);

        GUI.content_ready(callback);
    }
};

tab.cleanup = function (callback) {
    this.isDirty = false;

    callback?.();
};

tab.cloneConfig = function (servos) {
    const clone = [];

    servos.forEach(function (item) {
        clone.push(Object.assign({}, item));
    });

    return clone;
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === tab.tabName) {
          TABS[tab.tabName].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        tab.cleanup();
    });
}
