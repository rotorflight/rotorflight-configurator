'use strict';

const Features = function (config) {
    const self = this;

    const features = [
        { bit:  0,  group: 'RX_PROTO',     name: 'RX_PPM' },
        { bit:  3,  group: 'RX_PROTO',     name: 'RX_SERIAL' },
        { bit:  6,  group: 'HIDDEN',       name: 'SOFTSERIAL', haveTip: true },
        { bit:  7,  group: 'OTHER',        name: 'GPS' },
        { bit:  9,  group: 'HIDDEN',       name: 'SONAR' },
        { bit: 10,  group: 'OTHER',        name: 'TELEMETRY' },
        { bit: 13,  group: 'RX_PROTO',     name: 'RX_PARALLEL_PWM' },
        { bit: 14,  group: 'RX_PROTO',     name: 'RX_MSP' },
        { bit: 15,  group: 'RSSI',         name: 'RSSI_ADC' },
        { bit: 16,  group: 'OTHER',        name: 'LED_STRIP' },
        { bit: 17,  group: 'HIDDEN',       name: 'DISPLAY', haveTip: true },
        { bit: 18,  group: 'OTHER',        name: 'OSD' },
        { bit: 25,  group: 'RX_PROTO',     name: 'RX_SPI' },
        { bit: 26,  group: 'OTHER',        name: 'GOVERNOR' },
        { bit: 27,  group: 'OTHER',        name: 'ESC_SENSOR' },
        { bit: 28,  group: 'OTHER',        name: 'FREQ_SENSOR' },
        //{ bit: 29,  group: 'OTHER',        name: 'DYNAMIC_FILTER' },
        { bit: 30,  group: 'OTHER',        name: 'RPM_FILTER' }
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

Features.prototype.setFeature = function (featureName, enabled) {
    const self = this;

    for (let i = 0; i < self._features.length; i++) {
        if (self._features[i].name === featureName) {
            const bit = self._features[i].bit;
            if (enabled) {
                self._featureMask = bit_set(self._featureMask, bit);
            } else {
                self._featureMask = bit_clear(self._featureMask, bit);
            }
        }
    }
};

Features.prototype.setGroup = function (groupName, enabled) {
    const self = this;

    for (let i = 0; i < self._features.length; i++) {
        if (self._features[i].group === groupName) {
            const bit = self._features[i].bit;
            if (enabled) {
                self._featureMask = bit_set(self._featureMask, bit);
            } else {
                self._featureMask = bit_clear(self._featureMask, bit);
            }
        }
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

Features.prototype.generateElements = function (featuresElements) {
    const self = this;

    const listElements = [];

    for (let i = 0; i < self._features.length; i++) {
        const rawFeatureName = self._features[i].name;
        const featureBit = self._features[i].bit;
        const newElements = [];

        let feature_tip_html = '';
        if (self._features[i].haveTip) {
            feature_tip_html = `<div class="helpicon cf_tip" i18n_title="feature${rawFeatureName}Tip"></div>`;
        }

        let featureName = `<td><div>${rawFeatureName}</div></td>`;

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

Features.prototype.updateData = function (featureElement) {
    const self = this;

    const bit = featureElement.data('bit');

    if (featureElement.is(':checked')) {
        self._featureMask = bit_set(self._featureMask, bit);
    } else {
        self._featureMask = bit_clear(self._featureMask, bit);
    }
};
