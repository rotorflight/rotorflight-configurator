const MAIN_ROTOR_SOURCE = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const TAIL_ROTOR_SOURCE = [20, 21, 22, 23, 24];
const RPM_SOURCE = [...MAIN_ROTOR_SOURCE, ...TAIL_ROTOR_SOURCE];
const MULTI_NOTCH_SOURCE = [11, 12, 21, 22];
const DEFAULT_Q = 2.5;
export const NOTCH_COUNT = 16;
const DOUBLE_NOTCH_OFFSET = 1; // 1%
const TRIPLE_NOTCH_OFFSET = 2; // 2%
const MIN_Q = 15;
const MAX_Q = 100;

const NOTCH_TYPE = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
};

function getDoubleCenter(q) {
  return Math.trunc((100 * DOUBLE_NOTCH_OFFSET) / q);
}

function getTripleCenter(q) {
  return Math.trunc((100 * TRIPLE_NOTCH_OFFSET) / q);
}

export function parseRpmFilterConfig1(config) {
  if (!Array.isArray(config)) {
    return null;
  }

  const notches = {};
  let rpmLimitMain;
  let rpmLimitTail;

  for (let i = 0; i < config.length; i++) {
    const notch = config[i];

    if (notch.rpm_source === 0) {
      continue;
    }

    // duplicate rpm source
    if (notches[notch.rpm_source]) {
      return null;
    }

    // unrecognised rpm source
    if (!RPM_SOURCE.includes(notch.rpm_source)) {
      return null;
    }

    // Q outside configurable range
    if (notch.notch_q < MIN_Q || notch.notch_q > MAX_Q) {
      return null;
    }

    // Check RPM limit
    if (MAIN_ROTOR_SOURCE.includes(notch.rpm_source)) {
      if (!rpmLimitMain) {
        rpmLimitMain = notch.rpm_limit;
      } else if (rpmLimitMain !== notch.rpm_limit) {
        return null;
      }
    } else if (TAIL_ROTOR_SOURCE.includes(notch.rpm_source)) {
      if (!rpmLimitTail) {
        rpmLimitTail = notch.rpm_limit;
      } else if (rpmLimitTail !== notch.rpm_limit) {
        return null;
      }
    }

    // Single Notch
    if (notch.rpm_ratio === 10_000) {
      notches[notch.rpm_source] = {
        enabled: true,
        type: NOTCH_TYPE.SINGLE,
        value: notch.notch_q / 10,
      };

      continue;
    }

    // Double Notch
    if (!MULTI_NOTCH_SOURCE.includes(notch.rpm_source)) {
      return null;
    }

    const next = config[i + 1];
    if (
      !next ||
      next.rpm_source !== notch.rpm_source ||
      next.notch_q !== notch.notch_q
    ) {
      return null;
    }

    const offset = Math.round((DOUBLE_NOTCH_OFFSET * 1000) / notch.notch_q);
    if (
      notch.rpm_ratio !== 10_000 - offset ||
      next.rpm_ratio !== 10_000 + offset
    ) {
      return null;
    }

    notches[notch.rpm_source] = {
      enabled: true,
      type: NOTCH_TYPE.DOUBLE,
      value: notch.notch_q / 10,
    };

    i++;
  }

  if (!rpmLimitMain) {
    rpmLimitMain = 1000;
  }

  if (!rpmLimitTail) {
    rpmLimitTail = 2000;
  }

  // add disabled notches
  for (const source of RPM_SOURCE) {
    if (!notches[source]) {
      notches[source] = {
        enabled: false,
        type: NOTCH_TYPE.SINGLE,
        value: DEFAULT_Q,
      };
    }
  }

  return {
    banks: [notches],
    rpmLimitMain,
    rpmLimitTail,
  };
}

export function generateRpmFilterConfig1(config) {
  const result = [];

  for (const entry of Object.entries(config.banks[0])) {
    const source = Number(entry[0]);
    const notch = entry[1];

    if (!notch.enabled) {
      continue;
    }

    const limit = MAIN_ROTOR_SOURCE.includes(source)
      ? config.rpmLimitMain
      : config.rpmLimitTail;

    switch (notch.type) {
      case NOTCH_TYPE.SINGLE: {
        result.push({
          rpm_source: source,
          rpm_ratio: 10_000,
          rpm_limit: limit,
          notch_q: notch.value * 10,
        });

        break;
      }

      case NOTCH_TYPE.DOUBLE: {
        const offset = Math.round((DOUBLE_NOTCH_OFFSET * 100) / notch.value);

        result.push(
          {
            rpm_source: source,
            rpm_ratio: 10_000 - offset,
            rpm_limit: limit,
            notch_q: notch.value * 10,
          },
          {
            rpm_source: source,
            rpm_ratio: 10_000 + offset,
            rpm_limit: limit,
            notch_q: notch.value * 10,
          },
        );

        break;
      }
    }
  }

  for (let i = result.length; i < NOTCH_COUNT; i++) {
    result.push({ rpm_source: 0, rpm_ratio: 0, rpm_limit: 0, notch_q: 0 });
  }

  return result;
}

