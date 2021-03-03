'use strict';

var Features = function (config) {
    var self = this;

    var features = [
        {bit: 0, group: 'rxMode', mode: 'select', name: 'RX_PPM'},
        {bit: 2, group: 'other', name: 'INFLIGHT_ACC_CAL'},
        {bit: 3, group: 'rxMode', mode: 'select', name: 'RX_SERIAL'},
        {bit: 6, group: 'other', name: 'SOFTSERIAL', haveTip: true},
        {bit: 7, group: 'gps', name: 'GPS', haveTip: true},
        {bit: 9, group: 'other', name: 'SONAR'},
        {bit: 10, group: 'other', name: 'TELEMETRY'},
        {bit: 13, group: 'rxMode', mode: 'select', name: 'RX_PARALLEL_PWM'},
        {bit: 14, group: 'rxMode', mode: 'select', name: 'RX_MSP'},
        {bit: 15, group: 'rssi', name: 'RSSI_ADC'},
        {bit: 16, group: 'other', name: 'LED_STRIP'},
        {bit: 17, group: 'other', name: 'DISPLAY', haveTip: true},
        {bit: 18, group: 'other', name: 'OSD'},
        {bit: 25, group: 'rxMode', mode: 'select', name: 'RX_SPI'},
        {bit: 27, group: 'other', name: 'ESC_SENSOR'},
        {bit: 28, group: 'other', name: 'FREQ_SENSOR'},
        //{bit: 29, group: 'other', name: 'DYNAMIC_FILTER'},
        {bit: 30, group: 'other', name: 'RPM_FILTER'}
    ];

    self._features = features;
    self._featureMask = 0;

    self._analyticsChanges = {};
};

Features.prototype.getMask = function () {
    var self = this;

    analytics.sendChangeEvents(analytics.EVENT_CATEGORIES.FLIGHT_CONTROLLER, self._analyticsChanges);
    self._analyticsChanges = {};

    return self._featureMask;
};

Features.prototype.setMask = function (featureMask) {
    var self = this;

    self._featureMask = featureMask;
};

Features.prototype.isEnabled = function (featureName) {
    var self = this;

    for (var i = 0; i < self._features.length; i++) {
        if (self._features[i].name === featureName && bit_check(self._featureMask, self._features[i].bit)) {
            return true;
        }
    }
    return false;
};

Features.prototype.generateElements = function (featuresElements) {
    var self = this;

    self._featureChanges = {};

    var listElements = [];

    for (var i = 0; i < self._features.length; i++) {
        var feature_tip_html = '';
        if (self._features[i].haveTip) {
            feature_tip_html = '<div class="helpicon cf_tip" i18n_title="feature' + self._features[i].name + 'Tip"></div>';
        }

        var newElements = [];
        if (self._features[i].mode === 'select') {
            if (listElements.length === 0) {
                newElements.push($('<option class="feature" '
                    + 'value="-1" '
                    + 'i18n="featureNone" />'));
            }

            var newElement = $('<option class="feature" id="feature-'
                + i
                + '" name="'
                + self._features[i].name
                + '" value="'
                + self._features[i].bit
                + '" i18n="feature' + self._features[i].name + '" />');

            newElements.push(newElement);
            listElements.push(newElement);
        } else {
            let featureName = '';
            if (!self._features[i].hideName) {
                featureName = `<td><div>${self._features[i].name}</div></td>`;
            }

            var newElement = $('<tr><td><input class="feature toggle" id="feature-'
                    + i
                    + '" name="'
                    + self._features[i].name
                    + '" title="'
                    + self._features[i].name
                    + '" type="checkbox"/></td><td><div>'
                    + featureName
                    + '</div><span class="xs" i18n="feature' + self._features[i].name + '"></span></td>'
                    + '<td><span class="sm-min" i18n="feature' + self._features[i].name + '"></span>'
                    + feature_tip_html + '</td></tr>');

            var feature_e = newElement.find('input.feature');

            feature_e.prop('checked', bit_check(self._featureMask, self._features[i].bit));
            feature_e.data('bit', self._features[i].bit);

            newElements.push(newElement);
        }

        featuresElements.each(function () {
            if ($(this).hasClass(self._features[i].group)) {
                $(this).append(newElements);
            }
        });
    }

    for (var i = 0; i < listElements.length; i++) {
        var element = listElements[i];
        var bit = parseInt(element.attr('value'));
        var state = bit_check(self._featureMask, bit);

        element.prop('selected', state);
    }
};

Features.prototype.findFeatureByBit = function (bit) {
    var self = this;

    for (var i = 0; i < self._features.length; i++) {
        if (self._features[i].bit == bit) {
            return self._features[i];
        }
    }
}

Features.prototype.updateData = function (featureElement) {
    var self = this;

    if (featureElement.attr('type') === 'checkbox') {
        var bit = featureElement.data('bit');

        var featureValue;
        if (featureElement.is(':checked')) {
            self._featureMask = bit_set(self._featureMask, bit);
            featureValue = 'On';
        } else {
            self._featureMask = bit_clear(self._featureMask, bit);
            featureValue = 'Off';
        }
        self._analyticsChanges['Feature' + self.findFeatureByBit(bit).name] = featureValue;
    } else if (featureElement.prop('localName') === 'select') {
        var controlElements = featureElement.children();
        var selectedBit = featureElement.val();
        if (selectedBit !== -1) {
            var selectedFeature;
            for (var i = 0; i < controlElements.length; i++) {
                var bit = controlElements[i].value;
                if (selectedBit === bit) {
                    self._featureMask = bit_set(self._featureMask, bit);
                    selectedFeature = self.findFeatureByBit(bit);
                } else {
                    self._featureMask = bit_clear(self._featureMask, bit);
                }
            }
            if (selectedFeature) {
                self._analyticsChanges['FeatureGroup-' + selectedFeature.group] = selectedFeature.name;
            }
        }
    }
};
