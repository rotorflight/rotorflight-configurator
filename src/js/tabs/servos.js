'use strict';

TABS.servos = {};
TABS.servos.initialize = function (callback) {

    if (GUI.active_tab !== 'servos') {
        GUI.active_tab = 'servos';
    }

    function get_servo_configurations() {
        MSP.send_message(MSPCodes.MSP_SERVO_CONFIGURATIONS, false, false, get_servo_data);
    }

    function get_servo_data() {
        MSP.send_message(MSPCodes.MSP_SERVO, false, false, load_html);
    }

    function load_html() {
        $('#content').load("./tabs/servos.html", process_html);
    }

    get_servo_configurations();

    function process_html() {

        function process_servo(index) {

            const SERVO = FC.SERVO_CONFIG[index];
            const rated = (SERVO.rate >= 0) ? SERVO.rate : -SERVO.rate;
            const check = (SERVO.rate >= 0) ? '' : ' checked';

            let element = `<tr class="servo${index}">`;
            element += `<td>#${index+1}</td>`;
            element += `<td><input id="mid" type="number" min="375" max="2250" value="${SERVO.mid}" /></td>`;
            element += `<td><input id="min" type="number" min="375" max="2250" value="${SERVO.min}" /></td>`;
            element += `<td><input id="max" type="number" min="375" max="2250" value="${SERVO.max}" /></td>`;
            element += `<td><input id="rate" type="number" min="0" max="2500" value="${rated}" /></td>`;
            element += `<td><input id="trim" type="number" min="-250" max="250" value="${SERVO.trim}" /></td>`;
            element += `<td><input id="speed" type="number" min="0" max="30000" value="${SERVO.speed}" /></td>`;
            element += `<td><input id="reversed" type="checkbox" class="toggle" ${check}/></td>`;
            element += `<td><div class="meter">`;
            element += `<div class="meter-bar">`;
            element += `<div class="meter-label"></div>`;
            element += `<div class="meter-fill">`;
            element += `<div class="meter-label"></div>`;
            element += `</div>`;
            element += `</div>`;
            element += `</div></td>`;
            element += `</tr>`;

            $('div.tab-servos table.fields').append(element);
            $('div.tab-servos table.fields tr:last').data('info', {'index': index});
            $('div.tab-servos table.fields tr:last input').each(function () {
                $(this).data('info', {'index': index});
            });
        }

        function update_servo_config(index) {

            const servo = $(`div.tab-servos .servo${index}`);
            let rated = parseInt($('#rate',servo).val());

            if ($('#reversed',servo).is(':checked')) {
                rated = -rated;
            }

            FC.SERVO_CONFIG[index].mid = parseInt($('#mid',servo).val());
            FC.SERVO_CONFIG[index].min = parseInt($('#min',servo).val());
            FC.SERVO_CONFIG[index].max = parseInt($('#max',servo).val());
            FC.SERVO_CONFIG[index].rate = rated;
            FC.SERVO_CONFIG[index].trim = parseInt($('#trim',servo).val());
            FC.SERVO_CONFIG[index].speed = parseInt($('#speed',servo).val());
        }

        function update_servo_configurations(to_eeprom) {
            $('div.tab-servos table.fields tr:not(".header")').each(function () {
                const index = $(this).data('info').index;
                update_servo_config(index);
            });

            mspHelper.sendServoConfigurations(save_to_eeprom);

            function save_to_eeprom() {
                if (to_eeprom) {
                    MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                        GUI.log(i18n.getMessage('servosEepromSave'));
                    });
                }
            }
        }

        for (let servoIndex = 0; servoIndex < 8; servoIndex++) {
            process_servo(servoIndex);
        }

        // --- BARS ---

        function update_servo_bars() {

            const fullLength = 250;

            let rangeMin, rangeMax, length, margin;

            for (let i = 0; i < FC.SERVO_DATA.length; i++) {
                const servoMeter = $(`div.tab-servos .servo${i} .meter`);
                const servoValue = FC.SERVO_DATA[i];

                if (FC.SERVO_CONFIG[i].mid < 1000) {
                    rangeMin = 375;
                    rangeMax = 1125;
                } else {
                    rangeMin = 750;
                    rangeMax = 2250;
                }

                const range  = rangeMax - rangeMin;
                const length = fullLength * (servoValue - rangeMin) / range;
                const margin = fullLength - length;

                $('.meter-bar', servoMeter).css({
                    'width' : `${fullLength}`,
                });
                $('.meter-fill', servoMeter).css({
                    'width' : `${length}px`,
                    'margin-right' : `${margin}px`,
                });
                $('.meter-label', servoMeter).text(servoValue);
            }
        }

        function update_servo_data() {
            MSP.send_message(MSPCodes.MSP_SERVO, false, false, update_servo_bars);
        }

        $('table.fields input').change(function () {
            const index = $(this).data('info').index;
            update_servo_config(index);
            mspHelper.sendServoConfig(index);
        });

        $('a.save').click(function () {
            update_servo_configurations(true);
        });


        // translate to user-selected language
        i18n.localizePage();

        // UI hooks for dynamically generated elements
        GUI.interval_add('servo_bars_update', update_servo_data, 50);

        // status data pulled via separate timer with static speed
        GUI.interval_add('status_pull', function () {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.servos.cleanup = function (callback) {
    if (callback) {
        callback();
    }
};
