'use strict';

const debug = require('debug')('neeo:homeassistant:service');
const BluePromise = require('bluebird');
const rp = require('request-promise');

// Load config from env
require('dotenv').load();

/**
 * Supported Home Assistant entity types
 * 
 * Format: type|type|type
 * 
 * e.g.
 *      light
 *      light|scene
 */
const SUPPORTED_ENTITY_TYPES = 'light|switch|scene';

/**
 * Home Assistant Service
 */
class HAService {
  constructor(deviceState) {
    // Check env is set
    if (!process.env.HA_URL) {
      console.error('ERROR! ENV is not setup, no HA_URL');
      process.exit(1);
    }

    console.log('Home Assistant service started for URL: ' + process.env.HA_URL);

    this.deviceState = deviceState;
    debug('starting service discovery');
    this.discoverDevices();
  }

  /**
   * Call a Home Assistant service through the REST API
   * 
   * @param {*} entity_id 
   * @param {*} service 
   * @param {*} action 
   */
  callService(entity_id, service, action) {
    console.log('calling service', service, 'on entity', entity_id, 'with action', action);

    let options = {
      method: 'POST',
      uri: process.env.HA_URL + '/api/services/' + service + '/' + action,
      body: {
        entity_id: entity_id
      },
      json: true,
      headers: { 'x-ha-access': process.env.HA_PASSWORD }
    };

    console.log("Using options", options);

    rp(options)
      .then(function (parsedBody) {
        console.log('service call successful');
        //console.log(parsedBody);
      }).catch(function (err) {
        console.log('callService failed', err);
      });
  }

  /**
   * Get the state of a Home Assistant entity through the REST API
   * 
   * @param {*} entity_id 
   */
  getState(entity_id) {
    console.log('getting state of', entity_id);

    // Check if device is reachable
    const device = this.deviceState.getClientObjectIfReachable(entity_id);
    console.log('The object is', device);
    if (!device) {
      return BluePromise.reject(new Error('NOT_REACHABLE' + entity_id));
    }

    function getStatePromise() {

      let options = {
        uri: process.env.HA_URL + '/api/states/' + entity_id,
        json: true,
        headers: { 'x-ha-access': process.env.HA_PASSWORD }
      };

      return rp(options).then(function (response) {
        console.log('returning promise with state', response);

        if (response.state == 'on') {
          console.log('returning state true');
          return true;
        } else {
          console.log('returning state false');
          return false;
        }
      });
    }

    return this.deviceState
      .getCachePromise(entity_id)
      .getValue(getStatePromise);
  }

  /**
   * Discover Home Assistant entities
   */
  discoverDevices() {
    let options = {
      uri: process.env.HA_URL + '/api/states',
      json: true,
      headers: { 'x-ha-access': process.env.HA_PASSWORD }
    };

    rp(options)
      .then(function (parsedBody) {
        console.log('got list of states from HA');
        parsedBody.forEach(function (e) {
          // Check if valid type
          const validTypeRegex = '^(' + SUPPORTED_ENTITY_TYPES + ')\\..*$';

          let typeSearch = String(e.entity_id).match(new RegExp(validTypeRegex))
          if (typeSearch) {
            // give a friendly name
            let friendlyName = e.attributes.friendly_name;

            console.log('discover found: ' + e.entity_id);
            if (typeof friendlyName === undefined) { friendlyName = e.entity_id };
            this.deviceState.addDevice(e.entity_id, { friendlyName: friendlyName, type: typeSearch[1] }, true);
          }
        }, this);
      }.bind(this)).catch(function (err) {
        console.log('discoverDevices failed', err);
      });
  }

}

module.exports = HAService;