/**
 * Parses the firmwares RPM filter configuration into a datastructure that maps
 * to the GUI controls.
 */
export function parseRpmFilterConfig2(config) {
  if (!Array.isArray(config) || config.length !== 3) {
    return null;
  }

  const banks = [{}, {}, {}];

  for (let axis = 0; axis < config.length; axis++) {
    const bank = config[axis];

    for (let i = 0; i < bank.length; i++) {
      const { rpm_source, notch_q } = bank[i];

      // ignore empty notch
      if (rpm_source === 0) {
        continue;
      }

      // duplicate rpm source
      if (banks[axis][rpm_source]) {
        return null;
      }

      // unrecognised rpm source
      if (!RPM_SOURCE.includes(rpm_source)) {
        return null;
      }

      // Q outside configurable range
      if (notch_q < MIN_Q || notch_q > MAX_Q) {
        return null;
      }

      const notches = [];
      for (let j = i; j < bank.length; j++) {
        if (rpm_source === bank[j].rpm_source && notch_q === bank[j].notch_q) {
          notches.push(bank[j]);
        } else {
          break;
        }
      }

      switch (notches.length) {
        case 1: {
          banks[axis][rpm_source] = {
            enabled: true,
            type: NOTCH_TYPE.SINGLE,
            value: notch_q / 10,
          };

          break;
        }

        case 2: {
          if (
            !MULTI_NOTCH_SOURCE.includes(rpm_source) ||
            Math.abs(notches[0].notch_center) !==
              getDoubleCenter(notch_q / 10) ||
            notches[0].notch_center !== -notches[1].notch_center
          ) {
            return null;
          }

          banks[axis][rpm_source] = {
            enabled: true,
            type: NOTCH_TYPE.DOUBLE,
            value: notch_q / 10,
          };

          break;
        }

        case 3: {
          if (!MULTI_NOTCH_SOURCE.includes(rpm_source)) {
            return null;
          }

          let center = false;
          let left = false;
          let right = false;

          for (const n of notches) {
            if (n.notch_center === 0) {
              center = true;
            } else if (n.notch_center === getTripleCenter(n.notch_q / 10)) {
              right = true;
            } else if (n.notch_center === -getTripleCenter(n.notch_q / 10)) {
              left = true;
            }
          }

          if (!center || !left || !right) {
            return null;
          }

          banks[axis][rpm_source] = {
            enabled: true,
            type: NOTCH_TYPE.TRIPLE,
            value: notch_q / 10,
          };

          break;
        }

        default: {
          return null;
        }
      }

      i += notches.length - 1;
    }

    // add disabled notches
    for (const source of RPM_SOURCE) {
      if (!banks[axis][source]) {
        banks[axis][source] = {
          enabled: false,
          type: NOTCH_TYPE.SINGLE,
          value: DEFAULT_Q,
        };
      }
    }
  }

  return { banks };
}

export function generateRpmFilterConfig2(config) {
  const result = [];

  for (const axis of config.banks) {
    const bank = [];
    for (const [source, notch] of Object.entries(axis)) {
      if (!notch.enabled) {
        continue;
      }

      switch (notch.type) {
        case NOTCH_TYPE.SINGLE: {
          bank.push({
            rpm_source: Number(source),
            notch_q: notch.value * 10,
            notch_center: 0,
          });

          break;
        }

        case NOTCH_TYPE.DOUBLE: {
          const center = getDoubleCenter(notch.value);
          bank.push(
            {
              rpm_source: Number(source),
              notch_q: notch.value * 10,
              notch_center: center,
            },
            {
              rpm_source: Number(source),
              notch_q: notch.value * 10,
              notch_center: -center,
            },
          );

          break;
        }

        case NOTCH_TYPE.TRIPLE: {
          const center = getTripleCenter(notch.value);
          bank.push(
            {
              rpm_source: Number(source),
              notch_q: notch.value * 10,
              notch_center: 0,
            },
            {
              rpm_source: Number(source),
              notch_q: notch.value * 10,
              notch_center: -center,
            },
            {
              rpm_source: Number(source),
              notch_q: notch.value * 10,
              notch_center: center,
            },
          );

          break;
        }
      }
    }

    for (let i = bank.length; i < NOTCH_COUNT; i++) {
      bank.push({ rpm_source: 0, notch_q: 0, notch_center: 0 });
    }

    result.push(bank);
  }

  return result;
}
