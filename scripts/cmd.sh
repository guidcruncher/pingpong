##!/bin/bash

mkdir -p /var/run/dbus
dbus-daemon --system
avahi-daemon -D

cp -n /app/device_rules.json /config/
cp -n /app/rules.json /config/
cp -n /app/scan_ports.json /config/

cd /app/apps/server/dist
node app.js
