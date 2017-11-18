'use strict';

const debug = require('debug')('neeo:homeassistant:controller');
const HAService = require('./haservice');
const neeoapi = require('neeo-sdk');

const deviceState = neeoapi.buildDeviceState();

const MACRO_POWER_ON = 'POWER ON';
const MACRO_POWER_OFF = 'POWER OFF';
const MACRO_POWER_TOGGLE = 'POWER_TOGGLE';

let haService;
let updateCallbackReference, markDeviceOn, markDeviceOff;

/**
 * Setup service
 */
module.exports.initialise = function () {
  console.log('initialise Home Assistant service');
  haService = new HAService(deviceState);
};

/**
 * Register callbacks to send data back to NEEO
 * 
 * @param {*} updateCallback 
 * @param {*} optionalCallbackFunctions 
 */
module.exports.registerSubscriptionCallback = function (updateCallback, optionalCallbackFunctions) {
  this.updateCallbackReference = updateCallback;
  if (optionalCallbackFunctions && optionalCallbackFunctions.powerOnNotificationFunction) {
    markDeviceOn = optionalCallbackFunctions.powerOnNotificationFunction;
  }
  if (optionalCallbackFunctions && optionalCallbackFunctions.powerOffNotificationFunction) {
    markDeviceOff = optionalCallbackFunctions.powerOffNotificationFunction;
  }
};

/**
 * Button event press handler
 * 
 * @param {*} action 
 * @param {*} deviceId 
 */
module.exports.onButtonPressed = (action, deviceId) => {
  switch (action) {
    case MACRO_POWER_ON:
      debug(`Powering on ${deviceId}`);
      return setBrightnessState(deviceId, true);
    case MACRO_POWER_OFF:
      debug(`Powering off ${deviceId}`);
      return setBrightnessState(deviceId, false);
    case MACRO_POWER_TOGGLE:
      debug(`Power toggle ${deviceId}`);
      return toggleDevice(deviceId);
    default:
      debug(`Unsupported button: ${action} for ${deviceId}`);
      return Promise.resolve(false);
  }
};

/**
 * Callbacks used by the power switch
 */
module.exports.powerSwitchCallback = {
  setter: setBrightnessState,
  getter: getBrightnessState,
};

/**
 * Toggle the device state
 * 
 * @param {*} deviceId 
 */
function toggleDevice(deviceId) {
  return haService.callService(deviceId, 'light', 'toggle');
}

/**
 * Set brightness (only on/off)
 * TODO: actually set the brightness
 * 
 * @param {*} deviceId 
 * @param {*} value 
 */
function setBrightnessState(deviceId, value) {
  console.log('set brightness - ', deviceId, value);
  // this is sometimes a string and sometimes not...
  if (value === "false" | value == false) {
    return haService.callService(deviceId, 'light', 'turn_off');
    markDeviceOff(deviceId);
  } else {
    return haService.callService(deviceId, 'light', 'turn_on');
    markDeviceOn(deviceId);
  }
}

/**
 * Get brightness of device
 * 
 * @param {*} deviceId 
 */
function getBrightnessState(deviceId) {
  console.log('get brightness - ', deviceId);
  return haService.getState(deviceId);
}

/**
 * Run a discovery of light devices
 */
module.exports.discoverLights = function () {
  console.log("discover call - light");
  return discover('light');
};

/**
 * Run a discovery
 * 
 * @param {*} type 
 */
function discover(type) {
  const allDevices = deviceState.getAllDevices();

  const typeDevices = allDevices;

  return typeDevices
    .map((deviceEntry) => {
      return {
        id: deviceEntry.id,
        name: deviceEntry.clientObject.friendlyName,
        reachable: deviceEntry.reachable
      };
    });
}