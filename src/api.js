 //database
var redis = require("redis");
var rds = redis.createClient();

exports.init = function (req, res, next) {
    res.setHeader("Content-Type", "text/json");				//Json格式
    res.data = {projects:{}, auth:false};
    next();
}

//验证cookie
exports.auth = function (req, res, next) {
    var data = res.data;
    var value = req.cookies['.ASPXAUTH'];
    if (value) {
        value = decode(value);
        if (value.substr(value.length - 3) == ";;;") {
            data.auth = true;
            data.user = value.substr(0, value.length - 3);
        }
    }
    next();
}

//准备api函数
var functions = {
    login:login, regist:regist,
    addproject:addproject, updateproject:updateproject, deleteproject:deleteproject,
    addpoint:addpoint, updatepoint:updatepoint, deletepoint:deletepoint,
    addresource:addresource, updateresource:updateresource, deleteresource:deleteResource
};

exports.api = function (req, res, next) {
    var action = req.body.action;
    var data = res.data;

    res.form = req.body;

    if (action == "regist" || action == "login") {            //登录注册
        //无视当前登录状态
        res.next = next;
        functions[action].apply(res);
        return;
    }

    //api请求

    // 检查当前登录状态
    if (data.auth != true) {//未登录，直接返回
        next();
        return;
    }

    //获取数据
    getData(data, function () {
        if (functions[action])
            try {
                functions[action].apply(res);
                rds.set("projects:" + data.user, JSON.stringify(data.projects));
                rds.set("resources:" + data.user, JSON.stringify(data.resources));
            } catch (e) {
                if (typeof e =="string") {
                    data.message = e;
                } else {
                    data.message = e.message;
                }
            }
        //任意action的调用，均输出所有数据
        next();
    })
}


//------------------------------------------------------最终输出------------------------------------------------
exports.exit = function (req, res) {
    var data = res.data;
    for (var i in data.projects) {
        var project = data.projects[i];
        project.start = new Date(project.startdate);
        project.end = new Date(project.enddate);
        if (project.delete == true) {
            delete data.projects[i];
        } else {
            for (var j in project.points) {
                var point = project.points[j];
                if (point.delete == true) {
                    delete project.points[j];
                }
            }
        }
    }
    res.end(JSON.stringify(data));
}


//主流程结束，以下为被调用的功能函数和工具函数
//-------------------------------------------			功能函数		----------------------------------------

//登录
function login() {
    if(!this.form.user || !this.form.pass){
        this.data.message = "need right param";
        this.next();
        return;
    }
    var user = this.form.user.toLowerCase();
    var pass = this.form.pass;
    var data = this.data;
    var res = this;
    rds.get("user:" + user, function (err, value) {
        if (value == null || value != pass) {
            data.auth = false;
            data.message = "login failed";
            data.projects = {};
            setAuth(res);
        } else {
            data.auth = true;
            data.user = user;
            getData(data, function () {
                setAuth(res);
            })
        }
    });
}

//注册
function regist() {
    if(!this.form.user || !this.form.pass){
        this.data.message = "need right param";
        this.next();
        return;
    }
    var user = this.form.user.toLowerCase();
    var pass = this.form.pass;
    var data = this.data;
    var res = this;
    rds.get("user:" + user, function (err, value) {
        if (value != null) {
            data.message = "user name taken";
        } else if (pass.length < 5) {
            data.message = "password not long enough";
        } else {
            rds.set("user:" + user, pass);
            rds.set("projects:" + user, "{}");
            data.auth = true;
            data.user = user;
            data.projects = {};
        }
        setAuth(res);
    });
}


//----------------------------------------      apis     ---------------------------------------------------
//新增项目
function addproject() {
    var form = this.form;
    var id = new Date().getTime();
    if(!form.name)throw "need a name";
    if(!form.startdate)throw "need start date";
    if(!form.enddate)throw "need end date";
    if(!form.color)form.color = "#158fe2";
    var p =
    {
        id:id,
        name:form.name,
        startdate:new Date(form.startdate).getTime(),
        enddate:new Date(form.enddate).getTime(),
        content:form.content,
        color:form.color,
        delete:false,
        points:{}
    }

    if (p.startdate > p.enddate)throw "date wrong";

    this.data.projects[id] = p;
}

