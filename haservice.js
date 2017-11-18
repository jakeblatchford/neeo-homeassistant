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
const SUPPORTED_ENTITY_TYPES = 'light';

/**
 * Home Assistant Service
 */
class HAService {
  constructor(deviceState) {
    // Check env is set
    if(!process.env.URL) {
      console.error('ERROR! ENV is not set');
      process.exit(1);  
    }

    console.log('Home Assistant service started for URL: ' + process.env.URL);

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
    var options = {
      method: 'POST',
      uri: process.env.URL + '/api/services/' + service + '/' + action,
      body: {
        entity_id: entity_id
      },
      json: true
    };

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

    // Check if light is reachable
    const light = this.deviceState.getClientObjectIfReachable(entity_id);
    console.log('The object is', light);
    if (!light) {
      return BluePromise.reject(new Error('NOT_REACHABLE' + entity_id));
    }

    function getStatePromise() {

      var options = {
        uri: process.env.URL + '/api/states/' + entity_id,
        json: true
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
    var options = {
      uri:  process.env.URL + '/api/states',
      json: true
    };

    rp(options)
      .then(function (parsedBody) {
        console.log('got list of states from HA');
        parsedBody.forEach(function (e) {
          // Check if valid type
          const validTypeRegex = '^(' + SUPPORTED_ENTITY_TYPES + ')\\..*$';
          if (String(e.entity_id).match(new RegExp(validTypeRegex, 'g'))) {
            // give a friendly name
            let friendlyName = e.attributes.friendly_name;

            console.log('discover found: ' + e.entity_id);
            if (typeof friendlyName === undefined) { friendlyName = e.entity_id };
            this.deviceState.addDevice(e.entity_id, { friendlyName: friendlyName }, true);
          }
        }, this);
      }.bind(this)).catch(function (err) {
        console.log('discoverDevices failed', err);
      });
  }

}

module.exports = HAService;
