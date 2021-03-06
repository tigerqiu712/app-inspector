/* ================================================================
 * app-inspector by xdf(xudafeng[at]126.com)
 *
 * first created at : Wed Jul 27 2016 10:57:58 GMT+0800 (CST)
 *
 * ================================================================
 * Copyright  xdf
 *
 * Licensed under the MIT License
 * You may not use this file except in compliance with the License.
 *
 * ================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const ADB = require('macaca-adb');
const xml2map = require('xml2map');
const UIAutomator = require('uiautomator-client');

const _ = require('./common/helper');

var adb;
var uiautomator;

exports.dumpXMLAndScreenShot = function *() {
  yield uiautomator.send({
    cmd: 'getSource',
    args: {
    }
  });

  const tmpDir = adb.getTmpDir();
  const xmlData = yield adb.shell(`cat ${tmpDir}/macaca-dump.xml`);
  const xmlHackData = yield adb.shell(`cat ${tmpDir}/local/tmp/macaca-dump.xml`);
  const xml = xmlData.length > xmlHackData.length ? xmlData : xmlHackData;
  const tempDir = path.join(__dirname, '..', '.temp');
  _.mkdir(tempDir);
  const xmlFilePath = path.join(tempDir, 'android.json');
  const hierarchy = xml2map.tojson(xml).hierarchy;

  const adaptor = function(node) {
    const bounds = node.bounds.match(/[\d\.]+/g);
    node.text = `${node.class} x:${bounds[0]},y:${bounds[1]} x:${bounds[2]},y:${bounds[3]}`;

    if (node.node) {
      node.nodes = node.node.length ? node.node : [node.node];
      node.state = {
        expanded: true
      };
      delete node.node;

      for (var i = 0; i < node.nodes.length; i++) {
        adaptor(node.nodes[i]);
      }
    }
    return node;
  };

  var data = adaptor(hierarchy.node);
  fs.writeFileSync(xmlFilePath, JSON.stringify(data), 'utf8');
  const remoteFile = `${tmpDir}/screenshot.png`;
  const cmd = `/system/bin/rm ${remoteFile}; /system/bin/screencap -p ${remoteFile}`;
  yield adb.shell(cmd);
  const localPath = path.join(tempDir, 'android-screenshot.png');
  yield adb.pull(remoteFile, localPath);
};

exports.initDevice = function *(udid) {
  adb = new ADB();
  adb.setDeviceId(udid);
  uiautomator = new UIAutomator();
  yield uiautomator.init(adb);
};