//更新项目
function updateproject() {
    var form = this.form;
    var id = form.id;
    if (!this.data.projects[id])throw "project does not exist";

    var p = {
        id:id,
        name:form.name,
        startdate:new Date(form.startdate).getTime(),
        enddate:new Date(form.enddate).getTime(),
        content:form.content,
        color:form.color,
        delete:false,
        points:this.data.projects[id].points
    }

    if (p.startdate > p.enddate)throw "date wrong";

    this.data.projects[id] = p;
}

//删除项目
function deleteproject() {
    var i = this.form.id;
    if (!this.data.projects[i])throw "project does not exist";
    this.data.projects[i].delete = true;
}

//新增时间点
function addpoint() {
    var pid = this.form.project;
    var id = new Date(this.form.point).getTime();

    if (!this.data.projects[pid])throw "project does not exist";
    if(this.form.content == undefined)this.form.content="";
    if (this.data.projects[pid].points[id]){
        //throw "point already exists,please update the old one";
        this.form.content = this.data.projects[pid].points[id].content + "\n" + this.form.content;
    }

    this.data.projects[pid].points[id] = {
        id:id,
        done:new Date().getTime() > id,
        content:this.form.content,
        point:id
    };
}

//更新时间点
function updatepoint() {
    var form = this.form;
    var data = this.data;
    var pid = form.project;
    var id = form.id;
    if (!data.projects[pid]) throw "project does not exist";
    if (!data.projects[pid].points[id])throw "point does not exist";
    if(!form.point)throw "need time";

    data.projects[pid].points[id] = {
        id:id,
        done:form.done == "on",
        content:form.content,
        point:new Date(form.point).getTime()
    };
}

//删除时间点
function deletepoint() {
    var form = this.form;
    var data = this.data;
    var pid = form.project;
    var id = form.id;
    if (!data.projects[pid]) throw "project does not exist";
    if (!data.projects[pid].points[id]) throw "point does not exist";

    data.projects[pid].points[id].delete = true;
}

//-------------------------------------------------------资源管理---------------------------------------------
//====添加新资源
function addresource() {
    var form = this.form;
    var data = this.data;
    var name = form.name, desc = form.desc;
    if (data.resources[name]) throw "resource already exists";

    data.resources[name] = {name:name, desc:desc};
}

//====为资源添加项目s
function updateresource() {
    var form = this.form;
    var data = this.data;
    var name = form.name, project = form.project || [];

    //检查资源是否存在
    if (!data.resources[name]) throw "resource dose not exist";

    //如果只有一个元素，则迫使它成为数组
    if (!(project instanceof Array))project = [project];

    //检查项目是否存在
    for (var i in project) if (!data.projects[project[i]]) throw "project:" + project[i] + " does not exist!";

    data.resources[name].projects = project;
    data.resources[name].desc = form.desc || "";
}

//====删除资源
function deleteResource() {
    var form = this.form;
    var data = this.data;
    var name = form.name;
    //检查资源是否存在
    if (!data.resources[name]) throw "resource dose not exist";
    delete data.resources[name];
}

//-------------------------------------------------------工具函数---------------------------------------------
function getData(data, callback) {
    rds.get("projects:" + data.user, function (err, value) {
        data.projects = JSON.parse(value) || {};
        rds.get("resources:" + data.user, function (err, value) {
            data.resources = JSON.parse(value) || {};
            callback();
        });
    });
}

//设置验证cookie
function setAuth(res) {
    var expires = new Date();
    expires.setYear(2035);
    if (res.data.auth == true) {
        res.setHeader("Set-Cookie", ".ASPXAUTH=" + encode(res.data.user + ";;;") + "; expires=" + expires.toGMTString() + "; path=/");
    } else {
        res.setHeader("Set-Cookie", ".ASPXAUTH=; expires=" + expires.toGMTString() + "; path=/");
    }
    res.next();
}

//encrypto
var crypto = require('crypto');
var cryptkey = crypto.createHash('sha256').update('__tazai_wolf__key').digest();
var iv = '1200567890240000';

//解密
function decode(secretdata) {
    try {
        var decipher = crypto.createDecipheriv('aes-256-cbc', cryptkey, iv);
        return decipher.update(secretdata, 'base64', 'utf8') + decipher.final('utf8');
    } catch (err) {
        return "nononono";
    }
}

//加密
function encode(cleardata) {
    var encipher = crypto.createCipheriv('aes-256-cbc', cryptkey, iv);
    return encipher.update(cleardata, 'utf8', 'base64') + encipher.final('base64');
}
