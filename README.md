# NEEO Home Assistant Integration
*In Development*

A Home Assistant integration for NEEO.

### Supported Home Assistant device types:

 - light

## Setup

Copy `.env.example` to `.env` and set the options. 

Run `npm install` to install dependencies.

## Known Issues

 - Initial state checks fail on startup
 - Callbacks for power state to NEEO brain don't seem to do anything
 - Device states returned after setting state don't seem to do anything
 