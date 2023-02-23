'use strict';

const Features = function (config) {
    const self = this;

    const features = [
        {bit: 0, group: 'rxMode', mode: 'select', name: 'RX_PPM'},
        // {bit: 2, group: 'other', name: 'INFLIGHT_ACC_CAL'},
        {bit: 3, group: 'rxMode', mode: 'select', name: 'RX_SERIAL'},
        // {bit: 6, group: 'other', name: 'SOFTSERIAL', haveTip: true},
        {bit: 7, group: 'other', name: 'GPS'},
        {bit: 9, group: 'other', name: 'SONAR'},
        {bit: 10, group: 'other', name: 'TELEMETRY'},
        {bit: 13, group: 'rxMode', mode: 'select', name: 'RX_PARALLEL_PWM'},
        {bit: 14, group: 'rxMode', mode: 'select', name: 'RX_MSP'},
        {bit: 15, group: 'rssi', name: 'RSSI_ADC'},
        {bit: 16, group: 'other', name: 'LED_STRIP'},
        // {bit: 17, group: 'other', name: 'DISPLAY', haveTip: true},
        {bit: 18, group: 'other', name: 'OSD'},
        {bit: 25, group: 'rxMode', mode: 'select', name: 'RX_SPI'},
        {bit: 26, group: 'other', name: 'GOVERNOR'},
        {bit: 27, group: 'other', name: 'ESC_SENSOR'},
        {bit: 28, group: 'other', name: 'FREQ_SENSOR'},
        // {bit: 29, group: 'hidden', name: 'DYNAMIC_FILTER'},
        {bit: 30, group: 'other', name: 'RPM_FILTER'}
    ];

    self._features = features;
    self._featureMask = 0;
};

Features.prototype.getMask = function () {
    const self = this;

    return self._featureMask;
};

Features.prototype.setMask = function (featureMask) {
    const self = this;

    self._featureMask = featureMask;
};

Features.prototype.isEnabled = function (featureName) {
    const self = this;

    for (let i = 0; i < self._features.length; i++) {
        if (self._features[i].name === featureName && bit_check(self._featureMask, self._features[i].bit)) {
            return true;
        }
    }
    return false;
};

Features.prototype.generateElements = function (featuresElements) {
    const self = this;

    self._featureChanges = {};

    const listElements = [];

    for (let i = 0; i < self._features.length; i++) {
        let feature_tip_html = '';
        const rawFeatureName = self._features[i].name;
        const featureBit = self._features[i].bit;

        if (self._features[i].haveTip) {
            feature_tip_html = `<div class="helpicon cf_tip" i18n_title="feature${rawFeatureName}Tip"></div>`;
        }

        const newElements = [];

        if (self._features[i].mode === 'select') {
            if (listElements.length === 0) {
                newElements.push($('<option class="feature" value="-1" i18n="featureNone" />'));
            }
            const newElement = $(`<option class="feature" id="feature-${i}" name="${rawFeatureName}" value="${featureBit}" i18n="feature${rawFeatureName}" />`);

            newElements.push(newElement);
            listElements.push(newElement);
        } else {
            let featureName = '';
            if (!self._features[i].hideName) {
                featureName = `<td><div>${rawFeatureName}</div></td>`;
            }

            let element = `<tr><td><input class="feature toggle" id="feature-${i}"`;
            element += `name="${self._features[i].name}" title="${self._features[i].name}"`;
            element += `type="checkbox"/></td><td><div>${featureName}</div>`;
            element += `<span class="xs" i18n="feature${self._features[i].name}"></span></td>`;
            element += `<td><span class="sm-min" i18n="feature${self._features[i].name}"></span>`;
            element += `${feature_tip_html}</td></tr>`;

            const newElement = $(element);

            const featureElement = newElement.find('input.feature');

            featureElement.prop('checked', bit_check(self._featureMask, featureBit));
            featureElement.data('bit', featureBit);

            newElements.push(newElement);
        }

        featuresElements.each(function () {
            if ($(this).hasClass(self._features[i].group)) {
                $(this).append(newElements);
            }
        });
    }

    for (const element of listElements) {
        const bit = parseInt(element.attr('value'));
        const state = bit_check(self._featureMask, bit);

        element.prop('selected', state);
    }
};

Features.prototype.findFeatureByBit = function (bit) {
    const self = this;

    for (const feature of self._features) {
        if (feature.bit === bit) {
            return feature;
        }
    }
};

Features.prototype.updateData = function (featureElement) {
    const self = this;

    if (featureElement.attr('type') === 'checkbox') {
        const bit = featureElement.data('bit');
        let featureValue;

        if (featureElement.is(':checked')) {
            self._featureMask = bit_set(self._featureMask, bit);
            featureValue = 'On';
        } else {
            self._featureMask = bit_clear(self._featureMask, bit);
            featureValue = 'Off';
        }
    } else if (featureElement.prop('localName') === 'select') {
        const controlElements = featureElement.children();
        const selectedBit = featureElement.val();
        if (selectedBit !== -1) {
            let selectedFeature;
            for (const controlElement of controlElements) {
                const bit = controlElement.value;
                if (selectedBit === bit) {
                    self._featureMask = bit_set(self._featureMask, bit);
                    selectedFeature = self.findFeatureByBit(bit);
                } else {
                    self._featureMask = bit_clear(self._featureMask, bit);
                }
            }
        }
    }
};
