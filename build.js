/**
 * Created with JetBrains WebStorm.
 * User: Joey
 * Date: 12-12-14
 * Time: 下午4:33
 * To change this template use File | Settings | File Templates.
 */

var child = require('child_process').spawn("./redis/redis-server.exe");
require("./index");