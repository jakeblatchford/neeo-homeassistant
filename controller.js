'use strict';

const debug = require('debug')('neeo:homeassistant:controller');
const HAService = require('./haservice');
const neeoapi = require('neeo-sdk');

const deviceState = neeoapi.buildDeviceState();

const MACRO_POWER_ON = 'POWER ON';
const MACRO_POWER_OFF = 'POWER OFF';
const MACRO_POWER_TOGGLE = 'POWER_TOGGLE';
const MACRO_ACTIVATE_SCENE = 'ACTIVATE_SCENE';

let haService;
let updateCallbackReference, markDeviceOn, markDeviceOff;

/**
 * Setup service
 */
module.exports.initialise = function () {
  // check if already setup
  if(!haService) {
    console.log('initialise Home Assistant service');
    haService = new HAService(deviceState);
  }
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
    case MACRO_ACTIVATE_SCENE:
      debug(`Activate scene ${deviceId}`);
      return activateScene(deviceId);
    default:
      debug(`Unsupported button: ${action} for ${deviceId}`);
      return Promise.resolve(false);
  }
};

/**
 * Callbacks used by the power switch
 */
module.exports.powerSwitchCallback = {
  setter: setPowerState,
  getter: getPowerState,
};

/**
 * Toggle the device state
 * 
 * @param {*} deviceId 
 */
function toggleDevice(deviceId) {
   return haService.callService(deviceId, getDeviceType(deviceId), 'toggle');
}

/**
 * Activate scene
 * 
 * @param {*} deviceId 
 */
function activateScene(deviceId) {
  return haService.callService(deviceId, 'scene', 'turn_on');
}

/**
 * Set power state (on/off)
 * 
 * @param {*} deviceId 
 * @param {*} value 
 */
function setPowerState(deviceId, value) {
  console.log('set power state - ', deviceId, value);
  // this is sometimes a string and sometimes not...
  if (value === "false" | value == false) {
    return haService.callService(deviceId, getDeviceType(deviceId), 'turn_off');
    markDeviceOff(deviceId);
  } else {
    return haService.callService(deviceId, getDeviceType(deviceId), 'turn_on');
    markDeviceOn(deviceId);
  }
}

/**
 * Get power state of device
 * 
 * @param {*} deviceId 
 */
function getPowerState(deviceId) {
  console.log('get power state - ', deviceId);
  return haService.getState(deviceId);
}

function getDeviceType(deviceId) {
    // check device type before calling service
    const device = deviceState.getClientObjectIfReachable(deviceId);
  
    if (device) {
      return device.type;
    } else {
      return null;
    }
}

/**
 * Run a discovery of light devices
 */
module.exports.discoverLights = function () {
  console.log("discover call - light");
  return discover('light');
};

/**
 * Run a discovery of switches
 */
module.exports.discoverSwitches = function () {
  console.log("discover call - switch");
  return discover('switch');
};

/**
 * Run a discovery of scenes
 */
module.exports.discoverScenes = function () {
  console.log("discover call - scene");
  return discover('scene');
};

/**
 * Run a discovery
 * 
 * @param {*} type 
 */
function discover(type) {
  const allDevices = deviceState.getAllDevices();

  // filter to specified device type
  //const validTypeRegex = '^(' + type + ')\\..*$';
  const typeDevices = allDevices.filter(function (el) {
    if (el.clientObject.type == type) {
      return true;
    }
    return false;
  });

  return typeDevices
    .map((deviceEntry) => {
      return {
        id: deviceEntry.id,
        name: deviceEntry.clientObject.friendlyName,
        reachable: deviceEntry.reachable
      };
    });
}