'use strict';

const neeoapi = require('neeo-sdk');
const controller = require('./controller');

console.log('NEEO Home Assistant');
console.log('------------------------------------------');

const powerSwitch = {
  name: 'power',
  label: 'Power'
};

const POWER_TOGGLE_BUTTON = { name: 'POWER_TOGGLE', label: 'Power Toggle' };

const customLightDevice = neeoapi.buildDevice('Light')
  .setManufacturer('Home Assistant')
  .addAdditionalSearchToken('ha')
  .addAdditionalSearchToken('dev')
  .setType('LIGHT')
  .addButtonGroup('Power')
  .addButton(POWER_TOGGLE_BUTTON)
  .addSwitch(powerSwitch, controller.powerSwitchCallback)
  .addButtonHandler(controller.onButtonPressed)
  .enableDiscovery({
    headerText: 'Discover Home Assistant Lights',
    description: 'Select the light to add on the next screen.'
  }, controller.discoverLights)
  .registerInitialiseFunction(controller.initialise)
  .registerSubscriptionFunction(controller.registerSubscriptionCallback);

function startSdkExample(brain) {
  console.log('- Start server');
  neeoapi.startServer({
    brain,
    port: 6336,
    name: 'homeassistant',
    devices: [customLightDevice]
  })
    .then(() => {
      console.log('# READY! use the NEEO app to search for "Home Assistant".');
    })
    .catch((error) => {
      console.error('ERROR!', error.message);
      process.exit(1);
    });
}

const brainIp = process.env.BRAINIP;
if (brainIp) {
  console.log('- use NEEO Brain IP from env variable', brainIp);
  startSdkExample(brainIp);
} else {
  console.log('- discover one NEEO Brain...');
  neeoapi.discoverOneBrain()
    .then((brain) => {
      console.log('- Brain discovered:', brain.name);
      startSdkExample(brain);
    });
}
