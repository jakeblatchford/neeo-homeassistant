# NEEO Home Assistant Integration
*In Development*

A Home Assistant integration for NEEO.

### Supported Home Assistant device types:

 - light
 - switch
 - scene

## Setup

Copy `.env.example` to `.env` and set the options. API Key/Password is not yet supported.

Run `npm install` to install dependencies.

## Known Issues

 - Initial state checks fail on startup
 - Callbacks for power state to NEEO brain don't seem to do anything
 - Device states returned after setting state don't seem to do anything
 - Device scanning has to be retried the first time you add any Home Assistant device
